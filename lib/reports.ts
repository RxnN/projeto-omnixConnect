import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { PackageType, Product } from "./types";

function toProduct(p: {
  id: string;
  adegaId: string;
  code: string;
  barcode: string | null;
  name: string;
  category: string;
  unit: string;
  costPrice: Prisma.Decimal;
  salePrice: Prisma.Decimal;
  currentStock: number;
  minStockAlert: number | null;
  packageType: string | null;
  unitsPerPackage: number | null;
  createdAt: Date;
}): Product {
  return {
    ...p,
    costPrice: p.costPrice.toNumber(),
    salePrice: p.salePrice.toNumber(),
    packageType: p.packageType as PackageType | null,
    createdAt: p.createdAt.toISOString(),
  };
}

export interface EstoqueItem extends Product {
  valorEmEstoque: number;
}

export async function getEstoqueAtual(adegaId: string): Promise<EstoqueItem[]> {
  const products = await prisma.product.findMany({ where: { adegaId }, orderBy: { name: "asc" } });
  return products.map((p) => {
    const product = toProduct(p);
    return { ...product, valorEmEstoque: product.currentStock * product.costPrice };
  });
}

export interface FaturamentoResumo {
  faturamento: number;
  volumeVendido: number;
  numeroSaidas: number;
}

export async function getFaturamento(adegaId: string, from: Date, to: Date): Promise<FaturamentoResumo> {
  const result = await prisma.movement.aggregate({
    where: { adegaId, type: "OUT", createdAt: { gte: from, lte: to }, pedido: { cancelledAt: null } },
    _sum: { totalValue: true, quantity: true },
    _count: { _all: true },
  });
  return {
    faturamento: result._sum.totalValue?.toNumber() ?? 0,
    volumeVendido: result._sum.quantity ?? 0,
    numeroSaidas: result._count._all,
  };
}

export interface FaturamentoPorProduto {
  productId: string;
  productName: string;
  unit: string;
  volumeVendido: number;
  faturamento: number;
}

export async function getFaturamentoPorProduto(
  adegaId: string,
  from: Date,
  to: Date
): Promise<FaturamentoPorProduto[]> {
  const products = await prisma.product.findMany({
    where: { adegaId },
    select: { id: true, name: true, unit: true },
    orderBy: { name: "asc" },
  });
  const grouped = await prisma.movement.groupBy({
    by: ["productId"],
    where: { adegaId, type: "OUT", createdAt: { gte: from, lte: to }, pedido: { cancelledAt: null } },
    _sum: { quantity: true, totalValue: true },
  });
  const groupedMap = new Map(grouped.map((g) => [g.productId, g]));

  return products
    .map((p) => {
      const g = groupedMap.get(p.id);
      return {
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        volumeVendido: g?._sum.quantity ?? 0,
        faturamento: g?._sum.totalValue?.toNumber() ?? 0,
      };
    })
    .sort((a, b) => b.faturamento - a.faturamento);
}

export interface RentabilidadeResumo {
  faturamento: number;
  custoTotal: number;
  lucroBruto: number;
  margemPercent: number | null;
}

export interface RentabilidadeItem {
  productId: string;
  productName: string;
  unit: string;
  volumeVendido: number;
  faturamento: number;
  custoTotal: number;
  lucroBruto: number;
  margemPercent: number | null;
}

/** Lucro bruto = faturamento (preço de venda praticado) menos custo (preço de custo atual x
 * quantidade vendida). Não faz custeio histórico (FIFO/média móvel) — usa o custo cadastrado
 * hoje no produto, mesma limitação já aceita no resto do app. */
