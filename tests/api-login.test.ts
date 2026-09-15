import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { createUser } from "@/lib/repo";
import { seedFixture } from "./helpers";
import { prisma, runWithDatabaseContext } from "@/lib/prisma";
import { createTrustedDeviceCookieValue, TRUSTED_DEVICE_COOKIE } from "@/lib/trusted-device";

const sessionState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

// getSession() grava um cookie via next/headers, que só existe dentro de uma requisição
// real do App Router. Mockamos só essa borda; a busca de usuário e a comparação de senha
// rodam de verdade contra o Postgres.
vi.mock("@/lib/session", () => ({
  getSession: vi.fn(async () => sessionState.current),
  SESSION_TTL_SECONDS: 7 * 24 * 60 * 60,
}));

vi.mock("@/lib/email", () => ({
  sendOwnerLoginMfaCode: vi.fn(async () => {}),
}));

// Evita depender do endpoint real da Cloudflare nos testes — a verificação do token
// em si é coberta à parte (lib/turnstile), aqui só interessa o restante da rota.
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstile: vi.fn(async () => {}),
}));

import { POST as loginPost } from "@/app/api/login/route";

const POST = (req: NextRequest) => loginPost(req, undefined);

function makeRequest(body: Record<string, unknown>, ip: string, cookie?: string) {
  return new NextRequest("http://localhost/api/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ turnstileToken: "test-token", ...body }),
  });
}

describe("POST /api/login", () => {
  beforeEach(() => {
    sessionState.current = { user: undefined, loginMfa: undefined, adminMfa: undefined, save: vi.fn() };
  });

  it("rejeita e-mail inexistente sem revelar que o e-mail não existe", async () => {
    const res = await POST(makeRequest({ email: "nao-existe@teste.com", password: "qualquer" }, "10.0.0.1"));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("E-mail ou senha inválidos.");
  });

  it("exige o segundo fator antes de criar a sessão do dono", async () => {
    const { empresa } = await seedFixture();
    const passwordHash = await bcrypt.hash("senha-correta", 10);
    const email = `login-${Date.now()}@teste.com`;
    await runWithDatabaseContext("tenant", empresa.id, () =>
      createUser({ empresaId: empresa.id, name: "Login Teste", email, passwordHash, role: "OWNER" }),
    );

    const res = await POST(makeRequest({ email, password: "senha-correta" }, "10.0.0.2"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.mfaRequired).toBe(true);
    expect(sessionState.current.user).toBeUndefined();
    expect(sessionState.current.loginMfa).toMatchObject({ email, attempts: 0 });
  });

  it("não repete o MFA em um dispositivo confiável para o mesmo dono e versão de senha", async () => {
    const { empresa } = await seedFixture();
    const passwordHash = await bcrypt.hash("senha-correta", 10);
    const email = `login-trusted-${Date.now()}@teste.com`;
    const user = await runWithDatabaseContext("tenant", empresa.id, () =>
      createUser({ empresaId: empresa.id, name: "Login Confiável", email, passwordHash, role: "OWNER" }),
    );
    const trusted = await createTrustedDeviceCookieValue(user.id, user.sessionVersion);

    const res = await POST(makeRequest(
      { email, password: "senha-correta" },
      "10.0.0.22",
      `${TRUSTED_DEVICE_COOKIE}=${trusted}`,
    ));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.mfaRequired).toBeUndefined();
    expect(sessionState.current.user).toMatchObject({
      userId: user.id,
      role: "OWNER",
      permissionOverrides: user.permissions,
      subscriptionPaidUntil: null,
    });
  });

  it("exige MFA novamente quando a versão da senha mudou", async () => {
    const { empresa } = await seedFixture();
    const passwordHash = await bcrypt.hash("senha-correta", 10);
    const email = `login-stale-trusted-${Date.now()}@teste.com`;
    const user = await runWithDatabaseContext("tenant", empresa.id, () =>
      createUser({ empresaId: empresa.id, name: "Login Alterado", email, passwordHash, role: "OWNER" }),
    );
    const trusted = await createTrustedDeviceCookieValue(user.id, user.sessionVersion);
    await runWithDatabaseContext("tenant", empresa.id, () =>
      prisma.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } }),
    );

    const res = await POST(makeRequest(
      { email, password: "senha-correta" },
      "10.0.0.23",
      `${TRUSTED_DEVICE_COOKIE}=${trusted}`,
    ));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.mfaRequired).toBe(true);
    expect(sessionState.current.user).toBeUndefined();
  });

  it("não cria sessão antes da confirmação do e-mail", async () => {
    const { empresa } = await seedFixture();
    const passwordHash = await bcrypt.hash("senha-correta", 10);
    const email = `login-unverified-${Date.now()}@teste.com`;
    const user = await runWithDatabaseContext("tenant", empresa.id, () =>
      createUser({ empresaId: empresa.id, name: "Não confirmado", email, passwordHash, role: "OWNER" }),
    );
    await runWithDatabaseContext("tenant", empresa.id, () =>
      prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: null } }),
    );

    const res = await POST(makeRequest({ email, password: "senha-correta" }, "10.0.0.20"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain("Confirme seu e-mail");
  });

  it("rejeita senha errada pra usuário existente", async () => {
    const { empresa } = await seedFixture();
    const passwordHash = await bcrypt.hash("senha-correta", 10);
    const email = `login-wrong-${Date.now()}@teste.com`;
    await runWithDatabaseContext("tenant", empresa.id, () =>
      createUser({ empresaId: empresa.id, name: "Login Teste", email, passwordHash, role: "OWNER" }),
    );

    const res = await POST(makeRequest({ email, password: "senha-errada" }, "10.0.0.3"));

    expect(res.status).toBe(401);
  });

  it("valida payload com Zod antes de consultar o banco", async () => {
    const res = await POST(makeRequest({ email: "", password: "" }, "10.0.0.4"));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeTruthy();
  });

  it("rejeita requisição mutável originada de outro site", async () => {
    const req = makeRequest({ email: "teste@teste.com", password: "qualquer" }, "10.0.0.5");
    req.headers.set("origin", "https://site-malicioso.example");
    req.headers.set("sec-fetch-site", "cross-site");

    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it("bloqueia por rate limit de e-mail após muitas tentativas na mesma conta", async () => {
    const email = `bruteforce-${Date.now()}@teste.com`;
    // limite é 8 tentativas / 15min por e-mail; varia o IP pra não bater no limite de IP (20) antes.
    for (let i = 0; i < 8; i++) {
      await POST(makeRequest({ email, password: "errada" }, `10.1.0.${i}`));
    }
    const res = await POST(makeRequest({ email, password: "errada" }, "10.1.0.99"));

    expect(res.status).toBe(429);
  });

  it("bloqueia por rate limit de IP após muitas tentativas do mesmo endereço", async () => {
    const ip = "10.2.0.1";
    for (let i = 0; i < 20; i++) {
      await POST(makeRequest({ email: `flood-${i}-${Date.now()}@teste.com`, password: "errada" }, ip));
    }
    const res = await POST(makeRequest({ email: `flood-final-${Date.now()}@teste.com`, password: "errada" }, ip));

    expect(res.status).toBe(429);
  });
});
