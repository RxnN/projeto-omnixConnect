const DAY_MS = 24 * 60 * 60 * 1000;
const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

export type EntryPaymentStatus = "PAID" | "OVERDUE" | "DUE_TODAY" | "UPCOMING" | "PENDING";

/** Meia-noite de São Paulo expressa em UTC. O Brasil não usa horário de verão desde 2019. */
export function saoPauloDayStart(reference = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day"), 3));
}

export function calculateBoletoDueAt(days: number, reference = new Date()): Date {
  return new Date(saoPauloDayStart(reference).getTime() + days * DAY_MS);
}

export function entryPaymentStatus(
  payment: { paymentPaidAt: Date | string | null; paymentDueAt: Date | string | null },
  reference = new Date()
): EntryPaymentStatus {
  if (payment.paymentPaidAt) return "PAID";
  if (!payment.paymentDueAt) return "PENDING";
  const dueAt = new Date(payment.paymentDueAt).getTime();
  const today = saoPauloDayStart(reference).getTime();
  if (dueAt < today) return "OVERDUE";
  if (dueAt < today + DAY_MS) return "DUE_TODAY";
  return "UPCOMING";
}
