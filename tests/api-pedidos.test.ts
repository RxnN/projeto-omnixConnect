import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createPedido, createPromotion, createUser, setProductActive, updateUserPermissions } from "@/lib/repo";
import { prisma } from "@/lib/prisma";
import { seedFixture, seedProduct } from "./helpers";

// getCurrentUser depende de next/headers (cookies), que só funciona dentro de uma
// requisição real do App Router. Mockamos só essa borda; tudo o resto (validação,
// regras de negócio, banco) roda de verdade contra o Postgres, como o resto da suíte.
vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from "@/lib/session";
import { POST as pedidosPost } from "@/app/api/pedidos/route";
import { POST as cancelPost } from "@/app/api/pedidos/[id]/cancel/route";

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

// filialId é sempre informado explicitamente aqui (mesmo pro papel OWNER, cujo login
// real deixa null) pra não depender de getCurrentFilialId resolver por cookie —
// esse fallback é testado à parte, fora deste arquivo.
async function loginAs(
  empresaId: string,
  filialId: string,
  empresaName: string,
  userId: string,
  name: string,
  email: string,
  role: "OWNER" | "MANAGER" | "EMPLOYEE"
) {
  vi.mocked(getCurrentUser).mockResolvedValue({ userId, empresaId, empresaName, filialId, name, email, role, lastActivityAt: Date.now() });
}

