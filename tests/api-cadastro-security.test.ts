import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const state = vi.hoisted(() => ({
  events: [] as string[],
  register: vi.fn(),
  send: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => "203.0.113.10",
  rateLimit: vi.fn(async (key: string) => {
    state.events.push(`rate:${key}`);
    return { allowed: true, retryAfterSeconds: 0 };
  }),
}));

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstile: vi.fn(async () => {
    state.events.push("turnstile");
  }),
}));

vi.mock("@/lib/repo", () => ({
  registerEmpresaWithOwner: state.register,
}));

vi.mock("@/lib/email", () => ({
  sendEmailVerification: state.send,
}));

import { POST as cadastroPost } from "@/app/api/cadastro/route";

const validBody = {
  empresaName: "Empresa Teste",
  cnpjCpf: "11222333000181",
  userName: "Usuário Teste",
  phone: "11999999999",
  email: "cadastro@example.com",
  password: "senha-segura-123",
  turnstileToken: "token",
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/cadastro", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("segurança do cadastro público", () => {
  beforeEach(() => {
    state.events.length = 0;
    state.register.mockReset();
    state.send.mockReset();
  });

  it("não consome a cota global quando o corpo é inválido", async () => {
    const res = await cadastroPost(request({}), undefined);

    expect(res.status).toBe(400);
    expect(state.events).toEqual(["rate:cadastro:203.0.113.10"]);
  });

  it("só consome a cota global depois do Turnstile válido", async () => {
    state.register.mockResolvedValue({ verification: null });

    const res = await cadastroPost(request(validBody), undefined);

    expect(res.status).toBe(200);
    expect(state.events.indexOf("turnstile")).toBeLessThan(state.events.indexOf("rate:cadastro:global"));
  });

  it("envia a confirmação sem expor o token na resposta", async () => {
    const verification = { email: validBody.email, token: "token-secreto", tokenHash: "hash" };
    state.register.mockResolvedValue({ verification });
    state.send.mockResolvedValue(undefined);

    const res = await cadastroPost(request(validBody), undefined);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(state.send).toHaveBeenCalledWith(verification);
    expect(JSON.stringify(json)).not.toContain(verification.token);
  });

  it("não revela conflito de unicidade na resposta", async () => {
    state.register.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "6.19.3" })
    );

    const res = await cadastroPost(request(validBody), undefined);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });
});
