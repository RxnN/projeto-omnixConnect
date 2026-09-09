import { prisma } from "../prisma";
import { runWithDatabaseContext } from "../prisma";
import { createId } from "../id";
import { createEmailVerificationToken } from "../email-verification";
import type { Empresa } from "../types";
import { toIso } from "./shared";

export async function getEmpresaById(id: string): Promise<Empresa | undefined> {
  const empresa = await prisma.empresa.findUnique({ where: { id } });
  return empresa
    ? { ...empresa, paidUntil: empresa.paidUntil ? toIso(empresa.paidUntil) : null, createdAt: toIso(empresa.createdAt) }
    : undefined;
}

export async function createEmpresa(name: string, cnpjCpf: string): Promise<Empresa> {
  const id = createId("empresa");
  const empresa = await runWithDatabaseContext("tenant", id, () =>
    prisma.empresa.create({ data: { id, name: name.trim(), cnpjCpf } }),
  );
  return { ...empresa, paidUntil: null, createdAt: toIso(empresa.createdAt) };
}

export async function registerEmpresaWithOwner(input: {
  empresaName: string;
  cnpjCpf: string;
  userName: string;
  phone: string;
  email: string;
  passwordHash: string;
}): Promise<{ verification: { email: string; token: string; tokenHash: string } | null }> {
  const verification = createEmailVerificationToken();

  const existing = await runWithDatabaseContext("login", input.email, () =>
    prisma.user.findUnique({ where: { email: input.email }, include: { empresa: true } }),
  );
  if (existing) {
    if (existing.emailVerifiedAt || existing.empresa.approved) {
      return { verification: null };
    }

    return runWithDatabaseContext("tenant", existing.empresaId, async () => {
      await prisma.$transaction(async (tx) => {
        await tx.empresa.update({
          where: { id: existing.empresaId },
          data: { name: input.empresaName.trim(), cnpjCpf: input.cnpjCpf },
        });
        await tx.user.update({
          where: { id: existing.id },
          data: {
            name: input.userName.trim(),
            phone: input.phone,
            passwordHash: input.passwordHash,
          },
        });
        await tx.emailVerificationToken.upsert({
          where: { userId: existing.id },
          create: {
            userId: existing.id,
            empresaId: existing.empresaId,
            tokenHash: verification.tokenHash,
            expiresAt: verification.expiresAt,
          },
          update: {
            tokenHash: verification.tokenHash,
            expiresAt: verification.expiresAt,
            createdAt: new Date(),
          },
        });
      });
      return { verification: { email: input.email, token: verification.token, tokenHash: verification.tokenHash } };
    });
  }

  const empresaId = createId("empresa");
  const userId = createId("user");
  await runWithDatabaseContext("tenant", empresaId, () =>
    prisma.$transaction(async (tx) => {
      return tx.empresa.create({
        data: {
          id: empresaId,
          name: input.empresaName.trim(),
          cnpjCpf: input.cnpjCpf,
          filiais: {
            create: { id: createId("filial"), name: input.empresaName.trim() },
          },
          users: {
            create: {
              id: userId,
              name: input.userName.trim(),
              phone: input.phone,
              email: input.email,
              passwordHash: input.passwordHash,
              role: "OWNER",
              emailVerificationToken: {
                create: {
                  empresaId,
                  tokenHash: verification.tokenHash,
                  expiresAt: verification.expiresAt,
                },
              },
            },
          },
        },
        include: { filiais: true, users: true },
      });
    }),
  );
  return { verification: { email: input.email, token: verification.token, tokenHash: verification.tokenHash } };
}
