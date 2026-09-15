import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

type AggregateRow = {
  vendasHoje: Prisma.Decimal;
  pedidosHoje: bigint;
  entradasHoje: Prisma.Decimal;
  numeroEntradasHoje: bigint;
  vendasOntem: Prisma.Decimal;
  pedidosOntem: bigint;
  vendasSeteDias: Prisma.Decimal;
  pedidosSeteDias: bigint;
  vendasSeteDiasAnteriores: Prisma.Decimal;
  pedidosSeteDiasAnteriores: bigint;
  vendasMes: Prisma.Decimal;
  pedidosMes: bigint;
  vendasMesAnterior: Prisma.Decimal;
  pedidosMesAnterior: bigint;
};

type DailyRow = { day: string; total: Prisma.Decimal; pedidos: bigint };

export interface DashboardPeriod {
  total: number;
  orders: number;
  previousTotal: number;
  changePercent: number | null;
}

export interface DashboardOverview {
  today: DashboardPeriod;
  lastSevenDays: DashboardPeriod;
  currentMonth: DashboardPeriod;
  entriesToday: { total: number; orders: number };
  activeProducts: number;
  stockAlerts: Array<{ id: string; name: string; unit: string; currentStock: number; minStockAlert: number | null }>;
  dailySales: Array<{ key: string; label: string; total: number; orders: number }>;
  topProducts: Array<{ id: string; name: string; unit: string; quantity: number; revenue: number; sharePercent: number }>;
  profitability: { grossProfit: number; marginPercent: number | null } | null;
  recentOrders: Array<{
    id: string;
    type: "IN" | "OUT";
    number: number;
    totalValue: number;
    createdAt: string;
    cancelledAt: string | null;
    itemCount: number;
  }>;
}

