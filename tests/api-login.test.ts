import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { createUser } from "@/lib/repo";
import { seedFixture } from "./helpers";

// getSession() grava um cookie via next/headers, que só existe dentro de uma requisição
// real do App Router. Mockamos só essa borda; a busca de usuário e a comparação de senha
// rodam de verdade contra o Postgres.
vi.mock("@/lib/session", () => ({
  getSession: vi.fn(async () => ({ user: undefined, save: vi.fn() })),
}));

import { POST as loginPost } from "@/app/api/login/route";

const POST = (req: NextRequest) => loginPost(req, undefined);

function makeRequest(body: unknown, ip: string) {
  return new NextRequest("http://localhost/api/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/login", () => {
  it("rejeita e-mail inexistente sem revelar que o e-mail não existe", async () => {
    const res = await POST(makeRequest({ email: "nao-existe@teste.com", password: "qualquer" }, "10.0.0.1"));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("E-mail ou senha inválidos.");
  });

  it("autentica com credenciais corretas", async () => {
    const { adega } = await seedFixture();
    const passwordHash = await bcrypt.hash("senha-correta", 10);
    const email = `login-${Date.now()}@teste.com`;
    await createUser({ adegaId: adega.id, name: "Login Teste", email, passwordHash, role: "OWNER" });

    const res = await POST(makeRequest({ email, password: "senha-correta" }, "10.0.0.2"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.role).toBe("OWNER");
  });

  it("rejeita senha errada pra usuário existente", async () => {
    const { adega } = await seedFixture();
    const passwordHash = await bcrypt.hash("senha-correta", 10);
    const email = `login-wrong-${Date.now()}@teste.com`;
    await createUser({ adegaId: adega.id, name: "Login Teste", email, passwordHash, role: "OWNER" });

    const res = await POST(makeRequest({ email, password: "senha-errada" }, "10.0.0.3"));

    expect(res.status).toBe(401);
  });

  it("valida payload com Zod antes de consultar o banco", async () => {
    const res = await POST(makeRequest({ email: "", password: "" }, "10.0.0.4"));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeTruthy();
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
