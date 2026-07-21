import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, canManageProducts } from "@/lib/auth";
import { getProductById } from "@/lib/repo";
import DeleteProductButton from "@/components/DeleteProductButton";
import BarcodeImage from "@/components/BarcodeImage";
import { formatBRL } from "@/lib/format";

export default async function ProdutoDetalhePage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const product = await getProductById(params.id, user.adegaId);
  if (!product) notFound();

  const canManage = canManageProducts(user.role);
  const barcodeValue = product.barcode ?? product.code;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
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
              <DeleteProductButton productId={product.id} productName={product.name} />
            </>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="card space-y-3">
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
            <div className="flex justify-between">
              <dt style={{ color: "var(--ink-soft)" }}>Código de barras</dt>
              <dd className="font-mono text-xs tabular">{product.barcode ?? "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="card space-y-3 text-center">
          <h2 className="font-semibold">Código de barras do produto</h2>
          <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
            {product.barcode
              ? "Código de barras cadastrado do produto (o mesmo que já vem na embalagem)."
              : "Nenhum código de barras cadastrado — gerado a partir do código interno do produto."}{" "}
            Use um leitor de código de barras para identificar o produto rapidamente nas telas de Pedidos e Entrada.
          </p>
          <BarcodeImage
            value={barcodeValue}
            fileName={`codigo-barras-${product.name.replace(/\s+/g, "-").toLowerCase()}.png`}
          />
        </div>
      </div>
    </div>
  );
}
