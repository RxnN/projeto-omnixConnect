import { describe, expect, it } from "vitest";
import { cancelPedido, createPedido } from "@/lib/repo";
import { getDashboardOverview } from "@/lib/dashboard";
import { prisma, runWithDatabaseContext } from "@/lib/prisma";
import { seedFixture, seedProduct } from "./helpers";

describe("painel inicial", () => {
  it("resume vendas, entradas e lucro sem contar pedidos cancelados", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, {
      name: "Produto do painel",
      costPrice: 20,
      salePrice: 50,
      currentStock: 20,
      minStockAlert: 5,
    });

    await createPedido({
      empresaId: empresa.id,
      filialId: filial.id,
      type: "OUT",
      paymentMethod: "DINHEIRO",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 2, unitValue: 50, source: "MANUAL" }],
    });
    await createPedido({
      empresaId: empresa.id,
      filialId: filial.id,
      type: "IN",
      paymentMethod: "PIX",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 3, unitValue: 20, source: "MANUAL" }],
    });
    const cancelled = await createPedido({
      empresaId: empresa.id,
      filialId: filial.id,
      type: "OUT",
      paymentMethod: "PIX",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 1, unitValue: 50, source: "MANUAL" }],
    });
    await cancelPedido(cancelled.id, filial.id, user.id);
    await runWithDatabaseContext("tenant", empresa.id, () =>
      prisma.product.update({ where: { id: product.id }, data: { active: false } }),
    );

    const dashboard = await getDashboardOverview(empresa.id, filial.id, { includeProfitability: true });

    expect(dashboard.today).toMatchObject({ total: 100, orders: 1 });
    expect(dashboard.entriesToday).toEqual({ total: 60, orders: 1 });
    expect(dashboard.profitability).toEqual({ grossProfit: 60, marginPercent: 60 });
    expect(dashboard.topProducts[0]).toMatchObject({ id: product.id, quantity: 2, revenue: 100 });
    expect(dashboard.activeProducts).toBe(0);
    expect(dashboard.stockAlerts).toEqual([]);
    expect(dashboard.recentOrders).toHaveLength(3);
    expect(dashboard.recentOrders.every((order) => order.itemCount === 1)).toBe(true);
  });

  it("compara os últimos sete dias e omite lucro quando o perfil não pode ver custos", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { costPrice: 10, salePrice: 40, currentStock: 100 });
    await createPedido({
      empresaId: empresa.id,
      filialId: filial.id,
      type: "OUT",
      paymentMethod: "DINHEIRO",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 2, unitValue: 40, source: "MANUAL" }],
    });
    const older = await createPedido({
      empresaId: empresa.id,
      filialId: filial.id,
      type: "OUT",
      paymentMethod: "DINHEIRO",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 1, unitValue: 40, source: "MANUAL" }],
    });
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await runWithDatabaseContext("tenant", empresa.id, () =>
      prisma.$transaction(async (tx) => {
        await tx.pedido.update({ where: { id: older.id }, data: { createdAt: eightDaysAgo } });
        await tx.movement.updateMany({ where: { pedidoId: older.id }, data: { createdAt: eightDaysAgo } });
      }),
    );

    const dashboard = await getDashboardOverview(empresa.id, filial.id, { includeProfitability: false });

    expect(dashboard.lastSevenDays.total).toBe(80);
    expect(dashboard.lastSevenDays.previousTotal).toBe(40);
    expect(dashboard.lastSevenDays.changePercent).toBe(100);
    expect(dashboard.profitability).toBeNull();
    expect(dashboard.dailySales).toHaveLength(7);
  });
});
