import type { RentabilidadeItem, RentabilidadeResumo } from "@/lib/reports";
import { formatBRL, formatDateShort } from "@/lib/format";

export default function RentabilidadeSection({
  resumo,
  porProduto,
  from,
  to,
}: {
  resumo: RentabilidadeResumo;
  porProduto: RentabilidadeItem[];
  from: Date;
  to: Date;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
        Período: {formatDateShort(from)} até {formatDateShort(to)}
      </p>
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="kpi">
          <p className="kpi-label">Faturamento</p>
          <p className="kpi-value text-2xl">{formatBRL(resumo.faturamento)}</p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Custo (CMV)</p>
          <p className="kpi-value text-2xl">{formatBRL(resumo.custoTotal)}</p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Lucro bruto</p>
          <p className="kpi-value text-2xl" style={resumo.lucroBruto < 0 ? { color: "var(--danger)" } : undefined}>
            {formatBRL(resumo.lucroBruto)}
          </p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Margem bruta</p>
          <p className="kpi-value text-2xl">{resumo.margemPercent != null ? `${resumo.margemPercent}%` : "-"}</p>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ color: "var(--ink-soft)" }}>
              <th className="text-left px-4 py-2 font-semibold uppercase text-xs tracking-wide">Produto</th>
              <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Volume vendido</th>
              <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Faturamento</th>
              <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Custo (CMV)</th>
              <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Lucro bruto</th>
              <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Margem</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
            {porProduto.map((p) => (
              <tr key={p.productId}>
                <td className="px-4 py-2 font-medium">{p.productName}</td>
                <td className="px-4 py-2 text-right tabular">
                  {p.volumeVendido} {p.unit}
                </td>
                <td className="px-4 py-2 text-right tabular">{formatBRL(p.faturamento)}</td>
                <td className="px-4 py-2 text-right tabular">{formatBRL(p.custoTotal)}</td>
                <td
                  className="px-4 py-2 text-right tabular font-medium"
                  style={p.lucroBruto < 0 ? { color: "var(--danger)" } : undefined}
                >
                  {formatBRL(p.lucroBruto)}
                </td>
                <td className="px-4 py-2 text-right tabular">
                  <span
                    className="pill"
                    style={
                      p.margemPercent == null
                        ? undefined
                        : p.margemPercent >= 30
                          ? { backgroundColor: "var(--ok-soft)", color: "var(--ok)" }
                          : p.margemPercent >= 10
                            ? { backgroundColor: "var(--warn-soft)", color: "var(--warn)" }
                            : { backgroundColor: "var(--danger-soft)", color: "var(--danger)" }
                    }
                  >
                    {p.margemPercent != null ? `${p.margemPercent}%` : "-"}
                  </span>
                </td>
              </tr>
            ))}
            {porProduto.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center" style={{ color: "var(--ink-soft)" }}>
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
