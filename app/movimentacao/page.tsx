import { getEffectivePermissions, requireUser } from "@/lib/auth";
import { listPedidos } from "@/lib/repo";
import { getCurrentFilialId } from "@/lib/filial-context";
import MovimentacoesToggle from "@/components/MovimentacoesToggle";
import PageHeader from "@/components/PageHeader";
import { redactPedidosValues } from "@/lib/financial-data";

export default async function MovimentacaoPage() {
  const user = await requireUser();
  const permissions = await getEffectivePermissions(user);
  const filialId = await getCurrentFilialId(user);
  const [saidas, entradas] = await Promise.all([listPedidos(filialId, { type: "OUT", limit: 50 }), listPedidos(filialId, { type: "IN", limit: 50 })]);
  const visibleSaidas = permissions.VIEW_REPORTS ? saidas : redactPedidosValues(saidas);
  const visibleEntradas = permissions.VIEW_COSTS_MARGIN ? entradas : redactPedidosValues(entradas);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Rastreabilidade" title="Movimentações" description="Consulte o histórico completo de saídas e entradas. Abra um registro para ver os itens." />
      <MovimentacoesToggle
        saidas={visibleSaidas}
        entradas={visibleEntradas}
        canManage={permissions.CANCEL_ORDERS}
        canForceStock={permissions.FORCE_STOCK}
        canViewSaleValues={permissions.VIEW_REPORTS}
        canViewEntryValues={permissions.VIEW_COSTS_MARGIN}
      />
    </div>
  );
}
