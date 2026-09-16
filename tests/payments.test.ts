import { describe, expect, it } from "vitest";
import { calculateBoletoDueAt, entryPaymentStatus } from "@/lib/payments";
import { createPedido, listEntryPayments, setEntryPaymentPaid } from "@/lib/repo";
import { runWithDatabaseContext } from "@/lib/prisma";
import { seedFixture, seedProduct } from "./helpers";

describe("datas de contas a pagar", () => {
  it("calcula o vencimento em dias a partir da data comercial de São Paulo", () => {
    const reference = new Date("2026-09-16T15:00:00.000Z");
    expect(calculateBoletoDueAt(28, reference).toISOString()).toBe("2026-10-14T03:00:00.000Z");
  });

  it("separa pagamentos pagos, atrasados, de hoje e futuros", () => {
    const reference = new Date("2026-09-16T15:00:00.000Z");
    expect(entryPaymentStatus({ paymentPaidAt: reference, paymentDueAt: null }, reference)).toBe("PAID");
    expect(entryPaymentStatus({ paymentPaidAt: null, paymentDueAt: "2026-09-15T03:00:00.000Z" }, reference)).toBe("OVERDUE");
    expect(entryPaymentStatus({ paymentPaidAt: null, paymentDueAt: "2026-09-16T03:00:00.000Z" }, reference)).toBe("DUE_TODAY");
    expect(entryPaymentStatus({ paymentPaidAt: null, paymentDueAt: "2026-09-20T03:00:00.000Z" }, reference)).toBe("UPCOMING");
  });
});

describe("baixa de pagamentos de entrada", () => {
  it("cria boleto pendente e permite marcar como pago e desfazer a baixa", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { currentStock: 0, costPrice: 10 });
    const entry = await createPedido({
      empresaId: empresa.id,
      filialId: filial.id,
      type: "IN",
      createdByUserId: user.id,
      paymentMethod: "BOLETO",
      boletoDueDays: 30,
      items: [{ productId: product.id, quantity: 2, unitValue: 10, source: "MANUAL" }],
    });

    expect(entry.paymentDueAt).not.toBeNull();
    expect(entry.paymentPaidAt).toBeNull();
    expect((await listEntryPayments(filial.id)).some((payment) => payment.id === entry.id)).toBe(true);
    expect((await setEntryPaymentPaid(entry.id, filial.id, true))?.paymentPaidAt).not.toBeNull();
    expect((await setEntryPaymentPaid(entry.id, filial.id, false))?.paymentPaidAt).toBeNull();
  });

  it("considera dinheiro e Pix quitados no momento da entrada", async () => {
    const { empresa, filial, user } = await seedFixture();
    const product = await seedProduct(filial, { currentStock: 0 });
    const entry = await createPedido({
      empresaId: empresa.id,
      filialId: filial.id,
      type: "IN",
      createdByUserId: user.id,
      paymentMethod: "PIX",
      items: [{ productId: product.id, quantity: 1, unitValue: 10, source: "MANUAL" }],
    });
    expect(entry.paymentDueAt).toBeNull();
    expect(entry.paymentPaidAt).not.toBeNull();
  });

  it("não permite dar baixa em boleto de outra filial", async () => {
    const first = await seedFixture();
    const product = await seedProduct(first.filial, { currentStock: 0 });
    const entry = await createPedido({
      empresaId: first.empresa.id,
      filialId: first.filial.id,
      type: "IN",
      createdByUserId: first.user.id,
      paymentMethod: "BOLETO",
      boletoDueDays: 7,
      items: [{ productId: product.id, quantity: 1, unitValue: 10, source: "MANUAL" }],
    });
    const second = await seedFixture();

    const result = await runWithDatabaseContext("tenant", second.empresa.id, () =>
      setEntryPaymentPaid(entry.id, second.filial.id, true)
    );
    expect(result).toBeUndefined();
  });
});
