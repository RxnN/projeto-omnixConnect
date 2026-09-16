import PageHeader from "@/components/PageHeader";
import PaymentsManager from "@/components/PaymentsManager";
import { requirePermission } from "@/lib/auth";
import { getCurrentFilialId } from "@/lib/filial-context";
import { listEntryPayments } from "@/lib/repo";

export default async function PagamentosPage() {
  const user = await requirePermission("VIEW_COSTS_MARGIN");
  const filialId = await getCurrentFilialId(user);
  const payments = await listEntryPayments(filialId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Pagamentos"
        description="Acompanhe boletos de fornecedores, vencimentos e compras já quitadas nesta filial."
      />
      <PaymentsManager payments={payments} />
    </div>
  );
}