describe("POST /api/pedidos", () => {
  afterEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("rejeita requisição sem sessão", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(makeRequest({ type: "OUT", paymentMethod: "DINHEIRO", items: [] }));

    expect(res.status).toBe(401);
  });

  it("rejeita payload inválido (sem itens)", async () => {
    const { empresa, filial, user } = await seedFixture();
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(makeRequest({ type: "OUT", paymentMethod: "DINHEIRO", items: [] }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeTruthy();
  });

  it("bloqueia API para empresa ainda não aprovada", async () => {
    const { empresa, filial, user } = await seedFixture();
    await prisma.empresa.update({ where: { id: empresa.id }, data: { approved: false } });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(makeRequest({ type: "OUT", paymentMethod: "DINHEIRO", items: [] }));

    expect(res.status).toBe(403);
  });

  it("bloqueia API para assinatura vencida", async () => {
    const { empresa, filial, user } = await seedFixture();
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { paidUntil: new Date(Date.now() - 60_000) },
    });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(makeRequest({ type: "OUT", paymentMethod: "DINHEIRO", items: [] }));

    expect(res.status).toBe(403);
  });

  it("funcionário não pode alterar o preço de venda", async () => {
    const { empresa, filial } = await seedFixture();
    const product = await seedProduct(filial, { salePrice: 50, currentStock: 10 });
    const employee = await createUser({
      empresaId: empresa.id,
      name: "Funcionário",
      email: `func-${Date.now()}@teste.com`,
      passwordHash: "x",
      role: "EMPLOYEE",
    });
    await loginAs(empresa.id, filial.id, empresa.name, employee.id, employee.name, employee.email, "EMPLOYEE");

    const res = await POST(
      makeRequest({ type: "OUT", paymentMethod: "DINHEIRO", items: [{ productId: product.id, quantity: 1, unitValue: 10 }] })
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/não podem alterar o preço/);
  });

  it("funcionário pode vender pelo preço de tabela normalmente", async () => {
    const { empresa, filial } = await seedFixture();
    const product = await seedProduct(filial, { salePrice: 50, currentStock: 10 });
    const employee = await createUser({
      empresaId: empresa.id,
      name: "Funcionário",
      email: `func-${Date.now()}@teste.com`,
      passwordHash: "x",
      role: "EMPLOYEE",
    });
    await loginAs(empresa.id, filial.id, empresa.name, employee.id, employee.name, employee.email, "EMPLOYEE");

    const res = await POST(
      makeRequest({ type: "OUT", paymentMethod: "DINHEIRO", items: [{ productId: product.id, quantity: 1, unitValue: 50 }] })
    );

    expect(res.status).toBe(200);
  });

  it("dono pode dar desconto (alterar preço de venda)", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { salePrice: 50, currentStock: 10 });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({ type: "OUT", paymentMethod: "DINHEIRO", items: [{ productId: product.id, quantity: 1, unitValue: 30 }] })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pedido.totalValue).toBe(30);
  });

  it("não devolve custo de entrada para usuário sem permissão financeira", async () => {
    const { empresa, filial } = await seedFixture();
    const product = await seedProduct(filial, { currentStock: 0, costPrice: 42 });
    const employee = await createUser({
      empresaId: empresa.id,
      filialId: filial.id,
      name: "Funcionário",
      email: `entry-cost-${Date.now()}@teste.com`,
      passwordHash: "x",
      role: "EMPLOYEE",
    });
    await loginAs(empresa.id, filial.id, empresa.name, employee.id, employee.name, employee.email, "EMPLOYEE");

    const res = await POST(
      makeRequest({
        type: "IN",
        paymentMethod: "DINHEIRO",
        items: [{ productId: product.id, quantity: 1 }],
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pedido.totalValue).toBe(0);
    expect(json.pedido.items[0].unitValue).toBe(0);
    const storedItem = await prisma.movement.findFirst({ where: { pedidoId: json.pedido.id } });
    expect(storedItem?.unitValue.toNumber()).toBe(42);
  });

  it("rejeita valor unitário negativo", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { currentStock: 10 });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({ type: "OUT", paymentMethod: "DINHEIRO", items: [{ productId: product.id, quantity: 1, unitValue: -5 }] })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/negativo/);
  });

  it("rejeita o mesmo produto repetido no payload", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { currentStock: 10, salePrice: 10 });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({
        type: "OUT",
        paymentMethod: "DINHEIRO",
        items: [
          { productId: product.id, quantity: 4 },
          { productId: product.id, quantity: 4 },
        ],
      })
    );

    expect(res.status).toBe(400);
  });

  it("avisa quando o estoque é insuficiente e não fecha o pedido sem force", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { currentStock: 2, salePrice: 10 });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(makeRequest({ type: "OUT", paymentMethod: "DINHEIRO", items: [{ productId: product.id, quantity: 5 }] }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.warning).toBeTruthy();
  });

  it("fecha o pedido mesmo com estoque insuficiente quando force=true", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { currentStock: 2, salePrice: 10 });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({ type: "OUT", paymentMethod: "DINHEIRO", items: [{ productId: product.id, quantity: 5 }], force: true })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pedido.totalValue).toBe(50);
  });

  it("não permite lançar pedido com produto de outra filial", async () => {
    const { empresa, filial, user } = await seedFixture();
    const other = await seedFixture();
    const foreignProduct = await seedProduct(other.filial, { currentStock: 10 });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({ type: "OUT", paymentMethod: "DINHEIRO", items: [{ productId: foreignProduct.id, quantity: 1, unitValue: 10 }] })
    );

    expect(res.status).toBe(404);
  });

  it("não permite lançar pedido com produto inativo", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { currentStock: 10, salePrice: 10 });
    await setProductActive(product.id, filial.id, false);
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({ type: "OUT", paymentMethod: "DINHEIRO", items: [{ productId: product.id, quantity: 1, unitValue: 10 }] })
    );

    expect(res.status).toBe(400);
  });

  it("exige forma de pagamento", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { currentStock: 10, salePrice: 10 });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({ type: "OUT", items: [{ productId: product.id, quantity: 1, unitValue: 10 }] })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/forma de pagamento/i);
  });

  it("rejeita forma de pagamento que não vale para o tipo (boleto numa saída)", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { currentStock: 10, salePrice: 10 });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({
        type: "OUT",
        paymentMethod: "BOLETO",
        items: [{ productId: product.id, quantity: 1, unitValue: 10 }],
      })
    );

    expect(res.status).toBe(400);
  });

  it("aceita fiado numa saída", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { currentStock: 10, salePrice: 10 });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({
        type: "OUT",
        paymentMethod: "FIADO",
        items: [{ productId: product.id, quantity: 1, unitValue: 10 }],
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pedido.paymentMethod).toBe("FIADO");
  });

  it("entrada com boleto exige quantos dias vence", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { currentStock: 0, costPrice: 10 });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({
        type: "IN",
        paymentMethod: "BOLETO",
        items: [{ productId: product.id, quantity: 1, unitValue: 10 }],
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/dias/i);
  });

  it("funcionário se beneficia automaticamente de uma promoção ativa", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { salePrice: 50, currentStock: 10 });
    await createPromotion({
      empresaId: empresa.id,
      filialId: filial.id,
      productId: product.id,
      promoPrice: 30,
      startDate: null,
      endDate: null,
      minQuantity: null,
      createdByUserId: user.id,
    });
    const employee = await createUser({
      empresaId: empresa.id,
      name: "Funcionário",
      email: `func-${Date.now()}@teste.com`,
      passwordHash: "x",
      role: "EMPLOYEE",
    });
    await loginAs(empresa.id, filial.id, empresa.name, employee.id, employee.name, employee.email, "EMPLOYEE");

    const res = await POST(
      makeRequest({ type: "OUT", paymentMethod: "DINHEIRO", items: [{ productId: product.id, quantity: 1 }] })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pedido.totalValue).toBe(0);
    const stored = await prisma.pedido.findUnique({ where: { id: json.pedido.id } });
    expect(stored?.totalValue.toNumber()).toBe(30);
  });

  it("funcionário não pode vender abaixo do preço promocional vigente", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { salePrice: 50, currentStock: 10 });
    await createPromotion({
      empresaId: empresa.id,
      filialId: filial.id,
      productId: product.id,
      promoPrice: 30,
      startDate: null,
      endDate: null,
      minQuantity: null,
      createdByUserId: user.id,
    });
    const employee = await createUser({
      empresaId: empresa.id,
      name: "Funcionário",
      email: `func-${Date.now()}@teste.com`,
      passwordHash: "x",
      role: "EMPLOYEE",
    });
    await loginAs(empresa.id, filial.id, empresa.name, employee.id, employee.name, employee.email, "EMPLOYEE");

    const res = await POST(
      makeRequest({
        type: "OUT",
        paymentMethod: "DINHEIRO",
        items: [{ productId: product.id, quantity: 1, unitValue: 10 }],
      })
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/não podem alterar o preço/);
  });

  it("entrada com boleto salva os dias de vencimento", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { currentStock: 0, costPrice: 10 });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({
        type: "IN",
        paymentMethod: "BOLETO",
        boletoDueDays: 30,
        items: [{ productId: product.id, quantity: 1, unitValue: 10 }],
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pedido.paymentMethod).toBe("BOLETO");
    expect(json.pedido.boletoDueDays).toBe(30);
  });
});

