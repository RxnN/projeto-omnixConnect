import Link from "next/link";
import { getEffectivePermissions, requireUser } from "@/lib/auth";
import { getCurrentFilialId } from "@/lib/filial-context";
import { formatBRL, formatDateTime } from "@/lib/format";
import { getFilialById } from "@/lib/repo";
import { getDashboardOverview, type DashboardPeriod } from "@/lib/dashboard";
import PageHeader from "@/components/PageHeader";

const QUICK_ACTIONS = [
  { href: "/pedidos", title: "Novo pedido", description: "Registre uma nova saída de produtos.", permission: null, icon: <path d="M3 4h2l1.6 9.6a2 2 0 0 0 2 1.7h7.1a2 2 0 0 0 2-1.6L19 8H6" /> },
  { href: "/entrada", title: "Registrar entrada", description: "Adicione mercadorias ao estoque.", permission: "REGISTER_ENTRIES" as const, icon: <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" /> },
  { href: "/produtos", title: "Consultar estoque", description: "Veja produtos, preços e saldos.", permission: null, icon: <path d="M4 7.5 12 4l8 3.5M4 7.5v9L12 20m0-12.5 8 3.5M12 7.5V20m8-9v9l-8 3.5" /> },
  { href: "/movimentacao", title: "Movimentações", description: "Acompanhe entradas e saídas.", permission: null, icon: <path d="M4 6h16M4 12h16M4 18h10" /> },
];

function Trend({ period, comparison }: { period: DashboardPeriod; comparison: string }) {
  if (period.changePercent === null) return <small>Sem vendas em {comparison} para comparar</small>;
  const direction = period.changePercent > 0 ? "up" : period.changePercent < 0 ? "down" : "neutral";
  const signal = period.changePercent > 0 ? "+" : "";
  return <small className={`dashboard-trend is-${direction}`}>{signal}{period.changePercent.toLocaleString("pt-BR")}% em relação a {comparison}</small>;
}

export default async function InicioPage() {
  const user = await requireUser();
  const permissions = await getEffectivePermissions(user);
  const filialId = await getCurrentFilialId(user);
  const [filial, dashboard] = await Promise.all([
    getFilialById(filialId, user.empresaId),
    getDashboardOverview(user.empresaId, filialId, { includeProfitability: permissions.VIEW_COSTS_MARGIN }),
  ]);

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const maxDailySale = Math.max(...dashboard.dailySales.map((day) => day.total), 1);
  const quickActions = QUICK_ACTIONS.filter((action) => !action.permission || permissions[action.permission]);

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Visão geral" title={`Olá, ${firstName}`} description={`Veja o desempenho de ${filial?.name ?? user.empresaName} e o que precisa da sua atenção.`} />

      <section className="dashboard-kpi-grid" aria-label="Indicadores principais">
        <article className="dashboard-kpi-card dashboard-kpi-primary">
          <span>Vendas de hoje</span>
          <strong>{permissions.VIEW_REPORTS ? formatBRL(dashboard.today.total) : dashboard.today.orders}</strong>
          {permissions.VIEW_REPORTS ? <Trend period={dashboard.today} comparison="ontem" /> : <small>{dashboard.today.orders === 1 ? "pedido concluído" : "pedidos concluídos"}</small>}
        </article>
        <article className="dashboard-kpi-card">
          <span>Últimos 7 dias</span>
          <strong>{permissions.VIEW_REPORTS ? formatBRL(dashboard.lastSevenDays.total) : dashboard.lastSevenDays.orders}</strong>
          {permissions.VIEW_REPORTS ? <Trend period={dashboard.lastSevenDays} comparison="aos 7 dias anteriores" /> : <small>{dashboard.lastSevenDays.orders === 1 ? "pedido concluído" : "pedidos concluídos"}</small>}
        </article>
        <article className="dashboard-kpi-card">
          <span>Mês atual</span>
          <strong>{permissions.VIEW_REPORTS ? formatBRL(dashboard.currentMonth.total) : dashboard.currentMonth.orders}</strong>
          {permissions.VIEW_REPORTS ? <Trend period={dashboard.currentMonth} comparison="ao mês anterior" /> : <small>{dashboard.currentMonth.orders === 1 ? "pedido concluído" : "pedidos concluídos"}</small>}
        </article>
        {dashboard.profitability ? (
          <article className="dashboard-kpi-card">
            <span>Lucro bruto do mês</span>
            <strong>{formatBRL(dashboard.profitability.grossProfit)}</strong>
            <small>{dashboard.profitability.marginPercent == null ? "Ainda sem vendas no período" : `Margem estimada de ${dashboard.profitability.marginPercent.toLocaleString("pt-BR")}%`}</small>
          </article>
        ) : (
          <article className={`dashboard-kpi-card ${dashboard.stockAlerts.length > 0 ? "dashboard-kpi-warning" : ""}`}>
            <span>Alertas de estoque</span><strong>{dashboard.stockAlerts.length}</strong>
            <small>{dashboard.stockAlerts.length > 0 ? "produtos precisam de atenção" : "estoque sem alertas"}</small>
          </article>
        )}
      </section>

      <section className="dashboard-operation-strip" aria-label="Resumo operacional">
        <div><span>Produtos ativos</span><strong>{dashboard.activeProducts}</strong></div>
        <div><span>Entradas hoje</span><strong>{dashboard.entriesToday.orders}</strong></div>
        <div><span>Estoque em atenção</span><strong>{dashboard.stockAlerts.length}</strong></div>
        {permissions.VIEW_COSTS_MARGIN && <div><span>Valor recebido hoje</span><strong>{formatBRL(dashboard.entriesToday.total)}</strong></div>}
      </section>

      <section className="dashboard-insights-grid">
        {permissions.VIEW_REPORTS && (
          <article className="card dashboard-chart-card">
            <div className="section-heading"><div><h2>Vendas dos últimos 7 dias</h2><p>Evolução diária do faturamento confirmado.</p></div><Link href="/relatorios" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Ver relatórios</Link></div>
            <div className="dashboard-bars" aria-label="Gráfico de vendas dos últimos sete dias">
              {dashboard.dailySales.map((day) => (
                <div className="dashboard-bar-column" key={day.key} title={`${day.label}: ${formatBRL(day.total)}`}>
                  <span className="dashboard-bar-value">{day.total > 0 ? formatBRL(day.total) : "—"}</span>
                  <span className="dashboard-bar-track"><span className="dashboard-bar-fill" style={{ height: `${Math.max(day.total > 0 ? 8 : 0, (day.total / maxDailySale) * 100)}%` }} /></span>
                  <strong>{day.label}</strong>
                </div>
              ))}
            </div>
          </article>
        )}

        {permissions.VIEW_REPORTS && (
          <article className="card dashboard-ranking-card">
            <div className="section-heading"><div><h2>Mais vendidos no mês</h2><p>Produtos com maior faturamento.</p></div></div>
            {dashboard.topProducts.length === 0 ? <div className="dashboard-empty-state"><strong>Ainda sem vendas no mês</strong><p>O ranking aparecerá após os primeiros pedidos.</p></div> : (
              <div className="dashboard-ranking-list">
                {dashboard.topProducts.map((product, index) => (
                  <Link href={`/produtos/${product.id}`} className="dashboard-ranking-row" key={product.id}>
                    <span className="dashboard-ranking-position">{index + 1}</span>
                    <span className="dashboard-ranking-name"><strong>{product.name}</strong><small>{product.quantity} {product.unit} vendidos</small><span className="dashboard-ranking-track"><span style={{ width: `${product.sharePercent}%` }} /></span></span>
                    <strong>{formatBRL(product.revenue)}</strong>
                  </Link>
                ))}
              </div>
            )}
          </article>
        )}

        <article className="card dashboard-attention-card">
          <div className="section-heading"><div><h2>Estoque em atenção</h2><p>Itens zerados ou abaixo do mínimo.</p></div><Link href="/produtos" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Ver estoque</Link></div>
          {dashboard.stockAlerts.length === 0 ? <div className="dashboard-empty-state"><strong>Estoque em ordem</strong><p>Nenhum produto ativo está abaixo do limite.</p></div> : (
            <div className="dashboard-attention-list">
              {dashboard.stockAlerts.map((product) => (
                <Link href={`/produtos/${product.id}`} key={product.id} className="dashboard-attention-row">
                  <span><strong>{product.name}</strong><small>Mínimo: {product.minStockAlert ?? 0} {product.unit}</small></span>
                  <span className={`pill ${product.currentStock <= 0 ? "pill-danger" : "pill-warn"}`}>{product.currentStock} {product.unit}</span>
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>

      <section>
        <div className="section-heading"><h2>Acesso rápido</h2></div>
        <div className="dashboard-actions-grid">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="dashboard-action-card">
              <span className="dashboard-action-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{action.icon}</svg></span>
              <span><strong>{action.title}</strong><small>{action.description}</small></span><span className="dashboard-action-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="section-heading"><h2>Atividade recente</h2><Link href="/movimentacao" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Ver todas</Link></div>
        <div className="card dashboard-activity-card">
          {dashboard.recentOrders.length === 0 ? <div className="dashboard-empty-state"><strong>Nenhuma movimentação registrada</strong><p>Os pedidos e as entradas mais recentes aparecerão aqui.</p></div> : (
            <div className="dashboard-activity-list">
              {dashboard.recentOrders.map((order) => (
                <div key={order.id} className="dashboard-activity-row">
                  <span className={`dashboard-activity-type ${order.type === "IN" ? "is-entry" : "is-sale"}`}>{order.type === "IN" ? "E" : "P"}</span>
                  <div className="dashboard-activity-main"><strong>{order.type === "IN" ? "Entrada" : "Pedido"} #{order.number}</strong><small>{order.itemCount} {order.itemCount === 1 ? "item" : "itens"} · {formatDateTime(order.createdAt)}</small></div>
                  <div className="dashboard-activity-value">{((order.type === "OUT" && permissions.VIEW_REPORTS) || (order.type === "IN" && permissions.VIEW_COSTS_MARGIN)) && <strong>{formatBRL(order.totalValue)}</strong>}{order.cancelledAt && <small>Cancelado</small>}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
