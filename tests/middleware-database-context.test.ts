import { sealData } from "iron-session";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";
import { sessionOptions } from "@/lib/session";

async function authenticatedRequest(path = "/inicio") {
  const sealed = await sealData(
    {
      user: {
        userId: "user_test",
        empresaId: "empresa_correta",
        empresaName: "Empresa Teste",
        filialId: null,
        name: "Dono",
        email: "dono@example.com",
        role: "OWNER",
        lastActivityAt: Date.now(),
      },
    },
    { password: sessionOptions.password, ttl: sessionOptions.ttl },
  );

  return new NextRequest(`https://example.com${path}`, {
    headers: {
      cookie: `${sessionOptions.cookieName}=${sealed}`,
      "x-database-context-kind": "admin",
      "x-database-context-value": "empresa_forjada",
    },
  });
}

describe("middleware database context", () => {
  it("substitui cabeçalhos forjados pelo tenant da sessão assinada", async () => {
    const response = await middleware(await authenticatedRequest());

    expect(response.headers.get("x-middleware-request-x-database-context-kind")).toBe("tenant");
    expect(response.headers.get("x-middleware-request-x-database-context-value")).toBe("empresa_correta");
    expect(response.headers.get("x-middleware-request-x-database-context-value")).not.toBe("empresa_forjada");
  });

  it("remove contexto enviado pelo navegador quando não há sessão", async () => {
    const request = new NextRequest("https://example.com/inicio", {
      headers: {
        "x-database-context-kind": "admin",
        "x-database-context-value": "atacante@example.com",
      },
    });
    const response = await middleware(request);

    expect(response.headers.get("x-middleware-request-x-database-context-kind")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-database-context-value")).toBeNull();
  });
});
