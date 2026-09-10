import { createPasswordResetToken, hashPasswordResetToken } from "../password-reset";
import { prisma, runWithDatabaseContext } from "../prisma";
import { getUserByEmail } from "./user";

export async function createPasswordResetForEmail(email: string) {
  const user = await runWithDatabaseContext("login", email, () => getUserByEmail(email));
  if (!user?.emailVerifiedAt) return null;

  const reset = createPasswordResetToken();
  await runWithDatabaseContext("tenant", user.empresaId, () =>
    prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        empresaId: user.empresaId,
        tokenHash: reset.tokenHash,
        expiresAt: reset.expiresAt,
      },
      update: {
        tokenHash: reset.tokenHash,
        expiresAt: reset.expiresAt,
        createdAt: new Date(),
      },
    }),
  );

  return { email: user.email, ...reset };
}

export type PasswordResetResult = "RESET" | "INVALID_OR_EXPIRED";

export async function resetPasswordWithToken(
  token: string,
  passwordHash: string,
): Promise<PasswordResetResult> {
  const tokenHash = hashPasswordResetToken(token);
  const record = await runWithDatabaseContext("reset", tokenHash, () =>
    prisma.passwordResetToken.findUnique({ where: { tokenHash } }),
  );
  if (!record) return "INVALID_OR_EXPIRED";

  return runWithDatabaseContext("tenant", record.empresaId, () =>
    prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.deleteMany({
        where: { id: record.id, tokenHash, expiresAt: { gt: new Date() } },
      });
      if (claimed.count !== 1) {
        await tx.passwordResetToken.deleteMany({ where: { id: record.id } });
        return "INVALID_OR_EXPIRED" as const;
      }

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      return "RESET" as const;
    }),
  );
}
