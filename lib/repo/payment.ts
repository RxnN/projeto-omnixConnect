import { prisma } from "../prisma";
import type { EntryPayment, PaymentMethod } from "../types";

function toEntryPayment(value: {
  id: string;
  number: number;
  totalValue: { toNumber(): number };
  paymentMethod: string | null;
  boletoDueDays: number | null;
  paymentDueAt: Date | null;
  paymentPaidAt: Date | null;
  createdAt: Date;
  invoiceNumber: string | null;
  supplier: { name: string } | null;
  _count: { items: number };
}): EntryPayment {
  return {
    id: value.id,
    number: value.number,
    totalValue: value.totalValue.toNumber(),
    paymentMethod: value.paymentMethod as PaymentMethod | null,
    boletoDueDays: value.boletoDueDays,
    paymentDueAt: value.paymentDueAt?.toISOString() ?? null,
    paymentPaidAt: value.paymentPaidAt?.toISOString() ?? null,
    createdAt: value.createdAt.toISOString(),
    invoiceNumber: value.invoiceNumber,
    supplierName: value.supplier?.name ?? null,
    itemCount: value._count.items,
  };
}

export async function listEntryPayments(filialId: string): Promise<EntryPayment[]> {
  const recentPaidCutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const values = await prisma.pedido.findMany({
    where: {
      filialId,
      type: "IN",
      cancelledAt: null,
      OR: [{ paymentPaidAt: null }, { paymentPaidAt: { gte: recentPaidCutoff } }],
    },
    select: {
      id: true,
      number: true,
      totalValue: true,
      paymentMethod: true,
      boletoDueDays: true,
      paymentDueAt: true,
      paymentPaidAt: true,
      createdAt: true,
      invoiceNumber: true,
      supplier: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: [{ paymentPaidAt: "asc" }, { paymentDueAt: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  return values.map(toEntryPayment);
}

export async function setEntryPaymentPaid(
  id: string,
  filialId: string,
  paid: boolean
): Promise<EntryPayment | undefined> {
  const existing = await prisma.pedido.findFirst({
    where: { id, filialId, type: "IN", paymentMethod: "BOLETO", cancelledAt: null },
    select: { id: true },
  });
  if (!existing) return undefined;
  await prisma.pedido.update({ where: { id }, data: { paymentPaidAt: paid ? new Date() : null } });
  const value = await prisma.pedido.findFirst({
    where: { id, filialId },
    select: {
      id: true, number: true, totalValue: true, paymentMethod: true, boletoDueDays: true,
      paymentDueAt: true, paymentPaidAt: true, createdAt: true, invoiceNumber: true,
      supplier: { select: { name: true } }, _count: { select: { items: true } },
    },
  });
  return value ? toEntryPayment(value) : undefined;
}
