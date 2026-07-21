import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getProductById } from "@/lib/repo";
import ProductForm from "@/components/ProductForm";

export default async function EditarProdutoPage({ params }: { params: { id: string } }) {
  const user = await requireRole(["OWNER"]);
  const product = await getProductById(params.id, user.adegaId);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Editar produto</h1>
      <ProductForm product={product} />
    </div>
  );
}
