import { describe, expect, it } from "vitest";
import { createFilial, createPromotion, listPromotionsByProductIds } from "@/lib/repo";
import { getEffectivePrice, hasActivePromotionInPeriod, isPromotionActive } from "@/lib/pricing";
import type { Promotion } from "@/lib/types";
import { seedFixture, seedProduct } from "./helpers";

function makePromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: "promo_test",
    adegaId: "adega_test",
    filialId: "filial_test",
    productId: "prod_test",
    promoPrice: 15,
    startDate: null,
    endDate: null,
    minQuantity: null,
    createdAt: new Date().toISOString(),
    createdByUserId: "user_test",
    ...overrides,
  };
}

describe("getEffectivePrice (cálculo puro, sem banco)", () => {
  it("sem promoção nenhuma, usa o preço de tabela", () => {
    expect(getEffectivePrice(20, [], 1)).toBe(20);
  });

  it("promoção sem data nem quantidade mínima vale sempre", () => {
    const promo = makePromotion({ promoPrice: 15 });
    expect(getEffectivePrice(20, [promo], 1)).toBe(15);
  });

  it("promoção com período: só vale dentro da janela de datas", () => {
    const now = new Date("2026-07-15T12:00:00Z");
    const promo = makePromotion({
      promoPrice: 15,
      startDate: "2026-07-01T00:00:00Z",
      endDate: "2026-07-31T23:59:59Z",
    });
    expect(getEffectivePrice(20, [promo], 1, now)).toBe(15);
    expect(getEffectivePrice(20, [promo], 1, new Date("2026-06-30T00:00:00Z"))).toBe(20);
    expect(getEffectivePrice(20, [promo], 1, new Date("2026-08-01T00:00:00Z"))).toBe(20);
  });

  it("promoção por quantidade mínima: só vale a partir do limiar", () => {
    const promo = makePromotion({ promoPrice: 15, minQuantity: 6 });
    expect(getEffectivePrice(20, [promo], 5)).toBe(20);
    expect(getEffectivePrice(20, [promo], 6)).toBe(15);
    expect(getEffectivePrice(20, [promo], 100)).toBe(15);
  });

  it("período e quantidade mínima combinados exigem os dois", () => {
    const now = new Date("2026-07-15T12:00:00Z");
    const promo = makePromotion({
      promoPrice: 15,
      startDate: "2026-07-01T00:00:00Z",
      endDate: "2026-07-31T23:59:59Z",
      minQuantity: 6,
    });
    expect(getEffectivePrice(20, [promo], 3, now)).toBe(20);
    expect(getEffectivePrice(20, [promo], 6, new Date("2026-08-01T00:00:00Z"))).toBe(20);
    expect(getEffectivePrice(20, [promo], 6, now)).toBe(15);
  });

  it("entre várias promoções ativas, vale a de menor preço", () => {
    const a = makePromotion({ id: "a", promoPrice: 18 });
    const b = makePromotion({ id: "b", promoPrice: 12 });
    expect(getEffectivePrice(20, [a, b], 1)).toBe(12);
  });

  it("nunca fica acima do preço de tabela mesmo com promoção mal configurada", () => {
    const promo = makePromotion({ promoPrice: 25 });
    expect(getEffectivePrice(20, [promo], 1)).toBe(20);
  });
});

describe("hasActivePromotionInPeriod (selo do catálogo, ignora quantidade mínima)", () => {
  it("promoção por quantidade mínima ainda conta como 'em promoção' no catálogo", () => {
    const promo = makePromotion({ productId: "p1", minQuantity: 50 });
    expect(hasActivePromotionInPeriod([promo], "p1")).toBe(true);
  });

  it("fora do período não conta", () => {
    const promo = makePromotion({ productId: "p1", endDate: "2020-01-01T00:00:00Z" });
    expect(hasActivePromotionInPeriod([promo], "p1")).toBe(false);
  });

  it("promoção de outro produto não conta", () => {
    const promo = makePromotion({ productId: "outro" });
    expect(hasActivePromotionInPeriod([promo], "p1")).toBe(false);
  });
});

describe("isPromotionActive", () => {
  it("promoção agendada (início no futuro) ainda não está ativa", () => {
    const promo = makePromotion({ startDate: "2099-01-01T00:00:00Z" });
    expect(isPromotionActive(promo, 1)).toBe(false);
  });
});

describe("promoções são isoladas por filial (integração)", () => {
  it("promoção criada numa filial não aparece pra um produto equivalente de outra filial", async () => {
    const { adega, filial: filialA, user } = await seedFixture();
    const filialB = await createFilial(adega.id, "Filial B");
    const productA = await seedProduct(filialA, { salePrice: 20 });
    const productB = await seedProduct(filialB, { salePrice: 20 });

    await createPromotion({
      adegaId: adega.id,
      filialId: filialA.id,
      productId: productA.id,
      promoPrice: 10,
      startDate: null,
      endDate: null,
      minQuantity: null,
      createdByUserId: user.id,
    });

    const promosFilialA = await listPromotionsByProductIds(filialA.id, [productA.id]);
    const promosFilialB = await listPromotionsByProductIds(filialB.id, [productB.id]);

    expect(promosFilialA).toHaveLength(1);
    expect(promosFilialB).toHaveLength(0);
  });
});
