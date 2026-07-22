import { requireUser, canCancelPedidos } from "@/lib/auth";
import { listPedidos } from "@/lib/repo";
import { getCurrentFilialId } from "@/lib/filial-context";
import MovimentacoesToggle from "@/components/MovimentacoesToggle";

export default async function MovimentacaoPage() {
  const user = await requireUser();
  const filialId = await getCurrentFilialId(user);
  const [saidas, entradas] = await Promise.all([
    listPedidos(filialId, { type: "OUT", limit: 50 }),
    listPedidos(filialId, { type: "IN", limit: 50 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Movimentações</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          Consulte o histórico completo de pedidos de saída e entrada. Clique em um pedido para ver os itens.
        </p>
      </div>

      <MovimentacoesToggle saidas={saidas} entradas={entradas} canManage={canCancelPedidos(user.role)} />
    </div>
  );
}
