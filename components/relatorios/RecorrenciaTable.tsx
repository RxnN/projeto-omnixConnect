import type { RecorrenciaItem } from "@/lib/reports";

export default function RecorrenciaTable({ items }: { items: RecorrenciaItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
        Sem dados de saída no período selecionado.
      </p>
    );
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ color: "var(--ink-soft)" }}>
            <th className="text-left px-4 py-2 font-semibold uppercase text-xs tracking-wide">#</th>
            <th className="text-left px-4 py-2 font-semibold uppercase text-xs tracking-wide">Produto</th>
            <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Nº de saídas registradas</th>
            <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Volume total vendido</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
          {items.map((i, idx) => (
            <tr key={i.productId}>
              <td className="px-4 py-2 tabular" style={{ color: "var(--ink-soft)" }}>
                {idx + 1}
              </td>
              <td className="px-4 py-2 font-medium">{i.productName}</td>
              <td className="px-4 py-2 text-right font-semibold tabular" style={{ color: "var(--accent)" }}>
                {i.numeroSaidas}
              </td>
              <td className="px-4 py-2 text-right tabular">
                {i.volumeTotal} {i.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
