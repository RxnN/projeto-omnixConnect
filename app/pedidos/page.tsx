import { requireUser, canCancelPedidos } from "@/lib/auth";
import { listProducts, listPedidos, listPromotionsByFilial } from "@/lib/repo";
import { getCurrentFilialId } from "@/lib/filial-context";
import PedidoForm from "@/components/PedidoForm";
import HistoricoPedidos from "@/components/HistoricoPedidos";

export default async function PedidosPage() {
  const user = await requireUser();
  const filialId = await getCurrentFilialId(user);
  const [products, pedidos, promotions] = await Promise.all([
    listProducts(filialId, { activeOnly: true }),
    listPedidos(filialId, { type: "OUT", limit: 20 }),
    listPromotionsByFilial(filialId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          Monte pedidos de venda com múltiplos produtos e feche tudo de uma vez.
        </p>
      </div>

      <PedidoForm products={products} type="OUT" userRole={user.role} promotions={promotions} />

      <div>
        <h2 className="text-lg font-semibold mb-3">Últimos pedidos</h2>
        <HistoricoPedidos pedidos={pedidos} canManage={canCancelPedidos(user.role)} />
      </div>
    </div>
  );
}
