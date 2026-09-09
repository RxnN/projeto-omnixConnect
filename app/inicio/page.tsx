import Link from "next/link";
import { getEffectivePermissions, requireUser } from "@/lib/auth";
import { getCurrentFilialId } from "@/lib/filial-context";
import { formatBRL, formatDateTime } from "@/lib/format";
import { getFilialById, listPedidos, listProducts } from "@/lib/repo";
import PageHeader from "@/components/PageHeader";

const QUICK_ACTIONS = [
  {
    href: "/pedidos",
    title: "Novo pedido",
    description: "Registre uma nova saída de produtos.",
    icon: <path d="M3 4h2l1.6 9.6a2 2 0 0 0 2 1.7h7.1a2 2 0 0 0 2-1.6L19 8H6" />,
  },
  {
    href: "/entrada",
    title: "Registrar entrada",
    description: "Adicione mercadorias ao estoque.",
    icon: <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />,
  },
  {
    href: "/produtos",
    title: "Consultar estoque",
    description: "Veja produtos, preços e saldos.",
    icon: <path d="M4 7.5 12 4l8 3.5M4 7.5v9L12 20m0-12.5 8 3.5M12 7.5V20m8-9v9l-8 3.5" />,
  },
  {
    href: "/movimentacao",
    title: "Movimentações",
    description: "Acompanhe entradas e saídas.",
    icon: <path d="M4 6h16M4 12h16M4 18h10" />,
  },
];

export default async function InicioPage() {
  const user = await requireUser();
  const permissions = await getEffectivePermissions(user);
  const filialId = await getCurrentFilialId(user);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);

  const [filial, products, pedidosHoje, recentes] = await Promise.all([
    getFilialById(filialId, user.empresaId),
    listProducts(filialId, { activeOnly: true }),
    listPedidos(filialId, { from, to }),
    listPedidos(filialId, { limit: 6 }),
  ]);

  const pedidosValidos = pedidosHoje.filter((pedido) => !pedido.cancelledAt);
  const vendasHoje = pedidosValidos.filter((pedido) => pedido.type === "OUT");
  const entradasHoje = pedidosValidos.filter((pedido) => pedido.type === "IN");
  const faturamentoHoje = vendasHoje.reduce((total, pedido) => total + pedido.totalValue, 0);
  const valorEntradasHoje = entradasHoje.reduce((total, pedido) => total + pedido.totalValue, 0);
  const alertasEstoque = products.filter((product) =>
    product.minStockAlert != null ? product.currentStock <= product.minStockAlert : product.currentStock <= 0
  );

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Visão geral"
        title={`Olá, ${firstName}`}
        description={`Acompanhe o movimento de hoje em ${filial?.name ?? user.empresaName} e acesse rapidamente os módulos.`}
      />

      <section className="dashboard-kpi-grid" aria-label="Resumo de hoje">
        <article className="dashboard-kpi-card dashboard-kpi-primary">
          <span>Vendas de hoje</span>
          <strong>{permissions.VIEW_REPORTS ? formatBRL(faturamentoHoje) : vendasHoje.length}</strong>
          <small>{permissions.VIEW_REPORTS ? `${vendasHoje.length} ${vendasHoje.length === 1 ? "pedido concluído" : "pedidos concluídos"}` : "pedidos concluídos hoje"}</small>
        </article>
        <article className="dashboard-kpi-card">
          <span>Entradas de hoje</span>
          <strong>{permissions.VIEW_COSTS_MARGIN ? formatBRL(valorEntradasHoje) : entradasHoje.length}</strong>
          <small>{permissions.VIEW_COSTS_MARGIN ? `${entradasHoje.length} ${entradasHoje.length === 1 ? "entrada registrada" : "entradas registradas"}` : "entradas registradas hoje"}</small>
        </article>
        <article className="dashboard-kpi-card">
          <span>Produtos ativos</span>
          <strong>{products.length}</strong>
          <small>no catálogo desta filial</small>
        </article>
        <article className={`dashboard-kpi-card ${alertasEstoque.length > 0 ? "dashboard-kpi-warning" : ""}`}>
          <span>Alertas de estoque</span>
          <strong>{alertasEstoque.length}</strong>
          <small>{alertasEstoque.length > 0 ? "produtos precisam de atenção" : "estoque sem alertas"}</small>
        </article>
      </section>

      <section>
        <div className="section-heading">
          <h2>Acesso rápido</h2>
        </div>
        <div className="dashboard-actions-grid">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} className="dashboard-action-card">
              <span className="dashboard-action-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {action.icon}
                </svg>
              </span>
              <span>
                <strong>{action.title}</strong>
                <small>{action.description}</small>
              </span>
              <span className="dashboard-action-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <h2>Atividade recente</h2>
          <Link href="/movimentacao" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
            Ver todas
          </Link>
        </div>
        <div className="card dashboard-activity-card">
          {recentes.length === 0 ? (
            <div className="dashboard-empty-state">
              <strong>Nenhuma movimentação registrada</strong>
              <p>Os pedidos e as entradas mais recentes aparecerão aqui.</p>
            </div>
          ) : (
            <div className="dashboard-activity-list">
              {recentes.map((pedido) => (
                <div key={pedido.id} className="dashboard-activity-row">
                  <span className={`dashboard-activity-type ${pedido.type === "IN" ? "is-entry" : "is-sale"}`}>
                    {pedido.type === "IN" ? "E" : "P"}
                  </span>
                  <div className="dashboard-activity-main">
                    <strong>{pedido.type === "IN" ? "Entrada" : "Pedido"} #{pedido.number}</strong>
                    <small>{pedido.items.length} {pedido.items.length === 1 ? "item" : "itens"} · {formatDateTime(pedido.createdAt)}</small>
                  </div>
                  <div className="dashboard-activity-value">
                    {((pedido.type === "OUT" && permissions.VIEW_REPORTS) ||
                      (pedido.type === "IN" && permissions.VIEW_COSTS_MARGIN)) && <strong>{formatBRL(pedido.totalValue)}</strong>}
                    {pedido.cancelledAt && <small>Cancelado</small>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
