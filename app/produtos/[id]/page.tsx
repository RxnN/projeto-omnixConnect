import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, canManageProducts } from "@/lib/auth";
import { getProductById, listPromotionsByProductIds } from "@/lib/repo";
import { getCurrentFilialId } from "@/lib/filial-context";
import ProductActiveToggle from "@/components/ProductActiveToggle";
import { formatBRL, formatDateShort } from "@/lib/format";
import { hasActivePromotionInPeriod } from "@/lib/pricing";

export default async function ProdutoDetalhePage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const filialId = await getCurrentFilialId(user);
  const product = await getProductById(params.id, filialId);
  if (!product) notFound();

  const promotions = await listPromotionsByProductIds(filialId, [product.id]);
  const emPromocao = hasActivePromotionInPeriod(promotions, product.id);
  const canManage = canManageProducts(user.role);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            {!product.active && <span className="pill pill-muted">Inativo</span>}
            {emPromocao && <span className="pill pill-ok">🏷 Promoção</span>}
          </div>
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            {product.category}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/produtos" className="btn-secondary">
            Voltar
          </Link>
          {canManage && (
            <>
              <Link href={`/produtos/${product.id}/editar`} className="btn-secondary">
                Editar
              </Link>
              <ProductActiveToggle productId={product.id} productName={product.name} active={product.active} />
            </>
          )}
        </div>
      </div>

      <div className="card space-y-3 max-w-md">
        <h2 className="font-semibold">Dados do produto</h2>
        <dl className="text-sm space-y-2">
          <div className="flex justify-between">
            <dt style={{ color: "var(--ink-soft)" }}>Unidade</dt>
            <dd>{product.unit}</dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: "var(--ink-soft)" }}>Estoque atual</dt>
            <dd className="font-medium tabular text-right">
              {product.currentStock} {product.unit}
              {product.packageType && product.unitsPerPackage && (
                <span className="block text-xs font-normal" style={{ color: "var(--ink-soft)" }}>
                  ≈ {Math.floor(product.currentStock / product.unitsPerPackage)} {product.packageType} +{" "}
                  {product.currentStock % product.unitsPerPackage} un
                </span>
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: "var(--ink-soft)" }}>Entra como</dt>
            <dd>
              {product.packageType
                ? `${product.packageType === "CX" ? "Caixa" : "Pacote"} (${product.unitsPerPackage} un)`
                : "Somente unidade"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: "var(--ink-soft)" }}>Preço de custo</dt>
            <dd className="tabular">{formatBRL(product.costPrice)}</dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: "var(--ink-soft)" }}>Preço de venda</dt>
            <dd className="tabular">{formatBRL(product.salePrice)}</dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: "var(--ink-soft)" }}>Alerta de estoque mínimo</dt>
            <dd className="tabular">{product.minStockAlert != null ? `${product.minStockAlert} ${product.unit}` : "-"}</dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: "var(--ink-soft)" }}>Código</dt>
            <dd className="font-mono text-xs tabular">{product.code}</dd>
          </div>
        </dl>
      </div>

      {promotions.length > 0 && (
        <div className="card space-y-3 max-w-md">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Promoções deste produto</h2>
            {canManage && (
              <Link href="/promocoes" className="text-xs font-medium hover:underline" style={{ color: "var(--accent)" }}>
                Gerenciar
              </Link>
            )}
          </div>
          <ul className="text-sm space-y-2">
            {promotions.map((promo) => (
              <li key={promo.id} className="flex justify-between gap-2">
                <span style={{ color: "var(--ink-soft)" }}>
                  {promo.minQuantity ? `a partir de ${promo.minQuantity} un.` : "qualquer quantidade"}
                  {promo.startDate ? ` · de ${formatDateShort(new Date(promo.startDate))}` : ""}
                  {promo.endDate ? ` até ${formatDateShort(new Date(promo.endDate))}` : ""}
                </span>
                <span className="font-medium tabular shrink-0">{formatBRL(promo.promoPrice)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
