"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const OPCOES: { value: string; label: string }[] = [
  { value: "dia", label: "Hoje" },
  { value: "semana", label: "Últimos 7 dias" },
  { value: "mes", label: "Mês corrente" },
  { value: "customizado", label: "Período customizado" },
];

export default function PeriodoFilter({
  periodo,
  from,
  to,
}: {
  periodo: string;
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  function updatePeriodo(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("periodo", value);
    if (value !== "customizado") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`/relatorios?${params.toString()}`);
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("periodo", "customizado");
    params.set("from", customFrom);
    params.set("to", customTo);
    router.push(`/relatorios?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-full border p-1 gap-1" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
        {OPCOES.map((o) => (
          <button
            key={o.value}
            onClick={() => updatePeriodo(o.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
            style={
              periodo === o.value
                ? { backgroundColor: "var(--accent)", color: "var(--accent-ink)" }
                : { color: "var(--ink-soft)" }
            }
          >
            {o.label}
          </button>
        ))}
      </div>
      {periodo === "customizado" && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            className="input !w-auto"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
          <span className="text-sm" style={{ color: "var(--ink-soft)" }}>
            até
          </span>
          <input
            type="date"
            className="input !w-auto"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
          />
          <button onClick={applyCustom} className="btn-secondary">
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
