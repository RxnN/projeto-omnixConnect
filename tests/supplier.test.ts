import { describe, expect, it } from "vitest";
import { createPedido, createSupplier, getSupplierById, listSuppliers, setSupplierActive } from "@/lib/repo";
import { runWithDatabaseContext } from "@/lib/prisma";
import { seedFixture, seedProduct } from "./helpers";

const supplierData = {
  name: "Distribuidora Central",
  cnpjCpf: null,
  contactName: "Marina",
  email: "compras@distribuidora.test",
  phone: "11999999999",
  notes: "Entrega às terças",
};

describe("fornecedores e compras", () => {
  it("cadastra, lista e inativa um fornecedor sem apagar o histórico", async () => {
    const { empresa } = await seedFixture();
    const supplier = await createSupplier(empresa.id, supplierData);

    expect((await listSuppliers(empresa.id)).map((item) => item.id)).toContain(supplier.id);
    expect((await setSupplierActive(supplier.id, empresa.id, false))?.active).toBe(false);
    expect((await getSupplierById(supplier.id, empresa.id))?.name).toBe(supplierData.name);
  });

  it("não permite consultar fornecedor de outra empresa", async () => {
    const first = await seedFixture();
    const supplier = await createSupplier(first.empresa.id, supplierData);
    const second = await seedFixture();

    const foreign = await runWithDatabaseContext("tenant", second.empresa.id, () =>
      getSupplierById(supplier.id, second.empresa.id)
    );

    expect(foreign).toBeUndefined();
  });

  it("vincula fornecedor e nota fiscal à entrada de estoque", async () => {
    const { empresa, filial, user } = await seedFixture();
    const supplier = await createSupplier(empresa.id, supplierData);
    const product = await seedProduct(filial, { currentStock: 0, costPrice: 12 });

    const entry = await createPedido({
      empresaId: empresa.id,
      filialId: filial.id,
      type: "IN",
      createdByUserId: user.id,
      paymentMethod: "BOLETO",
      boletoDueDays: 28,
      supplierId: supplier.id,
      invoiceNumber: "NF-2048",
      items: [{ productId: product.id, quantity: 5, unitValue: 12, source: "MANUAL" }],
    });

    expect(entry).toMatchObject({ supplierId: supplier.id, supplierName: supplier.name, invoiceNumber: "NF-2048" });
  });
});
