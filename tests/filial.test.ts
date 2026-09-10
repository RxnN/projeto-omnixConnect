import { describe, expect, it } from "vitest";
import { createFilial, createPedido, getFilialById, getProductById, listFiliais } from "@/lib/repo";
import { getEstoqueAtual, getFaturamento } from "@/lib/reports";
import { runWithDatabaseContext } from "@/lib/prisma";
import { seedFixture, seedProduct } from "./helpers";

describe("createFilial / listFiliais", () => {
  it("toda empresa nasce com a filial criada no seedFixture", async () => {
    const { empresa, filial } = await seedFixture();

    const filiais = await listFiliais(empresa.id);

    expect(filiais).toHaveLength(1);
    expect(filiais[0].id).toBe(filial.id);
  });

  it("criar uma segunda filial soma à lista da mesma empresa", async () => {
    const { empresa } = await seedFixture();

    const segunda = await createFilial(empresa.id, "Filial Centro");
    const filiais = await listFiliais(empresa.id);

    expect(filiais).toHaveLength(2);
    expect(filiais.map((f) => f.name)).toContain("Filial Centro");
    expect(segunda.empresaId).toBe(empresa.id);
  });

  it("getFilialById não retorna filial de outra empresa", async () => {
    const { filial } = await seedFixture();
    const other = await seedFixture();

    expect(await getFilialById(filial.id, other.empresa.id)).toBeUndefined();
    expect(
      await runWithDatabaseContext("tenant", filial.empresaId, () =>
        getFilialById(filial.id, filial.empresaId),
      ),
    ).toBeDefined();
  });
});

describe("isolamento de produtos entre filiais da mesma empresa", () => {
  it("produto cadastrado numa filial não aparece na outra", async () => {
    const { empresa, filial: filialA } = await seedFixture();
    const filialB = await createFilial(empresa.id, "Filial B");

    const productA = await seedProduct(filialA, { name: "Só na A" });

    expect(await getProductById(productA.id, filialA.id)).toBeDefined();
    expect(await getProductById(productA.id, filialB.id)).toBeUndefined();
  });

  it("cada filial numera produtos independentemente, mesmo dentro da mesma empresa", async () => {
    const { empresa, filial: filialA } = await seedFixture();
    const filialB = await createFilial(empresa.id, "Filial B");

    const productA = await seedProduct(filialA);
    const productB = await seedProduct(filialB);

    expect(productA.code).toBe("0001");
    expect(productB.code).toBe("0001");
  });
});

describe("relatórios: consolidado (toda a empresa) vs filtrado por filial", () => {
  it("getEstoqueAtual sem filialId soma produtos de todas as filiais; com filialId, só uma", async () => {
    const { empresa, filial: filialA } = await seedFixture();
    const filialB = await createFilial(empresa.id, "Filial B");
    await seedProduct(filialA, { name: "Produto A" });
    await seedProduct(filialB, { name: "Produto B" });

    const consolidado = await getEstoqueAtual(empresa.id);
    const soFilialA = await getEstoqueAtual(empresa.id, filialA.id);
    const soFilialB = await getEstoqueAtual(empresa.id, filialB.id);

    expect(consolidado).toHaveLength(2);
    expect(soFilialA).toHaveLength(1);
    expect(soFilialA[0].name).toBe("Produto A");
    expect(soFilialB).toHaveLength(1);
    expect(soFilialB[0].name).toBe("Produto B");
  });

  it("getFaturamento consolida as duas filiais, mas isola quando filtrado", async () => {
    const { empresa, filial: filialA, user } = await seedFixture();
    const filialB = await createFilial(empresa.id, "Filial B");
    const productA = await seedProduct(filialA, { salePrice: 100, currentStock: 10 });
    const productB = await seedProduct(filialB, { salePrice: 200, currentStock: 10 });
    const { from, to } = { from: new Date("2000-01-01"), to: new Date("2100-01-01") };

    await createPedido({
      empresaId: empresa.id,
      filialId: filialA.id,
      type: "OUT",
      paymentMethod: "DINHEIRO",
      createdByUserId: user.id,
      items: [{ productId: productA.id, quantity: 1, unitValue: 100, source: "MANUAL" }],
    });
    await createPedido({
      empresaId: empresa.id,
      filialId: filialB.id,
      type: "OUT",
      paymentMethod: "DINHEIRO",
      createdByUserId: user.id,
      items: [{ productId: productB.id, quantity: 1, unitValue: 200, source: "MANUAL" }],
    });

    const consolidado = await getFaturamento(empresa.id, from, to);
    const soFilialA = await getFaturamento(empresa.id, from, to, filialA.id);
    const soFilialB = await getFaturamento(empresa.id, from, to, filialB.id);

    expect(consolidado.faturamento).toBe(300);
    expect(soFilialA.faturamento).toBe(100);
    expect(soFilialB.faturamento).toBe(200);
  });
});
