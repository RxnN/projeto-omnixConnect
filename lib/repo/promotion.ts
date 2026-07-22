import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { createId } from "../id";
import type { Promotion } from "../types";
import { toIso } from "./shared";

function toPromotion(p: {
  id: string;
  adegaId: string;
  filialId: string;
  productId: string;
  promoPrice: Prisma.Decimal;
  startDate: Date | null;
  endDate: Date | null;
  minQuantity: number | null;
  createdAt: Date;
  createdByUserId: string;
}): Promotion {
  return {
    ...p,
    promoPrice: p.promoPrice.toNumber(),
    startDate: p.startDate ? toIso(p.startDate) : null,
    endDate: p.endDate ? toIso(p.endDate) : null,
    createdAt: toIso(p.createdAt),
  };
}

/** Todas as promoções da filial (passadas, ativas e futuras) — a tela de gestão decide
 * como agrupar/exibir; o cálculo de "está ativa agora" fica em lib/pricing.ts. */
export async function listPromotionsByFilial(filialId: string): Promise<Promotion[]> {
  const promotions = await prisma.promotion.findMany({
    where: { filialId },
    orderBy: { createdAt: "desc" },
  });
  return promotions.map(toPromotion);
}

/** Busca as promoções de vários produtos de uma vez (evita 1 query por item ao montar
 * um pedido com o carrinho inteiro). */
export async function listPromotionsByProductIds(filialId: string, productIds: string[]): Promise<Promotion[]> {
  if (productIds.length === 0) return [];
  const promotions = await prisma.promotion.findMany({
    where: { filialId, productId: { in: productIds } },
  });
  return promotions.map(toPromotion);
}

export async function createPromotion(input: {
  adegaId: string;
  filialId: string;
  productId: string;
  promoPrice: number;
  startDate: Date | null;
  endDate: Date | null;
  minQuantity: number | null;
  createdByUserId: string;
}): Promise<Promotion> {
  const promotion = await prisma.promotion.create({
    data: {
      id: createId("promo"),
      adegaId: input.adegaId,
      filialId: input.filialId,
      productId: input.productId,
      promoPrice: input.promoPrice,
      startDate: input.startDate,
      endDate: input.endDate,
      minQuantity: input.minQuantity,
      createdByUserId: input.createdByUserId,
    },
  });
  return toPromotion(promotion);
}

/** Retorna true se apagou; false se a promoção não existe (ou é de outra filial —
 * nunca deixa apagar coisa de fora). */
export async function deletePromotion(id: string, filialId: string): Promise<boolean> {
  const existing = await prisma.promotion.findFirst({ where: { id, filialId }, select: { id: true } });
  if (!existing) return false;
  await prisma.promotion.delete({ where: { id } });
  return true;
}
