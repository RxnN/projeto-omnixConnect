import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmailVerification, sendOwnerLoginMfaCode, sendPasswordReset, sendUserInvite } from "@/lib/email";

const previous = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  APP_ORIGIN: process.env.APP_ORIGIN,
};

describe("envio de confirmação de e-mail", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_chave_ficticia_de_teste";
    process.env.EMAIL_FROM = "Omnix Connect <acesso@example.com>";
    process.env.APP_ORIGIN = "https://app.example.com";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("envia o token no fragmento do link e usa idempotência", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"email-1"}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendEmailVerification({
      email: "destinatario@example.com",
      token: "token_de_teste_123456789012345678901234567890",
      tokenHash: "a".repeat(64),
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers["Idempotency-Key"]).toBe(`email-verification-${"a".repeat(64)}`);
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["destinatario@example.com"]);
    expect(body.text).toContain("/verificar-email#token=");
    expect(body.text).not.toContain("?token=");
  });

  it("envia recuperação no fragmento sem expor o token na query", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"email-2"}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendPasswordReset({
      email: "destinatario@example.com",
      token: "token_de_recuperacao_123456789012345678901234567890",
      tokenHash: "b".repeat(64),
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Idempotency-Key"]).toBe(`password-reset-${"b".repeat(64)}`);
    const body = JSON.parse(init.body);
    expect(body.text).toContain("/redefinir-senha#token=");
    expect(body.text).not.toContain("?token=");
    expect(body.text).toContain("30 minutos");
  });

  it("envia o código de acesso do dono sem incluir credenciais", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"email-3"}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendOwnerLoginMfaCode("dono@example.com", "123456", "request-1");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Idempotency-Key"]).toBe("owner-login-mfa-request-1");
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["dono@example.com"]);
    expect(body.text).toContain("123456");
    expect(body.text).toContain("10 minutos");
  });

  it("envia convite em fragmento sem senha definida pelo dono", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"email-4"}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendUserInvite({ email: "equipe@example.com", token: "token_seguro_de_convite_12345678901234567890", tokenHash: "c".repeat(64), empresaName: "Empresa Teste", inviterName: "Dono" });
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.text).toContain("/aceitar-convite#token=");
    expect(body.text).not.toContain("?token=");
    expect(body.text.toLowerCase()).not.toContain("senha provisória");
  });
});
