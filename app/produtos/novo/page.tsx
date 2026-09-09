import { getEffectivePermissions, requirePermission } from "@/lib/auth";
import ProductForm from "@/components/ProductForm";

export default async function NovoProdutoPage() {
  const user = await requirePermission("MANAGE_PRODUCTS");
  const permissions = await getEffectivePermissions(user);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo produto</h1>
      <ProductForm canViewCosts={permissions.VIEW_COSTS_MARGIN} />
    </div>
  );
}
