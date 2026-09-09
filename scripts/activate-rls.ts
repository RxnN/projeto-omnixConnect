import { createHmac } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { adminPrisma } from "../lib/admin-prisma";

const TABLES = [
  "Adega",
  "Filial",
  "Counter",
  "RateLimitBucket",
  "RegistrationDocument",
  "User",
  "EmailVerificationToken",
  "Product",
  "Promotion",
  "Pedido",
  "Movement",
] as const;

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function signature(secret: string, kind: string, value: string) {
  return createHmac("sha256", secret).update(`${kind}:${value}`).digest("hex");
}

async function setContext(
  tx: Prisma.TransactionClient,
  secret: string,
  kind: string,
  value: string,
  valid = true,
) {
  const signed = valid ? signature(secret, kind, value) : "0".repeat(64);
  await tx.$executeRaw`
    SELECT
      set_config('app.context_kind', ${kind}, TRUE),
      set_config('app.context_value', ${value}, TRUE),
      set_config('app.context_signature', ${signed}, TRUE)
  `;
}

async function setRls(enabled: boolean) {
  await adminPrisma.$transaction(async (tx) => {
    for (const table of TABLES) {
      await tx.$executeRawUnsafe(
        `ALTER TABLE ${quoteIdentifier(table)} ${enabled ? "ENABLE" : "DISABLE"} ROW LEVEL SECURITY`,
      );
    }
  });
}

async function main() {
  if (!process.argv.includes("--confirm-deployed")) {
    throw new Error(
      "RLS não ativada. Publique primeiro o código compatível e execute novamente com --confirm-deployed.",
    );
  }
  const secret = process.env.RLS_CONTEXT_SECRET;
  const runtimeUrl = process.env.DATABASE_URL;
  if (!secret || secret.length < 32) throw new Error("RLS_CONTEXT_SECRET inválida.");
  if (!runtimeUrl) throw new Error("DATABASE_URL ausente.");

  const runtimeRole = decodeURIComponent(new URL(runtimeUrl).username);
  if (!runtimeRole || runtimeRole === "neondb_owner") {
    throw new Error("DATABASE_URL precisa usar o papel restrito da aplicação.");
  }

  const policies = await adminPrisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM pg_policies
    WHERE schemaname = 'public' AND policyname LIKE 'rls_%'
  `;
  if (Number(policies[0]?.count ?? 0) < 13) {
    throw new Error("As políticas RLS esperadas ainda não foram instaladas.");
  }

  await adminPrisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO app_private.rls_secrets (id, secret, updated_at)
      VALUES ('primary', ${secret}, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET secret = EXCLUDED.secret, updated_at = CURRENT_TIMESTAMP
    `;
    await tx.$executeRawUnsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "EmailVerificationToken" TO ${quoteIdentifier(runtimeRole)}`,
    );
  });

  await setRls(true);

  const tenant = await adminPrisma.empresa.findFirst({ select: { id: true } });
  if (!tenant) throw new Error("Nenhuma empresa disponível para validar o isolamento.");
  const runtime = new PrismaClient({ datasourceUrl: runtimeUrl });
  try {
    const ownRows = await runtime.$transaction(async (tx) => {
      await setContext(tx, secret, "tenant", tenant.id);
      return tx.empresa.count();
    });
    const invalidRows = await runtime.$transaction(async (tx) => {
      await setContext(tx, secret, "tenant", tenant.id, false);
      return tx.empresa.count();
    });
    if (ownRows !== 1 || invalidRows !== 0) {
      throw new Error(`Validação do isolamento falhou (tenant=${ownRows}, assinatura inválida=${invalidRows}).`);
    }
    console.log(JSON.stringify({ rlsEnabledTables: TABLES.length, tenantIsolationVerified: true }));
  } catch (error) {
    await setRls(false);
    throw error;
  } finally {
    await runtime.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await adminPrisma.$disconnect();
  });
