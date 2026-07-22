import { describe, expect, it } from "vitest";
import { setProductActive } from "@/lib/repo";
import { seedFixture, seedProduct } from "./helpers";

describe("createProduct", () => {
  it("gera códigos sequenciais por filial, começando em 0001", async () => {
    const { filial } = await seedFixture();

    const p1 = await seedProduct(filial, { name: "Primeiro" });
    const p2 = await seedProduct(filial, { name: "Segundo" });
    const p3 = await seedProduct(filial, { name: "Terceiro" });

    expect(p1.code).toBe("0001");
    expect(p2.code).toBe("0002");
    expect(p3.code).toBe("0003");
  });

  it("cada filial tem sua própria sequência de código", async () => {
    const fixtureA = await seedFixture();
    const fixtureB = await seedFixture();

    const productA = await seedProduct(fixtureA.filial);
    const productB = await seedProduct(fixtureB.filial);

    expect(productA.code).toBe("0001");
    expect(productB.code).toBe("0001");
  });
});

describe("setProductActive", () => {
  it("produto nasce ativo por padrão", async () => {
    const { filial } = await seedFixture();
    const product = await seedProduct(filial);

    expect(product.active).toBe(true);
  });

  it("inativa e reativa um produto", async () => {
    const { filial } = await seedFixture();
    const product = await seedProduct(filial);

    const inactive = await setProductActive(product.id, filial.id, false);
    expect(inactive?.active).toBe(false);

    const active = await setProductActive(product.id, filial.id, true);
    expect(active?.active).toBe(true);
  });

  it("não altera produto de outra filial", async () => {
    const { filial } = await seedFixture();
    const other = await seedFixture();
    const product = await seedProduct(other.filial);

    expect(await setProductActive(product.id, filial.id, false)).toBeUndefined();
  });
});
