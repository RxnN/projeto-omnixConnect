"use client";

import { useState } from "react";
import type { PedidoWithItems } from "@/lib/types";
import HistoricoPedidos from "./HistoricoPedidos";

export default function MovimentacoesToggle({
  saidas,
  entradas,
  canManage = false,
}: {
  saidas: PedidoWithItems[];
  entradas: PedidoWithItems[];
  canManage?: boolean;
}) {
  const [tab, setTab] = useState<"OUT" | "IN">("OUT");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("OUT")}
          className={tab === "OUT" ? "btn-primary" : "btn-secondary"}
        >
          Saída
        </button>
        <button type="button" onClick={() => setTab("IN")} className={tab === "IN" ? "btn-primary" : "btn-secondary"}>
          Entrada
        </button>
      </div>

      <HistoricoPedidos pedidos={tab === "OUT" ? saidas : entradas} canManage={canManage} />
    </div>
  );
}
