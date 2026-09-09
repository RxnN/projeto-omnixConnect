import { describe, expect, it } from "vitest";
import { redactPedidoValues } from "@/lib/financial-data";
import type { PedidoWithItems } from "@/lib/types";

describe("redação de dados financeiros", () => {
  it("remove total, valor unitário e subtotal antes da serialização", () => {
    const pedido: PedidoWithItems = {
      id: "p1",
      empresaId: "e1",
      filialId: "f1",
      type: "IN",
      number: 1,
      totalValue: 120,
      createdAt: new Date().toISOString(),
      createdByUserId: "u1",
      cancelledAt: null,
      cancelledByUserId: null,
      paymentMethod: "PIX",
      boletoDueDays: null,
      createdByName: "Usuário",
      cancelledByName: null,
      items: [{ id: "i1", productId: "x", productName: "Produto", productUnit: "un", quantity: 2, unitValue: 60, totalValue: 120 }],
    };

    const safe = redactPedidoValues(pedido);

    expect(safe.totalValue).toBe(0);
    expect(safe.items[0]).toMatchObject({ unitValue: 0, totalValue: 0 });
    expect(pedido.totalValue).toBe(120);
  });
});
