import { requireUser, canCancelPedidos } from "@/lib/auth";
import { listProducts, listPedidos } from "@/lib/repo";
import PedidoForm from "@/components/PedidoForm";
import HistoricoPedidos from "@/components/HistoricoPedidos";

export default async function PedidosPage() {
  const user = await requireUser();
  const [products, pedidos] = await Promise.all([
    listProducts(user.adegaId),
    listPedidos(user.adegaId, { type: "OUT", limit: 20 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          Monte pedidos de venda com múltiplos produtos e feche tudo de uma vez.
        </p>
      </div>

      <PedidoForm products={products} type="OUT" userRole={user.role} />

      <div>
        <h2 className="text-lg font-semibold mb-3">Últimos pedidos</h2>
        <HistoricoPedidos pedidos={pedidos} canManage={canCancelPedidos(user.role)} />
      </div>
    </div>
  );
}
