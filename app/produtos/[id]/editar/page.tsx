import { notFound } from "next/navigation";
import { getEffectivePermissions, requirePermission } from "@/lib/auth";
import { getProductById } from "@/lib/repo";
import { getCurrentFilialId } from "@/lib/filial-context";
import ProductForm from "@/components/ProductForm";

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("MANAGE_PRODUCTS");
  const permissions = await getEffectivePermissions(user);
  const filialId = await getCurrentFilialId(user);
  const product = await getProductById(id, filialId);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Editar produto</h1>
      <ProductForm
        product={permissions.VIEW_COSTS_MARGIN ? product : (({ costPrice: _costPrice, ...safe }) => safe)(product)}
        canViewCosts={permissions.VIEW_COSTS_MARGIN}
      />
    </div>
  );
}
