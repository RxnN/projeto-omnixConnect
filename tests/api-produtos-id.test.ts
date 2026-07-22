import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createUser } from "@/lib/repo";
import { seedFixture, seedProduct } from "./helpers";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from "@/lib/session";
import { PUT } from "@/app/api/produtos/[id]/route";
import { POST as statusPost } from "@/app/api/produtos/[id]/status/route";

function makeRequest(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/produtos/x", {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
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

describe("PUT /api/produtos/[id]", () => {
  afterEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("não permite editar produto de outra filial (isolamento multi-tenant)", async () => {
    const { adega, filial, user } = await seedFixture();
    const other = await seedFixture();
    const foreignProduct = await seedProduct(other.filial);
    await loginAs(adega.id, filial.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await PUT(
      makeRequest("PUT", { name: "Hack", category: "C", unit: "un", costPrice: 1, salePrice: 2 }),
      { params: { id: foreignProduct.id } }
    );

    expect(res.status).toBe(404);
  });

  it("funcionário não pode editar produto", async () => {
    const { adega, filial } = await seedFixture();
    const product = await seedProduct(filial);
    const employee = await createUser({
      adegaId: adega.id,
      name: "Funcionário",
      email: `func-${Date.now()}@teste.com`,
      passwordHash: "x",
      role: "EMPLOYEE",
    });
    await loginAs(adega.id, filial.id, adega.name, employee.id, employee.name, employee.email, "EMPLOYEE");

    const res = await PUT(
      makeRequest("PUT", { name: "X", category: "C", unit: "un", costPrice: 1, salePrice: 2 }),
      { params: { id: product.id } }
    );

    expect(res.status).toBe(403);
  });

  it("atualiza produto com dados válidos", async () => {
    const { adega, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { salePrice: 10 });
    await loginAs(adega.id, filial.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await PUT(
      makeRequest("PUT", { name: "Atualizado", category: "C", unit: "un", costPrice: 1, salePrice: 25 }),
      { params: { id: product.id } }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.product.salePrice).toBe(25);
    expect(json.product.name).toBe("Atualizado");
  });
});

describe("POST /api/produtos/[id]/status", () => {
  afterEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("inativa um produto", async () => {
    const { adega, filial, user } = await seedFixture();
    const product = await seedProduct(filial);
    await loginAs(adega.id, filial.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await statusPost(makeRequest("POST", { active: false }), { params: { id: product.id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.product.active).toBe(false);
  });

  it("reativa um produto", async () => {
    const { adega, filial, user } = await seedFixture();
    const product = await seedProduct(filial);
    await loginAs(adega.id, filial.id, adega.name, user.id, user.name, user.email, "OWNER");

    await statusPost(makeRequest("POST", { active: false }), { params: { id: product.id } });
    const res = await statusPost(makeRequest("POST", { active: true }), { params: { id: product.id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.product.active).toBe(true);
  });

  it("não permite inativar produto de outra filial", async () => {
    const { adega, filial, user } = await seedFixture();
    const other = await seedFixture();
    const foreignProduct = await seedProduct(other.filial);
    await loginAs(adega.id, filial.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await statusPost(makeRequest("POST", { active: false }), { params: { id: foreignProduct.id } });

    expect(res.status).toBe(404);
  });

  it("funcionário não pode inativar produto", async () => {
    const { adega, filial } = await seedFixture();
    const product = await seedProduct(filial);
    const employee = await createUser({
      adegaId: adega.id,
      name: "Funcionário",
      email: `func-${Date.now()}@teste.com`,
      passwordHash: "x",
      role: "EMPLOYEE",
    });
    await loginAs(adega.id, filial.id, adega.name, employee.id, employee.name, employee.email, "EMPLOYEE");

    const res = await statusPost(makeRequest("POST", { active: false }), { params: { id: product.id } });

    expect(res.status).toBe(403);
  });
});
