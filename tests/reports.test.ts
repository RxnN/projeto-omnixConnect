import { describe, expect, it } from "vitest";
import { cancelPedido, createPedido } from "@/lib/repo";
import { getFaturamento, getRankingRecorrencia } from "@/lib/reports";
import { seedFixture, seedProduct } from "./helpers";

function periodoAmplo() {
  return { from: new Date("2000-01-01"), to: new Date("2100-01-01") };
}

describe("relatórios ignoram pedidos cancelados", () => {
  it("getFaturamento não soma vendas de pedidos cancelados", async () => {
    const { adega, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { salePrice: 50, currentStock: 100 });
    const { from, to } = periodoAmplo();

    const pedido1 = await createPedido({
      adegaId: adega.id,
      filialId: filial.id,
      type: "OUT",
      paymentMethod: "DINHEIRO",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 2, unitValue: 50, source: "MANUAL" }],
    });
    await createPedido({
      adegaId: adega.id,
      filialId: filial.id,
      type: "OUT",
      paymentMethod: "DINHEIRO",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 3, unitValue: 50, source: "MANUAL" }],
    });

    const antesDoCancelamento = await getFaturamento(adega.id, from, to);
    expect(antesDoCancelamento.faturamento).toBe(250); // (2+3) * 50
    expect(antesDoCancelamento.numeroSaidas).toBe(2);

    await cancelPedido(pedido1.id, filial.id, user.id);

    const depoisDoCancelamento = await getFaturamento(adega.id, from, to);
    expect(depoisDoCancelamento.faturamento).toBe(150); // só os 3 restantes * 50
    expect(depoisDoCancelamento.numeroSaidas).toBe(1);
  });

  it("getRankingRecorrencia não conta saídas de pedidos cancelados", async () => {
    const { adega, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { currentStock: 100 });
    const { from, to } = periodoAmplo();

    const pedido = await createPedido({
      adegaId: adega.id,
      filialId: filial.id,
      type: "OUT",
      paymentMethod: "DINHEIRO",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 1, unitValue: 10, source: "MANUAL" }],
    });

    const antes = await getRankingRecorrencia(adega.id, from, to);
    expect(antes.find((r) => r.productId === product.id)?.numeroSaidas).toBe(1);

    await cancelPedido(pedido.id, filial.id, user.id);

    const depois = await getRankingRecorrencia(adega.id, from, to);
    expect(depois.find((r) => r.productId === product.id)).toBeUndefined();
  });
});
