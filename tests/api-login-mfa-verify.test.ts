import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { seedFixture } from "./helpers";
import { createLoginMfaCode } from "@/lib/login-mfa";

const sessionState = vi.hoisted(() => ({ current: {} as Record<string, any> }));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(async () => sessionState.current),
  SESSION_TTL_SECONDS: 7 * 24 * 60 * 60,
}));

import { POST as verifyPost } from "@/app/api/login/mfa/verify/route";

const POST = (req: NextRequest) => verifyPost(req, undefined);

function makeRequest(code: string) {
  return new NextRequest("http://localhost/api/login/mfa/verify", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.8.0.${Math.floor(Math.random() * 200) + 1}` },
    body: JSON.stringify({ code }),
  });
}

describe("POST /api/login/mfa/verify", () => {
  beforeEach(() => {
    sessionState.current = { user: undefined, loginMfa: undefined, adminMfa: undefined, save: vi.fn() };
  });

  it("cria a sessão somente depois do código correto", async () => {
    const { user } = await seedFixture();
    const generated = createLoginMfaCode();
    sessionState.current.loginMfa = {
      userId: user.id,
      empresaId: user.empresaId,
      email: user.email,
      sessionVersion: user.sessionVersion,
      codeHash: generated.codeHash,
      expiresAt: generated.expiresAt,
      attempts: 0,
    };

    const response = await POST(makeRequest(generated.code));

    expect(response.status).toBe(200);
    expect(sessionState.current.loginMfa).toBeUndefined();
    expect(sessionState.current.user).toMatchObject({ userId: user.id, role: "OWNER" });
  });

  it("mantém o acesso bloqueado e contabiliza código incorreto", async () => {
    const { user } = await seedFixture();
    const generated = createLoginMfaCode();
    sessionState.current.loginMfa = {
      userId: user.id,
      empresaId: user.empresaId,
      email: user.email,
      sessionVersion: user.sessionVersion,
      codeHash: generated.codeHash,
      expiresAt: generated.expiresAt,
      attempts: 0,
    };

    const response = await POST(makeRequest(generated.code === "000000" ? "000001" : "000000"));

    expect(response.status).toBe(400);
    expect(sessionState.current.user).toBeUndefined();
    expect(sessionState.current.loginMfa.attempts).toBe(1);
  });
});
