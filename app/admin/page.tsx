import AdminCompanies, { type AdminCompanyRow } from "@/components/AdminCompanies";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import { requireSuperAdminPage } from "@/lib/admin-access";
import { listAdminCompanies } from "@/lib/admin-company";
import { listAdminAuditLogs } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireSuperAdminPage();
  const [companies, auditLogs] = await Promise.all([listAdminCompanies(), listAdminAuditLogs(30)]);
  const now = new Date();
  const rows: AdminCompanyRow[] = companies.map((company) => ({
    id: company.id,
    name: company.name,
    ownerEmail: company.users[0]?.email ?? "Proprietário não encontrado",
    emailVerified: Boolean(company.users[0]?.emailVerifiedAt),
    approved: company.approved,
    paidUntil: company.paidUntil?.toISOString() ?? null,
    createdAt: company.createdAt.toISOString(),
  }));
  const active = rows.filter((company) => company.approved && (!company.paidUntil || new Date(company.paidUntil) >= now));
  const awaitingEmail = rows.filter((company) => !company.emailVerified);
  const awaitingActivation = rows.filter((company) => company.emailVerified && !company.approved);
  const expired = rows.filter((company) => company.approved && company.paidUntil && new Date(company.paidUntil) < now);

  return (
    <main className="page-container space-y-6">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">Administração Omnix</span>
          <h1 className="page-title">Empresas</h1>
          <p className="page-description">Acompanhe os cadastros e libere o acesso somente depois da confirmação do pagamento.</p>
        </div>
        <div className="text-right text-sm">
          <strong className="block">{admin.email}</strong>
          <AdminLogoutButton />
        </div>
      </header>

      <section className="dashboard-kpi-grid">
        <div className="dashboard-kpi-card dashboard-kpi-primary"><span>Empresas ativas</span><strong>{active.length}</strong></div>
        <div className="dashboard-kpi-card dashboard-kpi-warning"><span>Aguardando ativação</span><strong>{awaitingActivation.length}</strong></div>
        <div className="dashboard-kpi-card"><span>E-mail pendente</span><strong>{awaitingEmail.length}</strong></div>
        <div className="dashboard-kpi-card"><span>Assinaturas vencidas</span><strong>{expired.length}</strong></div>
      </section>

      <section className="space-y-3">
        <div className="section-heading"><h2>Todas as empresas</h2><span className="text-sm">{rows.length} cadastradas</span></div>
        <AdminCompanies companies={rows} />
      </section>

      <section className="space-y-3">
        <div className="section-heading"><h2>Histórico administrativo</h2><span className="text-sm">Últimas {auditLogs.length} ações</span></div>
        <div className="card data-card overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Data</th><th>Administrador</th><th>Ação</th><th>Empresa</th><th>Detalhes</th></tr></thead>
            <tbody>
              {auditLogs.map((entry) => {
                const details = entry.details && typeof entry.details === "object" && !Array.isArray(entry.details)
                  ? entry.details as Record<string, unknown>
                  : {};
                const action = entry.action === "COMPANY_ACTIVATED" ? "Empresa ativada" : entry.action === "COMPANY_RENEWED" ? "Assinatura renovada" : "MFA confirmado";
                const days = typeof details.days === "number" ? `${details.days} dias` : "—";
                return <tr key={entry.id}><td>{entry.createdAt.toLocaleString("pt-BR")}</td><td>{entry.adminEmail}</td><td>{action}</td><td>{entry.empresaName ?? "—"}</td><td>{days}</td></tr>;
              })}
              {auditLogs.length === 0 && <tr><td colSpan={5}>Nenhuma ação administrativa registrada ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
