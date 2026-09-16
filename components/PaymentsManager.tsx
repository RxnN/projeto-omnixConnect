"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL, formatDateTime, formatPaymentMethod } from "@/lib/format";
import { entryPaymentStatus, saoPauloDayStart, type EntryPaymentStatus } from "@/lib/payments";
import type { EntryPayment } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const STATUS_LABEL: Record<EntryPaymentStatus, string> = {
  PAID: "Pago",
  OVERDUE: "Atrasado",
  DUE_TODAY: "Vence hoje",
  UPCOMING: "A vencer",
  PENDING: "Pendente",
};
const STATUS_PILL: Record<EntryPaymentStatus, string> = {
  PAID: "pill-ok",
  OVERDUE: "pill-danger",
  DUE_TODAY: "pill-warn",
  UPCOMING: "pill-muted",
  PENDING: "pill-warn",
};

function formatDueDate(value: string | null) {
  if (!value) return "Sem vencimento";
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default function PaymentsManager({ payments }: { payments: EntryPayment[] }) {
  const router = useRouter();
  const [changingId, setChangingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = saoPauloDayStart();
  const nextWeek = new Date(today.getTime() + 8 * DAY_MS);
  const pending = payments.filter((payment) => !payment.paymentPaidAt);
  const paid = payments.filter((payment) => payment.paymentPaidAt);
  const overdue = pending.filter((payment) => entryPaymentStatus(payment) === "OVERDUE");
  const dueToday = pending.filter((payment) => entryPaymentStatus(payment) === "DUE_TODAY");
  const nextDays = pending.filter((payment) => {
    if (!payment.paymentDueAt) return false;
    const due = new Date(payment.paymentDueAt);
    return due > today && due < nextWeek;
  });
  const later = pending.filter((payment) => !overdue.includes(payment) && !dueToday.includes(payment) && !nextDays.includes(payment));
  const pendingTotal = pending.reduce((sum, payment) => sum + payment.totalValue, 0);

  async function setPaid(payment: EntryPayment, paidValue: boolean) {
    setChangingId(payment.id);
    setError(null);
    try {
      const response = await fetch(`/api/pagamentos/${payment.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: paidValue }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error ?? "Não foi possível atualizar o pagamento.");
      else router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setChangingId(null);
    }
  }

  function PaymentList({ title, description, values }: { title: string; description: string; values: EntryPayment[] }) {
    if (values.length === 0) return null;
    return (
      <section className="space-y-3">
        <div className="section-heading"><div><h2>{title}</h2><p>{description}</p></div><strong className="tabular text-sm">{formatBRL(values.reduce((sum, item) => sum + item.totalValue, 0))}</strong></div>
        <div className="payment-list">
          {values.map((payment) => {
            const status = entryPaymentStatus(payment);
            return (
              <article key={payment.id} className="card payment-row">
                <div className="payment-main"><div className="flex items-center gap-2 flex-wrap"><strong>Entrada #{payment.number}</strong><span className={`pill ${STATUS_PILL[status]}`}>{STATUS_LABEL[status]}</span></div><p>{payment.supplierName ?? "Fornecedor não vinculado"}{payment.invoiceNumber ? ` · NF ${payment.invoiceNumber}` : ""}</p><small>{payment.itemCount} {payment.itemCount === 1 ? "item" : "itens"} · registrada em {formatDateTime(payment.createdAt)}</small></div>
                <div className="payment-due"><span>{payment.paymentPaidAt ? "Pago em" : "Vencimento"}</span><strong>{formatDueDate(payment.paymentPaidAt ?? payment.paymentDueAt)}</strong><small>{formatPaymentMethod(payment.paymentMethod, payment.boletoDueDays)}</small></div>
                <div className="payment-value"><strong>{formatBRL(payment.totalValue)}</strong>{payment.paymentMethod === "BOLETO" && <button type="button" className={payment.paymentPaidAt ? "btn-secondary" : "btn-primary"} disabled={changingId === payment.id} onClick={() => setPaid(payment, !payment.paymentPaidAt)}>{changingId === payment.id ? "Salvando..." : payment.paymentPaidAt ? "Desfazer baixa" : "Marcar como pago"}</button>}</div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <section className="dashboard-kpi-grid">
        <article className={`dashboard-kpi-card ${overdue.length ? "dashboard-kpi-warning" : ""}`}><span>Em atraso</span><strong>{overdue.length}</strong><small>{formatBRL(overdue.reduce((sum, item) => sum + item.totalValue, 0))}</small></article>
        <article className={`dashboard-kpi-card ${dueToday.length ? "dashboard-kpi-warning" : ""}`}><span>Vencem hoje</span><strong>{dueToday.length}</strong><small>{formatBRL(dueToday.reduce((sum, item) => sum + item.totalValue, 0))}</small></article>
        <article className="dashboard-kpi-card"><span>Próximos 7 dias</span><strong>{nextDays.length}</strong><small>{formatBRL(nextDays.reduce((sum, item) => sum + item.totalValue, 0))}</small></article>
        <article className="dashboard-kpi-card dashboard-kpi-primary"><span>Total pendente</span><strong>{formatBRL(pendingTotal)}</strong><small>{pending.length} pagamento(s)</small></article>
      </section>
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      {payments.length === 0 && <div className="card text-center py-10"><strong>Nenhum pagamento registrado</strong><p className="text-sm mt-2" style={{ color: "var(--ink-soft)" }}>As próximas entradas aparecerão aqui automaticamente.</p></div>}
      <PaymentList title="Atrasados" description="Boletos que já passaram do vencimento." values={overdue} />
      <PaymentList title="Vencem hoje" description="Pagamentos que precisam de atenção hoje." values={dueToday} />
      <PaymentList title="Próximos 7 dias" description="Boletos com vencimento nos próximos dias." values={nextDays} />
      <PaymentList title="Outros pendentes" description="Contas com vencimento posterior ou sem data." values={later} />
      <PaymentList title="Pagamentos recentes" description="Compras quitadas nos últimos 60 dias." values={paid} />
    </div>
  );
}
