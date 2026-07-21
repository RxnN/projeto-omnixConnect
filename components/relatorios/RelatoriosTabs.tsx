"use client";

import { useState } from "react";
import type { EstoqueItem, FaturamentoPorProduto, FaturamentoResumo, RecorrenciaItem, RentabilidadeItem, RentabilidadeResumo, SugestaoCompraItem } from "@/lib/reports";
import EstoqueAtualTable from "./EstoqueAtualTable";
import RentabilidadeSection from "./RentabilidadeSection";
import FaturamentoSection from "./FaturamentoSection";
import SugestaoCompraTable from "./SugestaoCompraTable";
import RecorrenciaTable from "./RecorrenciaTable";
import PeriodoFilter from "./PeriodoFilter";

type TabKey = "estoque" | "rentabilidade" | "faturamento" | "sugestao" | "recorrencia";

export default function RelatoriosTabs({
  isOwner,
  estoque,
  rentabilidade,
  faturamentoResumo,
  faturamentoPorProduto,
  sugestaoCompra,
  ranking,
  from,
  to,
  periodo,
  searchFrom,
  searchTo,
}: {
  isOwner: boolean;
  estoque: EstoqueItem[];
  rentabilidade: { resumo: RentabilidadeResumo; porProduto: RentabilidadeItem[] } | null;
  faturamentoResumo: FaturamentoResumo;
  faturamentoPorProduto: FaturamentoPorProduto[];
  sugestaoCompra: SugestaoCompraItem[] | null;
  ranking: RecorrenciaItem[] | null;
  from: Date;
  to: Date;
  periodo: string;
  searchFrom?: string;
  searchTo?: string;
}) {
  const [tab, setTab] = useState<TabKey>("estoque");

  const tabs: { key: TabKey; label: string }[] = [{ key: "estoque", label: "Estoque" }];
  if (isOwner) tabs.push({ key: "rentabilidade", label: "Rentabilidade" });
  tabs.push({ key: "faturamento", label: isOwner ? "Faturamento e volume vendido" : "Faturamento (mês corrente)" });
  if (isOwner) {
    tabs.push({ key: "sugestao", label: "Sugestão de compra" });
    tabs.push({ key: "recorrencia", label: "Maior recorrência" });
  }

  const showPeriodoFilter = isOwner && (tab === "faturamento" || tab === "rentabilidade" || tab === "recorrencia");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-full border p-1 gap-1" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 rounded-full transition-colors"
              style={
                tab === t.key
                  ? { backgroundColor: "var(--accent)", color: "var(--accent-ink)" }
                  : { color: "var(--ink-soft)" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        {showPeriodoFilter && <PeriodoFilter periodo={periodo} from={searchFrom} to={searchTo} />}
      </div>

      {tab === "estoque" && (
        <section className="space-y-3">
          <EstoqueAtualTable items={estoque} />
        </section>
      )}

      {tab === "rentabilidade" && rentabilidade && (
        <section className="space-y-3">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Lucro bruto por produto: faturamento das vendas menos o custo (preço de custo atual x quantidade
            vendida) no período selecionado.
          </p>
          <RentabilidadeSection resumo={rentabilidade.resumo} porProduto={rentabilidade.porProduto} from={from} to={to} />
        </section>
      )}

      {tab === "faturamento" && (
        <section className="space-y-3">
          <FaturamentoSection resumo={faturamentoResumo} porProduto={faturamentoPorProduto} from={from} to={to} />
        </section>
      )}

      {tab === "sugestao" && sugestaoCompra && (
        <section className="space-y-3">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Baseado no consumo médio diário (saídas dos últimos 30 dias) comparado ao estoque atual. Sugestão
            cobre a demanda média dos próximos 30 dias.
          </p>
          <SugestaoCompraTable items={sugestaoCompra} />
        </section>
      )}

      {tab === "recorrencia" && ranking && (
        <section className="space-y-3">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Ranking por número de vezes que o produto saiu do estoque no período selecionado (frequência), não
            apenas pelo volume total.
          </p>
          <RecorrenciaTable items={ranking} />
        </section>
      )}
    </div>
  );
}
