import Link from "next/link";
import { requireUser, canManageProducts } from "@/lib/auth";
import { getAdegaById, listProducts, listPromotionsByFilial } from "@/lib/repo";
import { getCurrentFilialId } from "@/lib/filial-context";
import ImportExportProducts from "@/components/ImportExportProducts";
import { formatBRL } from "@/lib/format";
import { hasActivePromotionInPeriod } from "@/lib/pricing";

function stockStatus(p: { currentStock: number; minStockAlert: number | null }) {
  if (p.currentStock <= 0) return { label: "Zerado", pill: "pill-danger" };
  if (p.minStockAlert != null && p.currentStock <= p.minStockAlert) return { label: "Baixo", pill: "pill-warn" };
  return { label: "OK", pill: "pill-ok" };
}

export default async function ProdutosPage() {
  const user = await requireUser();
  const filialId = await getCurrentFilialId(user);
  const [products, adega, promotions] = await Promise.all([
    listProducts(filialId),
    getAdegaById(user.adegaId),
    listPromotionsByFilial(filialId),
  ]);
  const canManage = canManageProducts(user.role);
  const importEnabled = Boolean(adega?.importEnabled);

  const totalEstoqueCusto = products.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0);
  const abaixoDoMinimo = products.filter(
    (p) => p.minStockAlert != null && p.currentStock <= p.minStockAlert
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
            {canManage
              ? "Cadastro e edição de produtos do estoque."
              : "Consulta de produtos cadastrados (somente leitura)."}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <ImportExportProducts canImport={canManage} importEnabled={importEnabled} />
          {canManage && (
            <Link href="/produtos/novo" className="btn-primary">
              + Novo produto
            </Link>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="kpi">
          <p className="kpi-label">Valor total em estoque (custo)</p>
          <p className="kpi-value">{formatBRL(totalEstoqueCusto)}</p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Produtos abaixo do mínimo</p>
          <p className="kpi-value">{abaixoDoMinimo}</p>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ color: "var(--ink-soft)" }}>
              <th className="text-left px-4 py-2 font-semibold uppercase text-xs tracking-wide">Código</th>
              <th className="text-left px-4 py-2 font-semibold uppercase text-xs tracking-wide">Nome</th>
              <th className="text-left px-4 py-2 font-semibold uppercase text-xs tracking-wide">Categoria</th>
              <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Estoque</th>
              <th className="text-left px-4 py-2 font-semibold uppercase text-xs tracking-wide">Status</th>
              <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Custo</th>
              <th className="text-right px-4 py-2 font-semibold uppercase text-xs tracking-wide">Venda</th>
              <th className="text-left px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
            {products.map((p) => {
              const status = stockStatus(p);
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2 tabular text-xs" style={{ color: "var(--ink-soft)" }}>
                    {p.code}
                  </td>
                  <td className="px-4 py-2 font-medium">
                    <span className="inline-flex items-center gap-2">
                      {p.name}
                      {!p.active && <span className="pill pill-muted">Inativo</span>}
                      {hasActivePromotionInPeriod(promotions, p.id) && (
                        <span className="pill pill-ok">🏷 Promoção</span>
                      )}
                    </span>
                    {p.packageType && (
                      <span className="block text-xs font-normal" style={{ color: "var(--ink-soft)" }}>
                        {p.packageType === "CX" ? "Caixa" : "Pacote"}: {p.unitsPerPackage} un
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2" style={{ color: "var(--ink-soft)" }}>
                    {p.category}
                  </td>
                  <td className="px-4 py-2 text-right tabular">
                    {p.currentStock} {p.unit}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`pill ${status.pill}`}>{status.label}</span>
                  </td>
                  <td className="px-4 py-2 text-right tabular">{formatBRL(p.costPrice)}</td>
                  <td className="px-4 py-2 text-right tabular">{formatBRL(p.salePrice)}</td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/produtos/${p.id}`} className="font-medium hover:underline" style={{ color: "var(--accent)" }}>
                      Ver
                    </Link>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center" style={{ color: "var(--ink-soft)" }}>
                  Nenhum produto cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
