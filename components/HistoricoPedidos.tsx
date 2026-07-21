"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import type { PedidoWithItems } from "@/lib/types";
import { formatBRL, formatDateTime } from "@/lib/format";

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
}: {
  pedidos: PedidoWithItems[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<Record<string, { message: string; blockers: CancelBlocker[] }>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (pedidos.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
        Nenhum pedido registrado ainda.
      </p>
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
    <div className="card overflow-x-auto p-0">
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ color: "var(--ink-soft)" }}>
            <th className="text-left px-4 py-2 w-8"></th>
            <th className="text-left px-4 py-2 font-semibold uppercase text-xs tracking-wide">Pedido</th>
            <th className="text-left px-4 py-2 font-semibold uppercase text-xs tracking-wide">Data</th>
            <th className="text-left px-4 py-2 font-semibold uppercase text-xs tracking-wide">Itens</th>
            <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Total</th>
            <th className="text-left px-4 py-2 font-semibold uppercase text-xs tracking-wide">Usuário</th>
            {canManage && <th className="px-4 py-2"></th>}
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
                  className="cursor-pointer"
                  style={isCancelled ? { opacity: 0.6 } : undefined}
                  onClick={() => toggle(pedido.id)}
                >
                  <td className="px-4 py-2" style={{ color: "var(--ink-soft)" }}>
                    {isOpen ? "▾" : "▸"}
                  </td>
                  <td className="px-4 py-2 font-medium tabular">
                    #{pedido.number}
                    {isCancelled && <span className="pill pill-danger ml-2">Cancelado</span>}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap tabular">{formatDateTime(pedido.createdAt)}</td>
                  <td className="px-4 py-2" style={{ color: "var(--ink-soft)" }}>
                    {pedido.items.length} produto(s) · {qtdItens} un.
                  </td>
                  <td
                    className="px-4 py-2 text-right font-medium tabular"
                    style={isCancelled ? { textDecoration: "line-through" } : undefined}
                  >
                    {formatBRL(pedido.totalValue)}
                  </td>
                  <td className="px-4 py-2 text-xs" style={{ color: "var(--ink-soft)" }}>
                    {pedido.createdByName}
                  </td>
                  {canManage && (
                    <td className="px-4 py-2 text-right">
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
                    <td colSpan={canManage ? 6 : 5} className="px-4 pb-3">
                      {isCancelled && (
                        <p className="text-xs mb-2" style={{ color: "var(--danger)" }}>
                          Cancelado em {formatDateTime(pedido.cancelledAt as string)} por {pedido.cancelledByName}.
                        </p>
                      )}
                      <table className="min-w-full text-xs rounded-md overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                        <thead style={{ color: "var(--ink-soft)" }}>
                          <tr>
                            <th className="text-left px-3 py-1.5">Produto</th>
                            <th className="text-right px-3 py-1.5">Qtde</th>
                            <th className="text-right px-3 py-1.5">Valor unit.</th>
                            <th className="text-right px-3 py-1.5">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                          {pedido.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-1.5">{item.productName}</td>
                              <td className="px-3 py-1.5 text-right tabular">
                                {item.quantity} {item.productUnit}
                              </td>
                              <td className="px-3 py-1.5 text-right tabular">{formatBRL(item.unitValue)}</td>
                              <td className="px-3 py-1.5 text-right font-medium tabular">{formatBRL(item.totalValue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {error && (
                        <p className="text-xs mt-2" style={{ color: "var(--danger)" }}>
                          {error}
                        </p>
                      )}
                      {warning && (
                        <div className="rounded-md p-2 mt-2 space-y-1" style={{ backgroundColor: "var(--warn-soft)" }}>
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
  );
}
