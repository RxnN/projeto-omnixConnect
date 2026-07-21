import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { createId } from "../id";
import type { MovementSource, MovementType, PedidoItem, PedidoWithItems } from "../types";
import { toIso } from "./shared";
import { nextCounter } from "./counter";

async function nextPedidoNumber(adegaId: string, type: MovementType): Promise<number> {
  return nextCounter(adegaId, `pedido:${type}`);
}

export interface PedidoItemInput {
  productId: string;
  quantity: number;
  unitValue: number;
  source: MovementSource;
}

/** Verifica quais itens de um pedido de saída excedem o estoque atual (para aviso antes de forçar o fechamento).
 * Não se aplica a pedidos de entrada, que sempre aumentam o estoque. */
export async function checkPedidoStock(
  adegaId: string,
  items: { productId: string; quantity: number }[]
): Promise<{ productId: string; productName: string; unit: string; available: number; requested: number }[]> {
  const products = await prisma.product.findMany({
    where: { adegaId, id: { in: items.map((i) => i.productId) } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const insufficient: { productId: string; productName: string; unit: string; available: number; requested: number }[] =
    [];
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (product && product.currentStock - item.quantity < 0) {
      insufficient.push({
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        available: product.currentStock,
        requested: item.quantity,
      });
    }
  }
  return insufficient;
}

/** Fecha um pedido (entrada ou saída): cria o registro de Pedido, uma Movement por item e
 * ajusta o estoque de cada produto, tudo em uma única transação (tudo ou nada). */
export async function createPedido(input: {
  adegaId: string;
  type: MovementType;
  createdByUserId: string;
  items: PedidoItemInput[];
}): Promise<PedidoWithItems> {
  const pedidoId = createId("pedido");
  const number = await nextPedidoNumber(input.adegaId, input.type);
  const totalValue = input.items.reduce((sum, it) => sum + it.quantity * it.unitValue, 0);
  const stockSign = input.type === "IN" ? 1 : -1;

  await prisma.$transaction(async (tx) => {
    await tx.pedido.create({
      data: {
        id: pedidoId,
        adegaId: input.adegaId,
        type: input.type,
        number,
        totalValue,
        createdByUserId: input.createdByUserId,
      },
    });

    for (const item of input.items) {
      const itemTotal = item.quantity * item.unitValue;
      await tx.movement.create({
        data: {
          id: createId("mov"),
          adegaId: input.adegaId,
          productId: item.productId,
          type: input.type,
          quantity: item.quantity,
          unitValue: item.unitValue,
          totalValue: itemTotal,
          createdByUserId: input.createdByUserId,
          source: item.source,
          pedidoId,
        },
      });
      await tx.product.updateMany({
        where: { id: item.productId, adegaId: input.adegaId },
        data: { currentStock: { increment: stockSign * item.quantity } },
      });
    }
  });

  return (await getPedidoById(pedidoId, input.adegaId))!;
}

async function attachPedidoItems(pedido: {
  id: string;
  adegaId: string;
  type: string;
  number: number;
  totalValue: Prisma.Decimal;
  createdAt: Date;
  createdByUserId: string;
  cancelledAt: Date | null;
  cancelledByUserId: string | null;
  createdByUser: { name: string };
  cancelledByUser: { name: string } | null;
}): Promise<PedidoWithItems> {
  const movements = await prisma.movement.findMany({
    where: { pedidoId: pedido.id },
    orderBy: { createdAt: "asc" },
    include: { product: { select: { name: true, unit: true } } },
  });
  const items: PedidoItem[] = movements.map((m) => ({
    id: m.id,
    productId: m.productId,
    productName: m.product.name,
    productUnit: m.product.unit,
    quantity: m.quantity,
    unitValue: m.unitValue.toNumber(),
    totalValue: m.totalValue.toNumber(),
  }));

  return {
    id: pedido.id,
    adegaId: pedido.adegaId,
    type: pedido.type as MovementType,
    number: pedido.number,
    totalValue: pedido.totalValue.toNumber(),
    createdAt: toIso(pedido.createdAt),
    createdByUserId: pedido.createdByUserId,
    cancelledAt: pedido.cancelledAt ? toIso(pedido.cancelledAt) : null,
    cancelledByUserId: pedido.cancelledByUserId,
    createdByName: pedido.createdByUser.name,
    cancelledByName: pedido.cancelledByUser?.name ?? null,
    items,
  };
}

export async function getPedidoById(id: string, adegaId: string): Promise<PedidoWithItems | undefined> {
  const pedido = await prisma.pedido.findFirst({
    where: { id, adegaId },
    include: { createdByUser: { select: { name: true } }, cancelledByUser: { select: { name: true } } },
  });
  return pedido ? attachPedidoItems(pedido) : undefined;
}

export async function listPedidos(
  adegaId: string,
  opts: { type?: MovementType; from?: Date; to?: Date; limit?: number } = {}
): Promise<PedidoWithItems[]> {
  const pedidos = await prisma.pedido.findMany({
    where: {
      adegaId,
      ...(opts.type ? { type: opts.type } : {}),
      ...(opts.from || opts.to
        ? { createdAt: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } }
        : {}),
    },
    include: { createdByUser: { select: { name: true } }, cancelledByUser: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    ...(opts.limit ? { take: opts.limit } : {}),
  });
  if (pedidos.length === 0) return [];

  // Busca os itens de todos os pedidos numa única query (evita N+1 — antes era uma
  // query de Movement por pedido, aqui vira 1 query pra qualquer quantidade de pedidos).
  const movements = await prisma.movement.findMany({
    where: { pedidoId: { in: pedidos.map((p) => p.id) } },
    orderBy: { createdAt: "asc" },
    include: { product: { select: { name: true, unit: true } } },
  });
  const itemsByPedido = new Map<string, PedidoItem[]>();
  for (const m of movements) {
    if (!m.pedidoId) continue;
    const list = itemsByPedido.get(m.pedidoId) ?? [];
    list.push({
      id: m.id,
      productId: m.productId,
      productName: m.product.name,
      productUnit: m.product.unit,
      quantity: m.quantity,
      unitValue: m.unitValue.toNumber(),
      totalValue: m.totalValue.toNumber(),
    });
    itemsByPedido.set(m.pedidoId, list);
  }

  return pedidos.map((pedido) => ({
    id: pedido.id,
    adegaId: pedido.adegaId,
    type: pedido.type as MovementType,
    number: pedido.number,
    totalValue: pedido.totalValue.toNumber(),
    createdAt: toIso(pedido.createdAt),
    createdByUserId: pedido.createdByUserId,
    cancelledAt: pedido.cancelledAt ? toIso(pedido.cancelledAt) : null,
    cancelledByUserId: pedido.cancelledByUserId,
    createdByName: pedido.createdByUser.name,
    cancelledByName: pedido.cancelledByUser?.name ?? null,
    items: itemsByPedido.get(pedido.id) ?? [],
  }));
}

export interface PedidoCancelBlocker {
  productId: string;
  productName: string;
  unit: string;
  available: number;
  wouldBecome: number;
}

/** Verifica se cancelar um pedido de entrada deixaria algum produto com estoque negativo
 * (parte do que foi recebido já pode ter sido vendida). Não se aplica a pedidos de saída,
 * cujo cancelamento sempre devolve estoque. */
export async function checkPedidoCancelStock(pedido: PedidoWithItems): Promise<PedidoCancelBlocker[]> {
  if (pedido.type !== "IN") return [];
  const products = await prisma.product.findMany({
    where: { adegaId: pedido.adegaId, id: { in: pedido.items.map((i) => i.productId) } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const blockers: PedidoCancelBlocker[] = [];
  for (const item of pedido.items) {
    const product = productMap.get(item.productId);
    if (!product) continue;
    const wouldBecome = product.currentStock - item.quantity;
    if (wouldBecome < 0) {
      blockers.push({
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        available: product.currentStock,
        wouldBecome,
      });
    }
  }
  return blockers;
}

/** Cancela um pedido já fechado, revertendo o estoque de cada item numa única transação.
 * Os registros de Movement originais são mantidos para auditoria; o pedido fica marcado
 * como cancelado e passa a ser ignorado pelos relatórios (getFaturamento, etc). */
export async function cancelPedido(
  id: string,
  adegaId: string,
  cancelledByUserId: string
): Promise<PedidoWithItems | undefined> {
  const pedido = await getPedidoById(id, adegaId);
  if (!pedido || pedido.cancelledAt) return pedido;

  const stockSign = pedido.type === "IN" ? -1 : 1;

  await prisma.$transaction(async (tx) => {
    for (const item of pedido.items) {
      await tx.product.updateMany({
        where: { id: item.productId, adegaId },
        data: { currentStock: { increment: stockSign * item.quantity } },
      });
    }
    await tx.pedido.update({
      where: { id },
      data: { cancelledAt: new Date(), cancelledByUserId },
    });
  });

  return getPedidoById(id, adegaId);
}
