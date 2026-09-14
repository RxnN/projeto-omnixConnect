import { requireRole } from "@/lib/auth";
import { listFiliais, listUsersByEmpresa } from "@/lib/repo";
import {
  getDefaultPermissions,
  PERMISSION_DEFINITIONS,
  resolvePermissions,
} from "@/lib/permissions";
import UserPermissionsManager from "@/components/UserPermissionsManager";
import PageHeader from "@/components/PageHeader";
import InviteUserForm from "@/components/InviteUserForm";
import { listPendingInvites } from "@/lib/user-invite";

export default async function UsuariosPage() {
  const owner = await requireRole(["OWNER"]);
  const [users, filiais, pendingInvites] = await Promise.all([
    listUsersByEmpresa(owner.empresaId),
    listFiliais(owner.empresaId),
    listPendingInvites(owner.empresaId),
  ]);
  const filialById = new Map(filiais.map((filial) => [filial.id, filial.name]));

  const managedUsers = users
    .filter((user) => user.role !== "OWNER")
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "MANAGER" | "EMPLOYEE",
      filialName: user.filialId ? filialById.get(user.filialId) ?? "Filial não encontrada" : "Sem filial",
      defaults: getDefaultPermissions(user.role),
      overrides: user.permissions ?? {},
      effective: resolvePermissions(user.role, user.permissions),
    }));

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        eyebrow="Equipe e segurança"
        title="Usuários e permissões"
        description="Personalize o que cada Gerente ou Funcionário pode fazer. O perfil-base continua servindo como configuração segura."
      />
      <div className="panel flex flex-wrap items-start gap-3 text-sm">
        <span className="pill pill-ok">Dono sempre tem acesso total</span>
        <p style={{ color: "var(--ink-soft)" }}>
          Alterações passam a valer na próxima tela ou ação do usuário, sem necessidade de novo login.
        </p>
      </div>
      <InviteUserForm filiais={filiais.filter((filial) => filial.approved).map(({ id, name }) => ({ id, name }))} />
      {pendingInvites.length > 0 && <div className="card"><h2 className="font-bold mb-3">Convites pendentes</h2><div className="space-y-2">{pendingInvites.map((invite) => <div className="flex flex-wrap justify-between gap-2 text-sm" key={invite.id}><span>{invite.email}</span><span style={{ color: "var(--ink-soft)" }}>{invite.role === "MANAGER" ? "Gerente" : "Funcionário"} · expira em {invite.expiresAt.toLocaleString("pt-BR")}</span></div>)}</div></div>}
      <UserPermissionsManager users={managedUsers} definitions={PERMISSION_DEFINITIONS} />
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="font-bold">Cópia dos dados da empresa</h2><p className="text-sm" style={{ color: "var(--ink-soft)" }}>Baixe os cadastros, operações e histórico em formato JSON.</p></div>
        <a className="btn-secondary" href="/api/dados/export">Exportar dados</a>
      </div>
    </div>
  );
}
