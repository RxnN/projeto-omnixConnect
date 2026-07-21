import type { SugestaoCompraItem } from "@/lib/reports";

export default function SugestaoCompraTable({ items }: { items: SugestaoCompraItem[] }) {
  return (
    <div className="card overflow-x-auto p-0">
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ color: "var(--ink-soft)" }}>
            <th className="text-left px-4 py-2 font-semibold uppercase text-xs tracking-wide">Produto</th>
            <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Estoque atual</th>
            <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Consumo médio/dia (30d)</th>
            <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Dias de estoque restante</th>
            <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Sugestão de compra</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
          {items.map((i) => (
            <tr key={i.productId}>
              <td className="px-4 py-2 font-medium">{i.productName}</td>
              <td className="px-4 py-2 text-right tabular">
                {i.currentStock} {i.unit}
              </td>
              <td className="px-4 py-2 text-right tabular">{i.consumoMedioDiario}</td>
              <td className="px-4 py-2 text-right tabular">
                {i.diasDeEstoqueRestante != null ? (
                  <span style={i.diasDeEstoqueRestante <= 7 ? { color: "var(--danger)", fontWeight: 600 } : undefined}>
                    {i.diasDeEstoqueRestante} dias
                  </span>
                ) : (
                  "sem consumo recente"
                )}
              </td>
              <td className="px-4 py-2 text-right tabular">
                {i.quantidadeSugerida > 0 ? (
                  <span className="font-semibold" style={{ color: "var(--accent)" }}>
                    {i.quantidadeSugerida} {i.unit}
                  </span>
                ) : (
                  <span style={{ color: "var(--ink-soft)" }}>-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
