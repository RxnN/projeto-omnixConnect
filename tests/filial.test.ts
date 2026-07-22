import { describe, expect, it } from "vitest";
import { createFilial, createPedido, getFilialById, getProductById, listFiliais } from "@/lib/repo";
import { getEstoqueAtual, getFaturamento } from "@/lib/reports";
import { seedFixture, seedProduct } from "./helpers";

describe("createFilial / listFiliais", () => {
  it("toda adega nasce com a filial criada no seedFixture", async () => {
    const { adega, filial } = await seedFixture();

    const filiais = await listFiliais(adega.id);

    expect(filiais).toHaveLength(1);
    expect(filiais[0].id).toBe(filial.id);
  });

  it("criar uma segunda filial soma à lista da mesma adega", async () => {
    const { adega } = await seedFixture();

    const segunda = await createFilial(adega.id, "Filial Centro");
    const filiais = await listFiliais(adega.id);

    expect(filiais).toHaveLength(2);
    expect(filiais.map((f) => f.name)).toContain("Filial Centro");
    expect(segunda.adegaId).toBe(adega.id);
  });

  it("getFilialById não retorna filial de outra adega", async () => {
    const { filial } = await seedFixture();
    const other = await seedFixture();

    expect(await getFilialById(filial.id, other.adega.id)).toBeUndefined();
    expect(await getFilialById(filial.id, filial.adegaId)).toBeDefined();
  });
});

describe("isolamento de produtos entre filiais da mesma adega", () => {
  it("produto cadastrado numa filial não aparece na outra", async () => {
    const { adega, filial: filialA } = await seedFixture();
    const filialB = await createFilial(adega.id, "Filial B");

    const productA = await seedProduct(filialA, { name: "Só na A" });

    expect(await getProductById(productA.id, filialA.id)).toBeDefined();
    expect(await getProductById(productA.id, filialB.id)).toBeUndefined();
  });

  it("cada filial numera produtos independentemente, mesmo dentro da mesma adega", async () => {
    const { adega, filial: filialA } = await seedFixture();
    const filialB = await createFilial(adega.id, "Filial B");

    const productA = await seedProduct(filialA);
    const productB = await seedProduct(filialB);

    expect(productA.code).toBe("0001");
    expect(productB.code).toBe("0001");
  });
});

describe("relatórios: consolidado (toda a adega) vs filtrado por filial", () => {
  it("getEstoqueAtual sem filialId soma produtos de todas as filiais; com filialId, só uma", async () => {
    const { adega, filial: filialA } = await seedFixture();
    const filialB = await createFilial(adega.id, "Filial B");
    await seedProduct(filialA, { name: "Produto A" });
    await seedProduct(filialB, { name: "Produto B" });

    const consolidado = await getEstoqueAtual(adega.id);
    const soFilialA = await getEstoqueAtual(adega.id, filialA.id);
    const soFilialB = await getEstoqueAtual(adega.id, filialB.id);

    expect(consolidado).toHaveLength(2);
    expect(soFilialA).toHaveLength(1);
    expect(soFilialA[0].name).toBe("Produto A");
    expect(soFilialB).toHaveLength(1);
    expect(soFilialB[0].name).toBe("Produto B");
  });

  it("getFaturamento consolida as duas filiais, mas isola quando filtrado", async () => {
    const { adega, filial: filialA, user } = await seedFixture();
    const filialB = await createFilial(adega.id, "Filial B");
    const productA = await seedProduct(filialA, { salePrice: 100, currentStock: 10 });
    const productB = await seedProduct(filialB, { salePrice: 200, currentStock: 10 });
    const { from, to } = { from: new Date("2000-01-01"), to: new Date("2100-01-01") };

    await createPedido({
      adegaId: adega.id,
      filialId: filialA.id,
      type: "OUT",
      paymentMethod: "DINHEIRO",
      createdByUserId: user.id,
      items: [{ productId: productA.id, quantity: 1, unitValue: 100, source: "MANUAL" }],
    });
    await createPedido({
      adegaId: adega.id,
      filialId: filialB.id,
      type: "OUT",
      paymentMethod: "DINHEIRO",
      createdByUserId: user.id,
      items: [{ productId: productB.id, quantity: 1, unitValue: 200, source: "MANUAL" }],
    });

    const consolidado = await getFaturamento(adega.id, from, to);
    const soFilialA = await getFaturamento(adega.id, from, to, filialA.id);
    const soFilialB = await getFaturamento(adega.id, from, to, filialB.id);

    expect(consolidado.faturamento).toBe(300);
    expect(soFilialA.faturamento).toBe(100);
    expect(soFilialB.faturamento).toBe(200);
  });
});
