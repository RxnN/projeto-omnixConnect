import type { EstoqueItem } from "@/lib/reports";
import { formatBRL } from "@/lib/format";

export default function EstoqueAtualTable({ items }: { items: EstoqueItem[] }) {
  const totalValor = items.reduce((acc, i) => acc + i.valorEmEstoque, 0);

  return (
    <div className="card overflow-x-auto p-0">
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ color: "var(--ink-soft)" }}>
            <th className="text-left px-4 py-2 font-semibold uppercase text-xs tracking-wide">Produto</th>
            <th className="text-left px-4 py-2 font-semibold uppercase text-xs tracking-wide">Categoria</th>
            <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Quantidade</th>
            <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Valor em estoque (custo)</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
          {items.map((i) => (
            <tr key={i.id}>
              <td className="px-4 py-2 font-medium">{i.name}</td>
              <td className="px-4 py-2" style={{ color: "var(--ink-soft)" }}>
                {i.category}
              </td>
              <td className="px-4 py-2 text-right tabular">
                <span style={i.minStockAlert != null && i.currentStock <= i.minStockAlert ? { color: "var(--warn)", fontWeight: 600 } : undefined}>
                  {i.currentStock} {i.unit}
                </span>
              </td>
              <td className="px-4 py-2 text-right tabular">{formatBRL(i.valorEmEstoque)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold" style={{ backgroundColor: "var(--surface-2)" }}>
            <td className="px-4 py-2" colSpan={3}>
              Total em estoque (valor de custo)
            </td>
            <td className="px-4 py-2 text-right tabular">{formatBRL(totalValor)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
