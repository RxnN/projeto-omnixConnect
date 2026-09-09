"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import type { PedidoWithItems } from "@/lib/types";
import { formatBRL, formatDateTime, formatPaymentMethod } from "@/lib/format";

interface CancelBlocker {
  productId: string;
  productName: string;
  unit: string;
  available: number;
  wouldBecome: number;
}

export default function HistoricoPedidos({
  pedidos,
  canManage = false,
  canForceStock = false,
  showValues = false,
}: {
  pedidos: PedidoWithItems[];
  canManage?: boolean;
  canForceStock?: boolean;
  showValues?: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<Record<string, { message: string; blockers: CancelBlocker[] }>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (pedidos.length === 0) {
    return (
      <div className="card text-center shadow-sm" style={{ padding: "2.5rem 1.5rem" }}>
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
          Nenhum pedido registrado ainda.
        </p>
      </div>
    );
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCancel(pedidoId: string, force = false) {
    if (!force && !confirm("Cancelar este pedido? O estoque será revertido.")) return;
    setCancelling(pedidoId);
    setErrors((prev) => ({ ...prev, [pedidoId]: "" }));
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();

      if (res.status === 409 && data.warning) {
        setWarnings((prev) => ({ ...prev, [pedidoId]: { message: data.warning, blockers: data.blockers ?? [] } }));
        return;
      }
      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [pedidoId]: data.error ?? "Não foi possível cancelar o pedido." }));
        return;
      }

      setWarnings((prev) => {
        const next = { ...prev };
        delete next[pedidoId];
        return next;
      });
      router.refresh();
    } catch {
      setErrors((prev) => ({ ...prev, [pedidoId]: "Erro de conexão. Tente novamente." }));
    } finally {
      setCancelling(null);
    }
  }

  return (
    <>
    <div className="card data-card overflow-x-auto hidden md:block">
      <table className="data-table">
        <thead>
          <tr style={{ color: "var(--ink-soft)", backgroundColor: "var(--surface-2)" }}>
            <th className="text-left px-5 py-3.5 w-8"></th>
            <th className="text-left px-5 py-3.5 font-semibold uppercase text-xs tracking-wide">Pedido</th>
            <th className="text-left px-5 py-3.5 font-semibold uppercase text-xs tracking-wide">Data</th>
            <th className="text-left px-5 py-3.5 font-semibold uppercase text-xs tracking-wide">Itens</th>
            {showValues && <th className="text-right px-5 py-3.5 font-semibold uppercase text-xs tracking-wide">Total</th>}
            <th className="text-left px-5 py-3.5 font-semibold uppercase text-xs tracking-wide">Pagamento</th>
            <th className="text-left px-5 py-3.5 font-semibold uppercase text-xs tracking-wide">Usuário</th>
            {canManage && <th className="px-5 py-3.5"></th>}
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
          {pedidos.map((pedido) => {
            const isOpen = expanded.has(pedido.id);
            const isCancelled = Boolean(pedido.cancelledAt);
            const qtdItens = pedido.items.reduce((sum, i) => sum + i.quantity, 0);
            const warning = warnings[pedido.id];
            const error = errors[pedido.id];
            return (
              <Fragment key={pedido.id}>
                <tr
                  className="cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
                  style={isCancelled ? { opacity: 0.6 } : undefined}
                  onClick={() => toggle(pedido.id)}
                >
                  <td className="px-5 py-3.5" style={{ color: "var(--ink-soft)" }}>
                    {isOpen ? "▾" : "▸"}
                  </td>
                  <td className="px-5 py-3.5 font-medium tabular">
                    #{pedido.number}
                    {isCancelled && <span className="pill pill-danger ml-2">Cancelado</span>}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap tabular">{formatDateTime(pedido.createdAt)}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--ink-soft)" }}>
                    {pedido.items.length} produto(s) · {qtdItens} un.
                  </td>
                  {showValues && (
                    <td
                      className="px-5 py-3.5 text-right font-medium tabular"
                      style={isCancelled ? { textDecoration: "line-through" } : undefined}
                    >
                      {formatBRL(pedido.totalValue)}
                    </td>
                  )}
                  <td className="px-5 py-3.5 text-xs" style={{ color: "var(--ink-soft)" }}>
                    {formatPaymentMethod(pedido.paymentMethod, pedido.boletoDueDays)}
                  </td>
                  <td className="px-5 py-3.5 text-xs" style={{ color: "var(--ink-soft)" }}>
                    {pedido.createdByName}
                  </td>
                  {canManage && (
                    <td className="px-5 py-3.5 text-right">
                      {!isCancelled && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(pedido.id);
                          }}
                          disabled={cancelling === pedido.id}
                          className="text-xs font-medium hover:underline"
                          style={{ color: "var(--danger)" }}
                        >
                          {cancelling === pedido.id ? "Cancelando..." : "Cancelar"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
                {isOpen && (
                  <tr>
                    <td></td>
                    <td colSpan={(canManage ? 6 : 5) + (showValues ? 1 : 0)} className="px-5 pb-4">
                      {isCancelled && (
                        <p className="text-xs mb-2.5" style={{ color: "var(--danger)" }}>
                          Cancelado em {formatDateTime(pedido.cancelledAt as string)} por {pedido.cancelledByName}.
                        </p>
                      )}
                      <table className="min-w-full text-xs rounded-lg overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                        <thead style={{ color: "var(--ink-soft)" }}>
                          <tr>
                            <th className="text-left px-4 py-2">Produto</th>
                            <th className="text-right px-4 py-2">Qtde</th>
                            {showValues && <th className="text-right px-4 py-2">Valor unit.</th>}
                            {showValues && <th className="text-right px-4 py-2">Subtotal</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                          {pedido.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-2">{item.productName}</td>
                              <td className="px-4 py-2 text-right tabular">
                                {item.quantity} {item.productUnit}
                              </td>
                              {showValues && <td className="px-4 py-2 text-right tabular">{formatBRL(item.unitValue)}</td>}
                              {showValues && <td className="px-4 py-2 text-right font-medium tabular">{formatBRL(item.totalValue)}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {error && (
                        <p className="text-xs mt-2.5" style={{ color: "var(--danger)" }}>
                          {error}
                        </p>
                      )}
                      {warning && canForceStock && (
                        <div className="rounded-lg p-3 mt-2.5 space-y-1.5" style={{ backgroundColor: "var(--warn-soft)" }}>
                          <p className="text-xs" style={{ color: "var(--warn)" }}>
                            {warning.message}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleCancel(pedido.id, true)}
                            className="btn-danger text-xs"
                            disabled={cancelling === pedido.id}
                          >
                            Confirmar cancelamento mesmo assim
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
    <div className="mobile-list">
      {pedidos.map((pedido) => {
        const isOpen = expanded.has(pedido.id);
        const isCancelled = Boolean(pedido.cancelledAt);
        const qtdItens = pedido.items.reduce((sum, item) => sum + item.quantity, 0);
        return (
          <article key={pedido.id} className="mobile-record" style={isCancelled ? { opacity: .65 } : undefined}>
            <button type="button" className="text-left" onClick={() => toggle(pedido.id)}>
              <div className="mobile-record-header">
                <div><p className="font-semibold tabular">Pedido #{pedido.number}</p><p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>{formatDateTime(pedido.createdAt)}</p></div>
                {isCancelled ? <span className="pill pill-danger">Cancelado</span> : <span className="pill pill-ok">Concluído</span>}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <div><p className="text-xs" style={{ color: "var(--ink-soft)" }}>Itens</p><p className="font-medium mt-1">{pedido.items.length} produtos · {qtdItens} un.</p></div>
                {showValues && <div className="text-right"><p className="text-xs" style={{ color: "var(--ink-soft)" }}>Total</p><p className="font-semibold tabular mt-1">{formatBRL(pedido.totalValue)}</p></div>}
              </div>
            </button>
            {isOpen && <div className="space-y-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              {pedido.items.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm"><span>{item.productName}<small className="block" style={{ color: "var(--ink-soft)" }}>{item.quantity} {item.productUnit}</small></span>{showValues && <strong className="tabular">{formatBRL(item.totalValue)}</strong>}</div>)}
            </div>}
            <div className="mobile-record-footer"><span className="text-xs" style={{ color: "var(--ink-soft)" }}>{formatPaymentMethod(pedido.paymentMethod, pedido.boletoDueDays)}</span>{canManage && !isCancelled && <button type="button" className="text-xs font-semibold" style={{ color: "var(--danger)" }} onClick={() => handleCancel(pedido.id)} disabled={cancelling === pedido.id}>Cancelar</button>}</div>
          </article>
        );
      })}
    </div>
    </>
  );
}
