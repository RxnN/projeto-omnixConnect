import { afterAll, describe, expect, it } from "vitest";
import { registerEmpresaWithOwner, verifyEmailAddress } from "@/lib/repo";
import { prisma, runWithDatabaseContext } from "@/lib/prisma";
import { hashEmailVerificationToken } from "@/lib/email-verification";

const email = `confirmacao-${Date.now()}@example.com`;
let empresaId: string | null = null;

afterAll(async () => {
  if (!empresaId) return;
  const id = empresaId;
  await runWithDatabaseContext("tenant", id, () =>
    prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.deleteMany({ where: { empresaId: id } });
      await tx.user.deleteMany({ where: { empresaId: id } });
      await tx.filial.deleteMany({ where: { empresaId: id } });
      await tx.empresa.delete({ where: { id } });
    }),
  );
});

describe("confirmação de e-mail", () => {
  it("armazena somente o hash, renova cadastro pendente e confirma uma única vez", async () => {
    const registration = await registerEmpresaWithOwner({
      empresaName: "Empresa de Confirmação",
      cnpjCpf: "11222333000181",
      userName: "Pessoa de Teste",
      phone: "11999999999",
      email,
      passwordHash: "hash-de-teste",
    });
    expect(registration.verification).not.toBeNull();
    const verification = registration.verification!;

    const user = await runWithDatabaseContext("login", email, () =>
      prisma.user.findUniqueOrThrow({ where: { email } }),
    );
    empresaId = user.empresaId;
    const stored = await runWithDatabaseContext("tenant", empresaId, () =>
      prisma.emailVerificationToken.findUniqueOrThrow({ where: { userId: user.id } }),
    );

    expect(stored.tokenHash).toBe(hashEmailVerificationToken(verification.token));
    expect(stored.tokenHash).not.toBe(verification.token);

    const refreshed = await registerEmpresaWithOwner({
      empresaName: "Empresa de Confirmação Atualizada",
      cnpjCpf: "11222333000181",
      userName: "Pessoa de Teste",
      phone: "11988888888",
      email,
      passwordHash: "novo-hash-de-teste",
    });
    expect(refreshed.verification?.token).not.toBe(verification.token);
    await expect(verifyEmailAddress(verification.token)).resolves.toBe("INVALID_OR_EXPIRED");
    await expect(verifyEmailAddress(refreshed.verification!.token)).resolves.toBe("VERIFIED");

    const confirmed = await runWithDatabaseContext("tenant", empresaId, () =>
      prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
    );
    expect(confirmed.emailVerifiedAt).toBeInstanceOf(Date);
    await expect(verifyEmailAddress(refreshed.verification!.token)).resolves.toBe("INVALID_OR_EXPIRED");
  });
});
