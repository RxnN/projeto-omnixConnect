import { getEffectivePermissions, requireUser } from "@/lib/auth";
import { listProducts, listPedidos, listPromotionsByFilial } from "@/lib/repo";
import { getCurrentFilialId } from "@/lib/filial-context";
import PedidoForm from "@/components/PedidoForm";
import HistoricoPedidos from "@/components/HistoricoPedidos";
import PageHeader from "@/components/PageHeader";

export default async function PedidosPage() {
  const user = await requireUser();
  const permissions = await getEffectivePermissions(user);
  const filialId = await getCurrentFilialId(user);
  const [products, pedidos, promotions] = await Promise.all([
    listProducts(filialId, { activeOnly: true }),
    listPedidos(filialId, { type: "OUT", limit: 20 }),
    listPromotionsByFilial(filialId),
  ]);
  const orderProducts = products.map(({ costPrice: _costPrice, ...product }) => product);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Operação de venda" title="Pedidos" description="Busque os produtos, adicione ao pedido e feche a venda." />
      <PedidoForm
        products={orderProducts}
        type="OUT"
        canEditPrice={permissions.EDIT_ORDER_PRICE}
        canForceStock={permissions.FORCE_STOCK}
        promotions={promotions}
      />
      <section className="space-y-4 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="section-heading"><h2>Últimos pedidos</h2></div>
        <HistoricoPedidos pedidos={pedidos} canManage={permissions.CANCEL_ORDERS} />
      </section>
    </div>
  );
}