export async function getRentabilidade(
  adegaId: string,
  from: Date,
  to: Date
): Promise<{ resumo: RentabilidadeResumo; porProduto: RentabilidadeItem[] }> {
  const products = await prisma.product.findMany({
    where: { adegaId },
    select: { id: true, name: true, unit: true, costPrice: true },
    orderBy: { name: "asc" },
  });
  const grouped = await prisma.movement.groupBy({
    by: ["productId"],
    where: { adegaId, type: "OUT", createdAt: { gte: from, lte: to }, pedido: { cancelledAt: null } },
    _sum: { quantity: true, totalValue: true },
  });
  const groupedMap = new Map(grouped.map((g) => [g.productId, g]));

  const porProduto = products
    .map((p) => {
      const g = groupedMap.get(p.id);
      const volumeVendido = g?._sum.quantity ?? 0;
      const faturamento = g?._sum.totalValue?.toNumber() ?? 0;
      const custoTotal = volumeVendido * p.costPrice.toNumber();
      const lucroBruto = faturamento - custoTotal;
      return {
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        volumeVendido,
        faturamento,
        custoTotal,
        lucroBruto,
        margemPercent: faturamento > 0 ? Number(((lucroBruto / faturamento) * 100).toFixed(1)) : null,
      };
    })
    .filter((i) => i.volumeVendido > 0)
    .sort((a, b) => b.lucroBruto - a.lucroBruto);

  const faturamento = porProduto.reduce((sum, i) => sum + i.faturamento, 0);
  const custoTotal = porProduto.reduce((sum, i) => sum + i.custoTotal, 0);
  const lucroBruto = faturamento - custoTotal;

  return {
    resumo: {
      faturamento,
      custoTotal,
      lucroBruto,
      margemPercent: faturamento > 0 ? Number(((lucroBruto / faturamento) * 100).toFixed(1)) : null,
    },
    porProduto,
  };
}

export interface SugestaoCompraItem {
  productId: string;
  productName: string;
  unit: string;
  currentStock: number;
  consumoMedioDiario: number;
  diasDeEstoqueRestante: number | null;
  quantidadeSugerida: number;
}

/** Consumo médio diário baseado nas saídas dos últimos 30 dias e sugestão de reposição
 * para cobrir os próximos 30 dias de demanda média, descontando o estoque atual. */
export async function getSugestaoCompra(adegaId: string): Promise<SugestaoCompraItem[]> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const products = await prisma.product.findMany({ where: { adegaId }, orderBy: { name: "asc" } });

  const consumption = await prisma.movement.groupBy({
    by: ["productId"],
    where: { adegaId, type: "OUT", createdAt: { gte: since }, pedido: { cancelledAt: null } },
    _sum: { quantity: true },
  });
  const consumptionMap = new Map(consumption.map((c) => [c.productId, c._sum.quantity ?? 0]));

  return products.map((p) => {
    const total30d = consumptionMap.get(p.id) ?? 0;
    const consumoMedioDiario = total30d / 30;
    const diasDeEstoqueRestante = consumoMedioDiario > 0 ? p.currentStock / consumoMedioDiario : null;
    const demandaProximos30Dias = consumoMedioDiario * 30;
    const quantidadeSugerida = Math.max(0, Math.ceil(demandaProximos30Dias - p.currentStock));
    return {
      productId: p.id,
      productName: p.name,
      unit: p.unit,
      currentStock: p.currentStock,
      consumoMedioDiario: Number(consumoMedioDiario.toFixed(2)),
      diasDeEstoqueRestante: diasDeEstoqueRestante != null ? Number(diasDeEstoqueRestante.toFixed(1)) : null,
      quantidadeSugerida,
    };
  });
}

export interface RecorrenciaItem {
  productId: string;
  productName: string;
  unit: string;
  numeroSaidas: number;
  volumeTotal: number;
}

/** Ranking de produtos por número de movimentações de saída (frequência), não apenas volume. */
export async function getRankingRecorrencia(adegaId: string, from: Date, to: Date): Promise<RecorrenciaItem[]> {
  const grouped = await prisma.movement.groupBy({
    by: ["productId"],
    where: { adegaId, type: "OUT", createdAt: { gte: from, lte: to }, pedido: { cancelledAt: null } },
    _count: { _all: true },
    _sum: { quantity: true },
  });
  if (grouped.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((g) => g.productId) } },
    select: { id: true, name: true, unit: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  return grouped
    .map((g) => {
      const p = productMap.get(g.productId);
      return {
        productId: g.productId,
        productName: p?.name ?? "",
        unit: p?.unit ?? "",
        numeroSaidas: g._count._all,
        volumeTotal: g._sum.quantity ?? 0,
      };
    })
    .sort((a, b) => b.numeroSaidas - a.numeroSaidas)
    .slice(0, 20);
}

export type Periodo = "dia" | "semana" | "mes" | "customizado";

export function resolvePeriodo(periodo: Periodo, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  if (periodo === "customizado" && customFrom && customTo) {
    const from = new Date(customFrom + "T00:00:00");
    const toCustom = new Date(customTo + "T23:59:59");
    return { from, to: toCustom };
  }

  const from = new Date(now);
  if (periodo === "dia") {
    from.setHours(0, 0, 0, 0);
  } else if (periodo === "semana") {
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else {
    // mes: mês corrente
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}
