import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma, runWithDatabaseContext } from "@/lib/prisma";
import { getUserByEmail } from "@/lib/repo";
import { createUserInviteToken } from "@/lib/user-invite";
import { seedFixture } from "./helpers";

vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: vi.fn(async () => {}) }));
import { POST as acceptPost } from "@/app/api/convites/aceitar/route";

describe("convite de usuário", () => {
  it("cria acesso somente com token válido e marca o convite como utilizado", async () => {
    const { empresa, filial, user: owner } = await seedFixture();
    const generated = createUserInviteToken();
    const email = `convidado-${Date.now()}@example.com`;
    await runWithDatabaseContext("tenant", empresa.id, () => prisma.userInvite.create({ data: {
      empresaId: empresa.id, filialId: filial.id, email, role: "EMPLOYEE", tokenHash: generated.tokenHash,
      invitedByUserId: owner.id, invitedByName: owner.name, expiresAt: generated.expiresAt,
    } }));
    const request = new NextRequest("http://localhost/api/convites/aceitar", {
      method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.9.0.1" },
      body: JSON.stringify({ token: generated.token, name: "Pessoa Convidada", phone: "11999999999", password: "senha-forte-123", turnstileToken: "test-token" }),
    });
    const response = await acceptPost(request, undefined);
    expect(response.status).toBe(200);
    const created = await runWithDatabaseContext("tenant", empresa.id, () => getUserByEmail(email));
    expect(created).toMatchObject({ email, role: "EMPLOYEE", filialId: filial.id });
    const invite = await runWithDatabaseContext("tenant", empresa.id, () => prisma.userInvite.findUnique({ where: { tokenHash: generated.tokenHash } }));
    expect(invite?.acceptedAt).not.toBeNull();
  });
});
