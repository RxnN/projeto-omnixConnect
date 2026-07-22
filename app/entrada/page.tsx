import { requireUser, canCancelPedidos } from "@/lib/auth";
import { listProducts, listPedidos } from "@/lib/repo";
import { getCurrentFilialId } from "@/lib/filial-context";
import PedidoForm from "@/components/PedidoForm";
import HistoricoPedidos from "@/components/HistoricoPedidos";

export default async function EntradaPage() {
  const user = await requireUser();
  const filialId = await getCurrentFilialId(user);
  const [products, pedidos] = await Promise.all([
    listProducts(filialId, { activeOnly: true }),
    listPedidos(filialId, { type: "IN", limit: 20 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Entrada</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          Registre a chegada de mercadoria com múltiplos produtos de uma vez (ex: carga do fornecedor).
        </p>
      </div>

      <PedidoForm products={products} type="IN" userRole={user.role} />

      <div>
        <h2 className="text-lg font-semibold mb-3">Últimas entradas</h2>
        <HistoricoPedidos pedidos={pedidos} canManage={canCancelPedidos(user.role)} />
      </div>
    </div>
  );
}
