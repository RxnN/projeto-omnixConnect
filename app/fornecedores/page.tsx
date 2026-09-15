import PageHeader from "@/components/PageHeader";
import SupplierManager from "@/components/SupplierManager";
import { requirePermission } from "@/lib/auth";
import { listSuppliers } from "@/lib/repo";

export default async function FornecedoresPage() {
  const user = await requirePermission("REGISTER_ENTRIES");
  const suppliers = await listSuppliers(user.empresaId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Abastecimento"
        title="Fornecedores"
        description="Cadastre os parceiros de compra e acompanhe a origem das entradas de estoque."
      />
      <SupplierManager suppliers={suppliers} />
    </div>
  );
}
