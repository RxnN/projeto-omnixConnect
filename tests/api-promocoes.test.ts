import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createPromotion } from "@/lib/repo";
import { prisma } from "@/lib/prisma";
import { seedFixture, seedProduct } from "./helpers";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from "@/lib/session";
import { DELETE as promocaoDelete } from "@/app/api/promocoes/[id]/route";

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

describe("DELETE /api/promocoes/[id]", () => {
  afterEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("não permite remover promoção de outra empresa (isolamento multi-tenant)", async () => {
    const { empresa, filial, user } = await seedFixture();
    const other = await seedFixture();
    const foreignProduct = await seedProduct(other.filial);
    const foreignPromotion = await createPromotion({
      empresaId: other.empresa.id,
      filialId: other.filial.id,
      productId: foreignProduct.id,
      promoPrice: 15,
      startDate: null,
      endDate: null,
      minQuantity: null,
      createdByUserId: other.user.id,
    });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await promocaoDelete(
      new NextRequest("http://localhost/api/promocoes/x", { method: "DELETE" }),
      { params: Promise.resolve({ id: foreignPromotion.id }) }
    );

    expect(res.status).toBe(404);
    const stillExists = await prisma.promotion.findUnique({ where: { id: foreignPromotion.id } });
    expect(stillExists).not.toBeNull();
  });
});
