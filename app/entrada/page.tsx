import { getEffectivePermissions, requirePermission } from "@/lib/auth";
import { listProducts, listPedidos } from "@/lib/repo";
import { getCurrentFilialId } from "@/lib/filial-context";
import PedidoForm from "@/components/PedidoForm";
import HistoricoPedidos from "@/components/HistoricoPedidos";
import PageHeader from "@/components/PageHeader";
import { redactPedidosValues } from "@/lib/financial-data";

export default async function EntradaPage() {
  const user = await requirePermission("REGISTER_ENTRIES");
  const permissions = await getEffectivePermissions(user);
  const filialId = await getCurrentFilialId(user);
  const [products, pedidos] = await Promise.all([listProducts(filialId, { activeOnly: true }), listPedidos(filialId, { type: "IN", limit: 20 })]);
  const orderProducts = permissions.VIEW_COSTS_MARGIN
    ? products
    : products.map(({ costPrice: _costPrice, ...product }) => product);
  const visiblePedidos = permissions.VIEW_COSTS_MARGIN ? pedidos : redactPedidosValues(pedidos);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Abastecimento" title="Entrada" description="Registre a chegada de mercadorias com múltiplos produtos de uma vez." />
      <PedidoForm products={orderProducts} type="IN" canEditPrice={true} canForceStock={false} />
      <section className="space-y-4 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="section-heading"><h2>Últimas entradas</h2></div>
        <HistoricoPedidos
          pedidos={visiblePedidos}
          canManage={permissions.CANCEL_ORDERS}
          canForceStock={permissions.FORCE_STOCK}
          showValues={permissions.VIEW_COSTS_MARGIN}
        />
      </section>
    </div>
  );
}
