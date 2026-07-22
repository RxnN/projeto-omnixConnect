import type { Promotion } from "./types";

/** Preço de venda vigente pra um produto, considerando promoções ativas na filial.
 * Nunca é gravado permanentemente — sempre recalculado na hora (venda, exibição de
 * catálogo etc), então uma promoção "acaba" sozinha quando a data passa ou a quantidade
 * não bate mais, sem precisar de job pra reverter nada.
 *
 * Quando mais de uma promoção do produto está ativa ao mesmo tempo, vale a de menor
 * preço (a mais vantajosa pro cliente). */
export function getEffectivePrice(
  salePrice: number,
  promotions: Promotion[],
  quantity: number,
  at: Date = new Date()
): number {
  const active = promotions.filter((p) => isPromotionActive(p, quantity, at));
  if (active.length === 0) return salePrice;
  return Math.min(salePrice, ...active.map((p) => p.promoPrice));
}

export function isPromotionActive(promotion: Promotion, quantity: number, at: Date = new Date()): boolean {
  if (promotion.startDate && new Date(promotion.startDate) > at) return false;
  if (promotion.endDate && new Date(promotion.endDate) < at) return false;
  if (promotion.minQuantity && quantity < promotion.minQuantity) return false;
  return true;
}

/** Só considera o período (ignora quantidade mínima) — usado pra decidir se mostra o
 * selo "em promoção" no catálogo, onde ainda não sabemos quanto o cliente vai levar. */
export function hasActivePromotionInPeriod(promotions: Promotion[], productId: string, at: Date = new Date()): boolean {
  return promotions.some((p) => p.productId === productId && isPromotionActive(p, Number.MAX_SAFE_INTEGER, at));
}
