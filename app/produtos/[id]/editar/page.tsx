import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getProductById } from "@/lib/repo";
import { getCurrentFilialId } from "@/lib/filial-context";
import ProductForm from "@/components/ProductForm";

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("MANAGE_PRODUCTS");
  const filialId = await getCurrentFilialId(user);
  const product = await getProductById(id, filialId);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Editar produto</h1>
      <ProductForm product={product} />
    </div>
  );
}
