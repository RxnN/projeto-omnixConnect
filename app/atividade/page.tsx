import PageHeader from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { listTenantAudit } from "@/lib/tenant-audit";

const ACTION_LABELS: Record<string, string> = {
  PRODUCT_CREATED: "Produto cadastrado",
  PRODUCT_UPDATED: "Produto alterado",
  PRODUCT_STATUS_CHANGED: "Status do produto alterado",
  PRODUCTS_IMPORTED: "Produtos importados",
  ORDER_CREATED: "Pedido registrado",
  ORDER_CANCELLED: "Pedido cancelado",
  PROMOTION_CREATED: "Promoção criada",
  PROMOTION_DELETED: "Promoção removida",
  BRANCH_CREATED: "Filial criada",
  BRANCH_REQUESTED: "Filial solicitada",
  USER_PERMISSIONS_CHANGED: "Permissões alteradas",
};

export const dynamic = "force-dynamic";

export default async function AtividadePage() {
  const user = await requireUser();
  if (user.role !== "OWNER") {
    return <div className="card"><p>Somente o Dono pode consultar o histórico completo da empresa.</p></div>;
  }
  const entries = await listTenantAudit(user.empresaId);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Segurança e controle" title="Histórico de ações" description="Consulte as operações sensíveis realizadas na empresa." />
      <div className="card data-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Referência</th><th>Filial</th></tr></thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.createdAt.toLocaleString("pt-BR")}</td>
                <td>{entry.userName}</td>
                <td>{ACTION_LABELS[entry.action] ?? entry.action}</td>
                <td>{entry.entityId ?? "—"}</td>
                <td>{entry.filialId ?? "—"}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={5}>Nenhuma ação registrada ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
