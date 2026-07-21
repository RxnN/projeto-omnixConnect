import { describe, expect, it } from "vitest";
import { isBarcodeTaken } from "@/lib/repo";
import { seedFixture, seedProduct } from "./helpers";

describe("createProduct", () => {
  it("gera códigos sequenciais por adega, começando em 0001", async () => {
    const { adega } = await seedFixture();

    const p1 = await seedProduct(adega.id, { name: "Primeiro" });
    const p2 = await seedProduct(adega.id, { name: "Segundo" });
    const p3 = await seedProduct(adega.id, { name: "Terceiro" });

    expect(p1.code).toBe("0001");
    expect(p2.code).toBe("0002");
    expect(p3.code).toBe("0003");
  });

  it("cada adega tem sua própria sequência de código", async () => {
    const fixtureA = await seedFixture();
    const fixtureB = await seedFixture();

    const productA = await seedProduct(fixtureA.adega.id);
    const productB = await seedProduct(fixtureB.adega.id);

    expect(productA.code).toBe("0001");
    expect(productB.code).toBe("0001");
  });
});

describe("isBarcodeTaken", () => {
  it("detecta código de barras já usado por outro produto na mesma adega", async () => {
    const { adega } = await seedFixture();
    await seedProduct(adega.id, { barcode: "7891234567895" });

    expect(await isBarcodeTaken("7891234567895", adega.id)).toBe(true);
    expect(await isBarcodeTaken("0000000000000", adega.id)).toBe(false);
  });

  it("ignora o próprio produto ao excluir por id (edição)", async () => {
    const { adega } = await seedFixture();
    const product = await seedProduct(adega.id, { barcode: "7891234567895" });

    expect(await isBarcodeTaken("7891234567895", adega.id, product.id)).toBe(false);
  });

  it("o mesmo código de barras pode existir em adegas diferentes", async () => {
    const fixtureA = await seedFixture();
    const fixtureB = await seedFixture();
    await seedProduct(fixtureA.adega.id, { barcode: "7891234567895" });

    expect(await isBarcodeTaken("7891234567895", fixtureB.adega.id)).toBe(false);
  });
});
