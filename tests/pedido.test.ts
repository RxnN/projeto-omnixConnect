import { describe, expect, it } from "vitest";
import {
  cancelPedido,
  checkPedidoCancelStock,
  checkPedidoStock,
  createPedido,
  getProductById,
} from "@/lib/repo";
import { seedFixture, seedProduct } from "./helpers";

describe("createPedido", () => {
  it("saída (OUT) diminui o estoque e soma o total corretamente", async () => {
    const { adega, user } = await seedFixture();
    const product = await seedProduct(adega.id, { salePrice: 15, currentStock: 10 });

    const pedido = await createPedido({
      adegaId: adega.id,
      type: "OUT",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 4, unitValue: 15, source: "MANUAL" }],
    });

    expect(pedido.totalValue).toBe(60);
    expect(pedido.number).toBe(1);
    expect(pedido.type).toBe("OUT");

    const updated = (await getProductById(product.id, adega.id))!;
    expect(updated.currentStock).toBe(6);
  });

  it("entrada (IN) aumenta o estoque", async () => {
    const { adega, user } = await seedFixture();
    const product = await seedProduct(adega.id, { costPrice: 8, currentStock: 5 });

    await createPedido({
      adegaId: adega.id,
      type: "IN",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 20, unitValue: 8, source: "MANUAL" }],
    });

    const updated = (await getProductById(product.id, adega.id))!;
    expect(updated.currentStock).toBe(25);
  });

  it("numera pedidos de entrada e saída em sequências independentes", async () => {
    const { adega, user } = await seedFixture();
    const product = await seedProduct(adega.id, { currentStock: 100 });

    const out1 = await createPedido({
      adegaId: adega.id,
      type: "OUT",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 1, unitValue: 10, source: "MANUAL" }],
    });
    const in1 = await createPedido({
      adegaId: adega.id,
      type: "IN",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 1, unitValue: 10, source: "MANUAL" }],
    });
    const out2 = await createPedido({
      adegaId: adega.id,
      type: "OUT",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 1, unitValue: 10, source: "MANUAL" }],
    });

    expect(out1.number).toBe(1);
    expect(in1.number).toBe(1);
    expect(out2.number).toBe(2);
  });

  it("com múltiplos itens, ajusta o estoque de cada produto envolvido", async () => {
    const { adega, user } = await seedFixture();
    const a = await seedProduct(adega.id, { name: "A", currentStock: 10 });
    const b = await seedProduct(adega.id, { name: "B", currentStock: 10 });

    await createPedido({
      adegaId: adega.id,
      type: "OUT",
      createdByUserId: user.id,
      items: [
        { productId: a.id, quantity: 3, unitValue: 5, source: "MANUAL" },
        { productId: b.id, quantity: 7, unitValue: 5, source: "MANUAL" },
      ],
    });

    expect((await getProductById(a.id, adega.id))!.currentStock).toBe(7);
    expect((await getProductById(b.id, adega.id))!.currentStock).toBe(3);
  });
});

describe("checkPedidoStock", () => {
  it("aponta itens cuja quantidade pedida excede o estoque disponível", async () => {
    const { adega } = await seedFixture();
    const product = await seedProduct(adega.id, { currentStock: 5 });

    const insufficient = await checkPedidoStock(adega.id, [{ productId: product.id, quantity: 8 }]);

    expect(insufficient).toHaveLength(1);
    expect(insufficient[0]).toMatchObject({ productId: product.id, available: 5, requested: 8 });
  });

  it("não aponta nada quando o estoque é suficiente", async () => {
    const { adega } = await seedFixture();
    const product = await seedProduct(adega.id, { currentStock: 5 });

    const insufficient = await checkPedidoStock(adega.id, [{ productId: product.id, quantity: 5 }]);

    expect(insufficient).toHaveLength(0);
  });
});

describe("cancelPedido", () => {
  it("cancelar uma saída devolve o estoque", async () => {
    const { adega, user } = await seedFixture();
    const product = await seedProduct(adega.id, { currentStock: 10 });

    const pedido = await createPedido({
      adegaId: adega.id,
      type: "OUT",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 4, unitValue: 10, source: "MANUAL" }],
    });
    expect((await getProductById(product.id, adega.id))!.currentStock).toBe(6);

    const cancelled = await cancelPedido(pedido.id, adega.id, user.id);

    expect(cancelled?.cancelledAt).not.toBeNull();
    expect(cancelled?.cancelledByUserId).toBe(user.id);
    expect((await getProductById(product.id, adega.id))!.currentStock).toBe(10);
  });

  it("cancelar uma entrada remove o estoque que ela havia adicionado", async () => {
    const { adega, user } = await seedFixture();
    const product = await seedProduct(adega.id, { currentStock: 0 });

    const pedido = await createPedido({
      adegaId: adega.id,
      type: "IN",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 12, unitValue: 10, source: "MANUAL" }],
    });
    expect((await getProductById(product.id, adega.id))!.currentStock).toBe(12);

    await cancelPedido(pedido.id, adega.id, user.id);

    expect((await getProductById(product.id, adega.id))!.currentStock).toBe(0);
  });

  it("cancelar duas vezes não altera o estoque na segunda vez", async () => {
    const { adega, user } = await seedFixture();
    const product = await seedProduct(adega.id, { currentStock: 10 });

    const pedido = await createPedido({
      adegaId: adega.id,
      type: "OUT",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 4, unitValue: 10, source: "MANUAL" }],
    });

    await cancelPedido(pedido.id, adega.id, user.id);
    await cancelPedido(pedido.id, adega.id, user.id);

    expect((await getProductById(product.id, adega.id))!.currentStock).toBe(10);
  });
});

describe("checkPedidoCancelStock", () => {
  it("bloqueia cancelamento de entrada quando parte do estoque recebido já foi consumida", async () => {
    const { adega, user } = await seedFixture();
    const product = await seedProduct(adega.id, { currentStock: 0 });

    const entrada = await createPedido({
      adegaId: adega.id,
      type: "IN",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 10, unitValue: 10, source: "MANUAL" }],
    });
    await createPedido({
      adegaId: adega.id,
      type: "OUT",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 7, unitValue: 20, source: "MANUAL" }],
    });

    const blockers = await checkPedidoCancelStock(entrada);

    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatchObject({ productId: product.id, available: 3, wouldBecome: -7 });
  });

  it("não bloqueia cancelamento de saída (sempre devolve estoque, nunca fica negativo)", async () => {
    const { adega, user } = await seedFixture();
    const product = await seedProduct(adega.id, { currentStock: 10 });

    const saida = await createPedido({
      adegaId: adega.id,
      type: "OUT",
      createdByUserId: user.id,
      items: [{ productId: product.id, quantity: 4, unitValue: 10, source: "MANUAL" }],
    });

    expect(await checkPedidoCancelStock(saida)).toHaveLength(0);
  });
});
