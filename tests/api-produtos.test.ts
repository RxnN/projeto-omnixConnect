import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createUser } from "@/lib/repo";
import { seedFixture } from "./helpers";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from "@/lib/session";
import { POST as produtosPost } from "@/app/api/produtos/route";

const POST = (req: NextRequest) => produtosPost(req, undefined);

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/produtos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function loginAs(
  adegaId: string,
  filialId: string,
  adegaName: string,
  userId: string,
  name: string,
  email: string,
  role: "OWNER" | "MANAGER" | "EMPLOYEE"
) {
  vi.mocked(getCurrentUser).mockResolvedValue({ userId, adegaId, adegaName, filialId, name, email, role });
}

describe("POST /api/produtos", () => {
  afterEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("rejeita requisição sem sessão", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(makeRequest({}));

    expect(res.status).toBe(401);
  });

  it("funcionário não pode cadastrar produto", async () => {
    const { adega, filial } = await seedFixture();
    const employee = await createUser({
      adegaId: adega.id,
      name: "Funcionário",
      email: `func-${Date.now()}@teste.com`,
      passwordHash: "x",
      role: "EMPLOYEE",
    });
    await loginAs(adega.id, filial.id, adega.name, employee.id, employee.name, employee.email, "EMPLOYEE");

    const res = await POST(makeRequest({ name: "X", category: "C", unit: "un", costPrice: 1, salePrice: 2 }));

    expect(res.status).toBe(403);
  });

  it("gerente não pode cadastrar produto (só o dono)", async () => {
    const { adega, filial } = await seedFixture();
    const manager = await createUser({
      adegaId: adega.id,
      name: "Gerente",
      email: `ger-${Date.now()}@teste.com`,
      passwordHash: "x",
      role: "MANAGER",
    });
    await loginAs(adega.id, filial.id, adega.name, manager.id, manager.name, manager.email, "MANAGER");

    const res = await POST(makeRequest({ name: "X", category: "C", unit: "un", costPrice: 1, salePrice: 2 }));

    expect(res.status).toBe(403);
  });

  it("rejeita preço de custo negativo", async () => {
    const { adega, filial, user } = await seedFixture();
    await loginAs(adega.id, filial.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({ name: "X", category: "C", unit: "un", costPrice: -1, salePrice: 2, currentStock: 0 })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeTruthy();
  });

  it("rejeita estoque inicial fracionado", async () => {
    const { adega, filial, user } = await seedFixture();
    await loginAs(adega.id, filial.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({ name: "X", category: "C", unit: "un", costPrice: 1, salePrice: 2, currentStock: 2.5 })
    );

    expect(res.status).toBe(400);
  });

  it("ignora código de barras enviado pelo cliente (não é mais um campo aceito)", async () => {
    const { adega, filial, user } = await seedFixture();
    await loginAs(adega.id, filial.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({
        name: "Novo",
        category: "C",
        unit: "un",
        costPrice: 1,
        salePrice: 2,
        currentStock: 0,
        barcode: "7891234567895",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.product.barcode).toBeNull();
  });

  it("exige unidades por embalagem quando informa tipo de embalagem", async () => {
    const { adega, filial, user } = await seedFixture();
    await loginAs(adega.id, filial.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({
        name: "Caixa",
        category: "C",
        unit: "un",
        costPrice: 1,
        salePrice: 2,
        currentStock: 0,
        packageType: "CX",
        unitsPerPackage: null,
      })
    );

    expect(res.status).toBe(400);
  });

  it("cadastra produto com dados válidos", async () => {
    const { adega, filial, user } = await seedFixture();
    await loginAs(adega.id, filial.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(
      makeRequest({ name: "Vinho Teste", category: "Vinho", unit: "un", costPrice: 10.5, salePrice: 19.9, currentStock: 5 })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.product.code).toBe("0001");
    expect(json.product.costPrice).toBe(10.5);
    expect(json.product.salePrice).toBe(19.9);
  });
});
