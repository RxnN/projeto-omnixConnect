import { prisma, runWithDatabaseContext } from "../prisma";
import { hashEmailVerificationToken } from "../email-verification";

export type EmailVerificationResult =
  | { status: "VERIFIED"; userId: string; sessionVersion: number }
  | { status: "INVALID_OR_EXPIRED" };

export async function verifyEmailAddress(token: string): Promise<EmailVerificationResult> {
  const tokenHash = hashEmailVerificationToken(token);
  const record = await runWithDatabaseContext("verify", tokenHash, () =>
    prisma.emailVerificationToken.findUnique({ where: { tokenHash } }),
  );
  if (!record) return { status: "INVALID_OR_EXPIRED" };

  return runWithDatabaseContext("tenant", record.empresaId, () =>
    prisma.$transaction(async (tx) => {
      const current = await tx.emailVerificationToken.findUnique({ where: { id: record.id } });
      if (!current || current.tokenHash !== tokenHash || current.expiresAt <= new Date()) {
        if (current) await tx.emailVerificationToken.delete({ where: { id: current.id } });
        return { status: "INVALID_OR_EXPIRED" as const };
      }

      const user = await tx.user.update({
        where: { id: current.userId },
        data: { emailVerifiedAt: new Date() },
        select: { id: true, sessionVersion: true },
      });
      await tx.emailVerificationToken.delete({ where: { id: current.id } });
      return { status: "VERIFIED" as const, userId: user.id, sessionVersion: user.sessionVersion };
    }),
  );
}