describe("POST /api/pedidos/[id]/cancel", () => {
  afterEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("não permite cancelar pedido de outra empresa (isolamento multi-tenant)", async () => {
    const { empresa, filial, user } = await seedFixture();
    const other = await seedFixture();
    const foreignProduct = await seedProduct(other.filial, { currentStock: 10 });
    const foreignPedido = await createPedido({
      empresaId: other.empresa.id,
      filialId: other.filial.id,
      type: "OUT",
      createdByUserId: other.user.id,
      paymentMethod: "DINHEIRO",
      items: [{ productId: foreignProduct.id, quantity: 1, unitValue: 20, source: "MANUAL" }],
    });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await cancelPost(
      new NextRequest("http://localhost/api/pedidos/x/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: foreignPedido.id }) }
    );

    expect(res.status).toBe(404);
    const stillActive = await prisma.pedido.findUnique({ where: { id: foreignPedido.id } });
    expect(stillActive?.cancelledAt).toBeNull();
  });

  it("não permite cancelamento forçado sem a permissão FORCE_STOCK", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { currentStock: 0 });
    const entry = await createPedido({
      empresaId: empresa.id,
      filialId: filial.id,
      type: "IN",
      createdByUserId: user.id,
      paymentMethod: "DINHEIRO",
      items: [{ productId: product.id, quantity: 10, unitValue: 10, source: "MANUAL" }],
    });
    await createPedido({
      empresaId: empresa.id,
      filialId: filial.id,
      type: "OUT",
      createdByUserId: user.id,
      paymentMethod: "DINHEIRO",
      items: [{ productId: product.id, quantity: 8, unitValue: 20, source: "MANUAL" }],
    });
    const employee = await createUser({
      empresaId: empresa.id,
      filialId: filial.id,
      name: "Cancelador",
      email: `cancel-${Date.now()}@teste.com`,
      passwordHash: "x",
      role: "EMPLOYEE",
    });
    await updateUserPermissions(employee.id, empresa.id, { CANCEL_ORDERS: true, FORCE_STOCK: false });
    await loginAs(empresa.id, filial.id, empresa.name, employee.id, employee.name, employee.email, "EMPLOYEE");

    const res = await cancelPost(
      new NextRequest("http://localhost/api/pedidos/x/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ force: true }),
      }),
      { params: Promise.resolve({ id: entry.id }) }
    );

    expect(res.status).toBe(403);
    expect((await prisma.pedido.findUnique({ where: { id: entry.id } }))?.cancelledAt).toBeNull();
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.currentStock).toBe(2);
  });
});
