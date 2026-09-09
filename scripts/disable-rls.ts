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

async function main() {
  await adminPrisma.$transaction(async (tx) => {
    for (const table of TABLES) {
      await tx.$executeRawUnsafe(`ALTER TABLE ${quoteIdentifier(table)} DISABLE ROW LEVEL SECURITY`);
    }
  });
  console.log(JSON.stringify({ rlsDisabledTables: TABLES.length }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await adminPrisma.$disconnect();
  });