function saoPauloDateParts(reference: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

/** O Brasil não usa horário de verão desde 2019; 03:00 UTC corresponde à meia-noite
 * de São Paulo e evita que o painel da empresa use o dia UTC da Vercel. */
function businessDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function period(total: number, orders: number, previousTotal: number): DashboardPeriod {
  return { total, orders, previousTotal, changePercent: percentChange(total, previousTotal) };
}

export async function getDashboardOverview(
  empresaId: string,
  filialId: string,
  options: { includeProfitability: boolean },
): Promise<DashboardOverview> {
  const now = new Date();
  const local = saoPauloDateParts(now);
  const todayStart = businessDate(local.year, local.month, local.day);
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
  const sevenDaysStart = new Date(todayStart.getTime() - 6 * DAY_MS);
  const previousSevenDaysStart = new Date(sevenDaysStart.getTime() - 7 * DAY_MS);
  const monthStart = businessDate(local.year, local.month, 1);
  const previousMonthMarker = new Date(Date.UTC(local.year, local.month - 2, 1));
  const previousMonthStart = businessDate(
    previousMonthMarker.getUTCFullYear(),
    previousMonthMarker.getUTCMonth() + 1,
    1,
  );
  const earliest = new Date(Math.min(previousSevenDaysStart.getTime(), previousMonthStart.getTime()));

  return prisma.$transaction(async (tx) => {
    const [aggregateRows, dailyRows, products, productSales, recent] = await Promise.all([
      tx.$queryRaw<AggregateRow[]>`
        SELECT
          COALESCE(SUM("totalValue") FILTER (WHERE "type" = 'OUT' AND "createdAt" >= ${todayStart} AND "createdAt" < ${tomorrowStart}), 0) AS "vendasHoje",
          COUNT(*) FILTER (WHERE "type" = 'OUT' AND "createdAt" >= ${todayStart} AND "createdAt" < ${tomorrowStart}) AS "pedidosHoje",
          COALESCE(SUM("totalValue") FILTER (WHERE "type" = 'IN' AND "createdAt" >= ${todayStart} AND "createdAt" < ${tomorrowStart}), 0) AS "entradasHoje",
          COUNT(*) FILTER (WHERE "type" = 'IN' AND "createdAt" >= ${todayStart} AND "createdAt" < ${tomorrowStart}) AS "numeroEntradasHoje",
          COALESCE(SUM("totalValue") FILTER (WHERE "type" = 'OUT' AND "createdAt" >= ${yesterdayStart} AND "createdAt" < ${todayStart}), 0) AS "vendasOntem",
          COUNT(*) FILTER (WHERE "type" = 'OUT' AND "createdAt" >= ${yesterdayStart} AND "createdAt" < ${todayStart}) AS "pedidosOntem",
          COALESCE(SUM("totalValue") FILTER (WHERE "type" = 'OUT' AND "createdAt" >= ${sevenDaysStart}), 0) AS "vendasSeteDias",
          COUNT(*) FILTER (WHERE "type" = 'OUT' AND "createdAt" >= ${sevenDaysStart}) AS "pedidosSeteDias",
          COALESCE(SUM("totalValue") FILTER (WHERE "type" = 'OUT' AND "createdAt" >= ${previousSevenDaysStart} AND "createdAt" < ${sevenDaysStart}), 0) AS "vendasSeteDiasAnteriores",
          COUNT(*) FILTER (WHERE "type" = 'OUT' AND "createdAt" >= ${previousSevenDaysStart} AND "createdAt" < ${sevenDaysStart}) AS "pedidosSeteDiasAnteriores",
          COALESCE(SUM("totalValue") FILTER (WHERE "type" = 'OUT' AND "createdAt" >= ${monthStart}), 0) AS "vendasMes",
          COUNT(*) FILTER (WHERE "type" = 'OUT' AND "createdAt" >= ${monthStart}) AS "pedidosMes",
          COALESCE(SUM("totalValue") FILTER (WHERE "type" = 'OUT' AND "createdAt" >= ${previousMonthStart} AND "createdAt" < ${monthStart}), 0) AS "vendasMesAnterior",
          COUNT(*) FILTER (WHERE "type" = 'OUT' AND "createdAt" >= ${previousMonthStart} AND "createdAt" < ${monthStart}) AS "pedidosMesAnterior"
        FROM "Pedido"
        WHERE "adegaId" = ${empresaId}
          AND "filialId" = ${filialId}
          AND "cancelledAt" IS NULL
          AND "createdAt" >= ${earliest}
      `,
      tx.$queryRaw<DailyRow[]>`
        SELECT
          TO_CHAR("createdAt" AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS "day",
          COALESCE(SUM("totalValue"), 0) AS "total",
          COUNT(*) AS "pedidos"
        FROM "Pedido"
        WHERE "adegaId" = ${empresaId}
          AND "filialId" = ${filialId}
          AND "type" = 'OUT'
          AND "cancelledAt" IS NULL
          AND "createdAt" >= ${sevenDaysStart}
        GROUP BY 1
        ORDER BY 1
      `,
      tx.product.findMany({
        where: { empresaId, filialId },
        select: { id: true, name: true, unit: true, currentStock: true, minStockAlert: true, costPrice: true, active: true },
        orderBy: { name: "asc" },
      }),
      tx.movement.groupBy({
        by: ["productId"],
        where: {
          empresaId,
          filialId,
          type: "OUT",
          createdAt: { gte: monthStart },
          pedido: { cancelledAt: null },
        },
        _sum: { quantity: true, totalValue: true },
      }),
      tx.pedido.findMany({
        where: { empresaId, filialId },
        select: {
          id: true,
          type: true,
          number: true,
          totalValue: true,
          createdAt: true,
          cancelledAt: true,
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    const summary = aggregateRows[0];
    const numberValue = (value: Prisma.Decimal | undefined) => value?.toNumber() ?? 0;
    const countValue = (value: bigint | undefined) => Number(value ?? 0);

    const dailyMap = new Map(dailyRows.map((row) => [row.day, row]));
    const weekday = new Intl.DateTimeFormat("pt-BR", { timeZone: BUSINESS_TIME_ZONE, weekday: "short" });
    const dailySales = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sevenDaysStart.getTime() + index * DAY_MS);
      const key = date.toISOString().slice(0, 10);
      const row = dailyMap.get(key);
      return {
        key,
        label: weekday.format(date).replace(".", ""),
        total: numberValue(row?.total),
        orders: countValue(row?.pedidos),
      };
    });

    const productMap = new Map(products.map((product) => [product.id, product]));
    const ranked = productSales
      .map((sale) => ({
        product: productMap.get(sale.productId),
        quantity: sale._sum.quantity ?? 0,
        revenue: sale._sum.totalValue?.toNumber() ?? 0,
      }))
      .filter((item) => item.product && item.quantity > 0)
      .sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = ranked.reduce((sum, item) => sum + item.revenue, 0);
    const totalCost = ranked.reduce(
      (sum, item) => sum + item.quantity * (item.product?.costPrice.toNumber() ?? 0),
      0,
    );
    const grossProfit = totalRevenue - totalCost;

    return {
      today: period(
        numberValue(summary?.vendasHoje),
        countValue(summary?.pedidosHoje),
        numberValue(summary?.vendasOntem),
      ),
      lastSevenDays: period(
        numberValue(summary?.vendasSeteDias),
        countValue(summary?.pedidosSeteDias),
        numberValue(summary?.vendasSeteDiasAnteriores),
      ),
      currentMonth: period(
        numberValue(summary?.vendasMes),
        countValue(summary?.pedidosMes),
        numberValue(summary?.vendasMesAnterior),
      ),
      entriesToday: {
        total: numberValue(summary?.entradasHoje),
        orders: countValue(summary?.numeroEntradasHoje),
      },
      activeProducts: products.filter((product) => product.active).length,
      stockAlerts: products
        .filter((product) => product.active && product.currentStock <= (product.minStockAlert ?? 0))
        .sort((a, b) => a.currentStock - b.currentStock)
        .slice(0, 5)
        .map(({ costPrice: _costPrice, active: _active, ...product }) => product),
      dailySales,
      topProducts: ranked.slice(0, 5).map((item) => ({
        id: item.product!.id,
        name: item.product!.name,
        unit: item.product!.unit,
        quantity: item.quantity,
        revenue: item.revenue,
        sharePercent: totalRevenue > 0 ? Number(((item.revenue / totalRevenue) * 100).toFixed(1)) : 0,
      })),
      profitability: options.includeProfitability
        ? {
            grossProfit,
            marginPercent: totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : null,
          }
        : null,
      recentOrders: recent.map((order) => ({
        id: order.id,
        type: order.type,
        number: order.number,
        totalValue: order.totalValue.toNumber(),
        createdAt: order.createdAt.toISOString(),
        cancelledAt: order.cancelledAt?.toISOString() ?? null,
        itemCount: order._count.items,
      })),
    };
  });
}
