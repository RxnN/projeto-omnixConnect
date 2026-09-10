import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { createPasswordResetForEmail, resetPasswordWithToken } from "@/lib/repo";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { prisma, runWithDatabaseContext } from "@/lib/prisma";
import { seedFixture } from "./helpers";

describe("recuperação de senha", () => {
  it("guarda só o hash, usa o link uma vez e invalida sessões anteriores", async () => {
    const { empresa, user } = await seedFixture();
    const reset = await createPasswordResetForEmail(user.email);
    expect(reset).not.toBeNull();

    const stored = await runWithDatabaseContext("tenant", empresa.id, () =>
      prisma.passwordResetToken.findUniqueOrThrow({ where: { userId: user.id } }),
    );
    expect(stored.tokenHash).toBe(hashPasswordResetToken(reset!.token));
    expect(stored.tokenHash).not.toBe(reset!.token);

    const newHash = await bcrypt.hash("nova-senha-123", 10);
    await expect(resetPasswordWithToken(reset!.token, newHash)).resolves.toBe("RESET");
    await expect(resetPasswordWithToken(reset!.token, newHash)).resolves.toBe("INVALID_OR_EXPIRED");

    const updated = await runWithDatabaseContext("tenant", empresa.id, () =>
      prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
    );
    expect(await bcrypt.compare("nova-senha-123", updated.passwordHash)).toBe(true);
    expect(updated.sessionVersion).toBe(user.sessionVersion + 1);
  });

  it("não cria link para endereço inexistente", async () => {
    await expect(createPasswordResetForEmail(`ausente-${Date.now()}@example.com`)).resolves.toBeNull();
  });
});
