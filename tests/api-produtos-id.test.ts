import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createUser } from "@/lib/repo";
import { seedFixture, seedProduct } from "./helpers";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from "@/lib/session";
import { PUT, DELETE } from "@/app/api/produtos/[id]/route";

function makeRequest(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/produtos/x", {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function loginAs(adegaId: string, adegaName: string, userId: string, name: string, email: string, role: "OWNER" | "MANAGER" | "EMPLOYEE") {
  vi.mocked(getCurrentUser).mockResolvedValue({ userId, adegaId, adegaName, name, email, role });
}

describe("PUT /api/produtos/[id]", () => {
  afterEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("não permite editar produto de outra adega (isolamento multi-tenant)", async () => {
    const { adega, user } = await seedFixture();
    const other = await seedFixture();
    const foreignProduct = await seedProduct(other.adega.id);
    await loginAs(adega.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await PUT(
      makeRequest("PUT", { name: "Hack", category: "C", unit: "un", costPrice: 1, salePrice: 2 }),
      { params: { id: foreignProduct.id } }
    );

    expect(res.status).toBe(404);
  });

  it("funcionário não pode editar produto", async () => {
    const { adega } = await seedFixture();
    const product = await seedProduct(adega.id);
    const employee = await createUser({
      adegaId: adega.id,
      name: "Funcionário",
      email: `func-${Date.now()}@teste.com`,
      passwordHash: "x",
      role: "EMPLOYEE",
    });
    await loginAs(adega.id, adega.name, employee.id, employee.name, employee.email, "EMPLOYEE");

    const res = await PUT(
      makeRequest("PUT", { name: "X", category: "C", unit: "un", costPrice: 1, salePrice: 2 }),
      { params: { id: product.id } }
    );

    expect(res.status).toBe(403);
  });

  it("atualiza produto com dados válidos", async () => {
    const { adega, user } = await seedFixture();
    const product = await seedProduct(adega.id, { salePrice: 10 });
    await loginAs(adega.id, adega.name, user.id, user.name, user.email, "OWNER");

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

describe("DELETE /api/produtos/[id]", () => {
  afterEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("não permite excluir produto de outra adega", async () => {
    const { adega, user } = await seedFixture();
    const other = await seedFixture();
    const foreignProduct = await seedProduct(other.adega.id);
    await loginAs(adega.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await DELETE(makeRequest("DELETE"), { params: { id: foreignProduct.id } });

    expect(res.status).toBe(404);
  });

  it("funcionário não pode excluir produto", async () => {
    const { adega } = await seedFixture();
    const product = await seedProduct(adega.id);
    const employee = await createUser({
      adegaId: adega.id,
      name: "Funcionário",
      email: `func-${Date.now()}@teste.com`,
      passwordHash: "x",
      role: "EMPLOYEE",
    });
    await loginAs(adega.id, adega.name, employee.id, employee.name, employee.email, "EMPLOYEE");

    const res = await DELETE(makeRequest("DELETE"), { params: { id: product.id } });

    expect(res.status).toBe(403);
  });
});
