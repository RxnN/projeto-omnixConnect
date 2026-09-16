"use client";

import { useEffect, useRef } from "react";
import type { PaymentMethod } from "@/lib/types";

interface InsufficientItemView {
  productId: string;
  productName: string;
  unit: string;
  available: number;
  requested: number;
}

/** Modal de forma de pagamento — puramente apresentacional. Recebe as opções já
 * resolvidas (PAYMENT_OPTIONS[type], calculado no PedidoForm) em vez de decidir
 * regras aqui; erros/avisos de fechamento também só são exibidos, nunca gerados. */
export default function PaymentDialog({
  open,
  isEntrada,
  options,
  paymentMethod,
  onPaymentMethodChange,
  boletoDueDays,
  onBoletoDueDaysChange,
  error,
  warning,
  insufficient,
  canForceStock,
  loading,
  onCancel,
  onConfirm,
  onForceConfirm,
}: {
  open: boolean;
  isEntrada: boolean;
  options: { value: PaymentMethod; label: string }[];
  paymentMethod: PaymentMethod | "";
  onPaymentMethodChange: (value: PaymentMethod | "") => void;
  boletoDueDays: string;
  onBoletoDueDaysChange: (value: string) => void;
  error: string | null;
  warning: string | null;
  insufficient: InsufficientItemView[];
  canForceStock: boolean;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onForceConfirm: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    panelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="fixed inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        aria-hidden="true"
        onClick={() => {
          if (!loading) onCancel();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-dialog-title"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl border p-6 space-y-5 focus:outline-none"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div>
          <span className="page-eyebrow">Finalizar pedido</span>
          <h2 id="payment-dialog-title" className="text-xl font-bold" style={{ color: "var(--ink)" }}>
            {isEntrada ? "Forma de pagamento da NF-e" : "Forma de pagamento"}
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
            {isEntrada ? "Informe como esta compra será paga." : "Selecione como este pedido foi pago."}
          </p>
        </div>

        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors"
              style={{
                borderColor: paymentMethod === opt.value ? "var(--accent)" : "var(--border)",
                backgroundColor: paymentMethod === opt.value ? "var(--surface-2)" : "transparent",
              }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={opt.value}
                checked={paymentMethod === opt.value}
                onChange={() => onPaymentMethodChange(opt.value)}
              />
              <span className="text-sm font-medium">{opt.label}</span>
            </label>
          ))}
        </div>

        {isEntrada && paymentMethod === "BOLETO" && (
          <div className="space-y-2">
            <label className="label" htmlFor="boleto-due-days">Prazo do boleto</label>
            <div className="flex flex-wrap gap-2">
              {[7, 14, 21, 28, 30, 45].map((days) => (
                <button key={days} type="button" className={boletoDueDays === String(days) ? "btn-primary" : "btn-secondary"} onClick={() => onBoletoDueDaysChange(String(days))}>{days} dias</button>
              ))}
            </div>
            <input
              id="boleto-due-days"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="input"
              placeholder="Outro prazo em dias"
              value={boletoDueDays}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "" || /^\d+$/.test(raw)) onBoletoDueDaysChange(raw);
              }}
            />
          </div>
        )}

        {error && (
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        {warning && (
          <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "var(--warn-soft)" }}>
            <p className="text-sm" style={{ color: "var(--warn)" }}>
              {warning}
            </p>
            {insufficient.length > 0 && (
              <ul className="text-xs list-disc list-inside" style={{ color: "var(--warn)" }}>
                {insufficient.map((i) => (
                  <li key={i.productId}>
                    {i.productName}: disponível {i.available} {i.unit}, pedido {i.requested} {i.unit}
                  </li>
                ))}
              </ul>
            )}
            {canForceStock && (
              <button type="button" onClick={onForceConfirm} className="btn-danger" disabled={loading}>
                Confirmar mesmo assim
              </button>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className="btn-primary flex-1">
            {loading ? "Fechando pedido..." : "Confirmar Pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
