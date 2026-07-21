import type { FaturamentoPorProduto, FaturamentoResumo } from "@/lib/reports";
import { formatBRL, formatDateShort } from "@/lib/format";

export default function FaturamentoSection({
  resumo,
  porProduto,
  from,
  to,
}: {
  resumo: FaturamentoResumo;
  porProduto: FaturamentoPorProduto[];
  from: Date;
  to: Date;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
        Período: {formatDateShort(from)} até {formatDateShort(to)}
      </p>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="kpi">
          <p className="kpi-label">Faturamento</p>
          <p className="kpi-value text-2xl">{formatBRL(resumo.faturamento)}</p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Volume vendido</p>
          <p className="kpi-value text-2xl">{resumo.volumeVendido}</p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Nº de vendas (saídas)</p>
          <p className="kpi-value text-2xl">{resumo.numeroSaidas}</p>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ color: "var(--ink-soft)" }}>
              <th className="text-left px-4 py-2 font-semibold uppercase text-xs tracking-wide">Produto</th>
              <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Volume vendido</th>
              <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Faturamento</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
            {porProduto
              .filter((p) => p.volumeVendido > 0)
              .map((p) => (
                <tr key={p.productId}>
                  <td className="px-4 py-2 font-medium">{p.productName}</td>
                  <td className="px-4 py-2 text-right tabular">
                    {p.volumeVendido} {p.unit}
                  </td>
                  <td className="px-4 py-2 text-right tabular">{formatBRL(p.faturamento)}</td>
                </tr>
              ))}
            {porProduto.every((p) => p.volumeVendido === 0) && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center" style={{ color: "var(--ink-soft)" }}>
                  Nenhuma venda registrada neste período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
