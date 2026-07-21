import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createUser } from "@/lib/repo";
import { seedFixture, seedProduct } from "./helpers";

// getCurrentUser depende de next/headers (cookies), que só funciona dentro de uma
// requisição real do App Router. Mockamos só essa borda; tudo o resto (validação,
// regras de negócio, banco) roda de verdade contra o Postgres, como o resto da suíte.
vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from "@/lib/session";
import { POST as pedidosPost } from "@/app/api/pedidos/route";

// A rota não usa o segundo parâmetro (sem segmento dinâmico), mas withErrorHandling
// exige um `context` no tipo; passamos undefined pra bater com a assinatura real do Next.
const POST = (req: NextRequest) => pedidosPost(req, undefined);

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/pedidos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function loginAs(adegaId: string, adegaName: string, userId: string, name: string, email: string, role: "OWNER" | "MANAGER" | "EMPLOYEE") {
  vi.mocked(getCurrentUser).mockResolvedValue({ userId, adegaId, adegaName, name, email, role });
}

describe("POST /api/pedidos", () => {
  afterEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("rejeita requisição sem sessão", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(makeRequest({ type: "OUT", items: [] }));

    expect(res.status).toBe(401);
  });

  it("rejeita payload inválido (sem itens)", async () => {
    const { adega, user } = await seedFixture();
    await loginAs(adega.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(makeRequest({ type: "OUT", items: [] }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeTruthy();
  });

  it("funcionário não pode alterar o preço de venda", async () => {
    const { adega } = await seedFixture();
    const product = await seedProduct(adega.id, { salePrice: 50, currentStock: 10 });
    const employee = await createUser({
      adegaId: adega.id,
      name: "Funcionário",
      email: `func-${Date.now()}@teste.com`,
      passwordHash: "x",
      role: "EMPLOYEE",
    });
    await loginAs(adega.id, adega.name, employee.id, employee.name, employee.email, "EMPLOYEE");

    const res = await POST(
      makeRequest({ type: "OUT", items: [{ productId: product.id, quantity: 1, unitValue: 10 }] })
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/não podem alterar o preço/);
  });

  it("funcionário pode vender pelo preço de tabela normalmente", async () => {
    const { adega } = await seedFixture();
    const product = await seedProduct(adega.id, { salePrice: 50, currentStock: 10 });
    const employee = await createUser({
      adegaId: adega.id,
      name: "Funcionário",
      email: `func-${Date.now()}@teste.com`,
      passwordHash: "x",
      role: "EMPLOYEE",
    });
    await loginAs(adega.id, adega.name, employee.id, employee.name, employee.email, "EMPLOYEE");

    const res = await POST(
      makeRequest({ type: "OUT", items: [{ productId: product.id, quantity: 1, unitValue: 50 }] })
    );

    expect(res.status).toBe(200);
  });

  it("dono pode dar desconto (alterar preço de venda)", async () => {
    const { adega, user } = await seedFixture();
    const product = await seedProduct(adega.id, { salePrice: 50, currentStock: 10 });
    await loginAs(adega.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({ type: "OUT", items: [{ productId: product.id, quantity: 1, unitValue: 30 }] })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pedido.totalValue).toBe(30);
  });

  it("rejeita valor unitário negativo", async () => {
    const { adega, user } = await seedFixture();
    const product = await seedProduct(adega.id, { currentStock: 10 });
    await loginAs(adega.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({ type: "OUT", items: [{ productId: product.id, quantity: 1, unitValue: -5 }] })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/negativo/);
  });

  it("avisa quando o estoque é insuficiente e não fecha o pedido sem force", async () => {
    const { adega, user } = await seedFixture();
    const product = await seedProduct(adega.id, { currentStock: 2, salePrice: 10 });
    await loginAs(adega.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(makeRequest({ type: "OUT", items: [{ productId: product.id, quantity: 5 }] }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.warning).toBeTruthy();
  });

  it("fecha o pedido mesmo com estoque insuficiente quando force=true", async () => {
    const { adega, user } = await seedFixture();
    const product = await seedProduct(adega.id, { currentStock: 2, salePrice: 10 });
    await loginAs(adega.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({ type: "OUT", items: [{ productId: product.id, quantity: 5 }], force: true })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pedido.totalValue).toBe(50);
  });

  it("não permite lançar pedido com produto de outra adega", async () => {
    const { adega, user } = await seedFixture();
    const other = await seedFixture();
    const foreignProduct = await seedProduct(other.adega.id, { currentStock: 10 });
    await loginAs(adega.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({ type: "OUT", items: [{ productId: foreignProduct.id, quantity: 1, unitValue: 10 }] })
    );

    expect(res.status).toBe(404);
  });
});
