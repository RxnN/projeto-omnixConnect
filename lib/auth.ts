import { redirect } from "next/navigation";
import { getCurrentUser, SessionData } from "./session";
import { getEmpresaById, getUserById } from "./repo";
import { resolvePermissions } from "./permissions";
import type { EffectivePermissions, Empresa, PermissionKey, Role } from "./types";
import { ApiError } from "./api-handler";

const EXPIRING_SOON_DAYS = 5;

/** Verdadeiro quando a assinatura foi aprovada mas a data de vencimento já passou —
 * conta deve ser tratada como travada mesmo com approved = true. */
export function isSubscriptionExpired(empresa: Pick<Empresa, "paidUntil">): boolean {
  return Boolean(empresa.paidUntil && new Date(empresa.paidUntil) < new Date());
}

export interface SubscriptionStatus {
  expired: boolean;
  daysRemaining: number | null;
  expiringSoon: boolean;
}

type AccessState =
  | { status: "UNAUTHENTICATED" }
  | { status: "SUBSCRIPTION_BLOCKED"; user: SessionData }
  | { status: "OK"; user: SessionData };

/** A sessão prova a identidade, mas papel, filial e vínculo atuais são reconstruídos
 * do banco em cada acesso protegido para que alterações e revogações sejam imediatas. */
async function getAccessState(): Promise<AccessState> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return { status: "UNAUTHENTICATED" };

  const [current, empresa] = await Promise.all([
    getUserById(sessionUser.userId),
    getEmpresaById(sessionUser.empresaId),
  ]);
  if (!current || !empresa || current.empresaId !== sessionUser.empresaId) {
    return { status: "UNAUTHENTICATED" };
  }

  const user: SessionData = {
    userId: current.id,
    empresaId: current.empresaId,
    empresaName: empresa.name,
    // OWNER normalmente usa null e seleciona a filial por cookie. Se uma sessão antiga
    // trouxer filialId, getCurrentFilialId ainda valida o vínculo com a empresa.
    filialId: current.role === "OWNER" ? sessionUser.filialId : current.filialId,
    name: current.name,
    email: current.email,
    role: current.role,
    lastActivityAt: sessionUser.lastActivityAt,
  };

  if (!empresa.approved || isSubscriptionExpired(empresa)) {
    return { status: "SUBSCRIPTION_BLOCKED", user };
  }
  return { status: "OK", user };
}

/** Dias restantes até o vencimento (null = sem data de vencimento controlada) e se está
 * perto o suficiente pra avisar o dono (usado pelo banner no layout). */
export function getSubscriptionStatus(empresa: Pick<Empresa, "paidUntil">): SubscriptionStatus {
  if (!empresa.paidUntil) {
    return { expired: false, daysRemaining: null, expiringSoon: false };
  }
  const msRemaining = new Date(empresa.paidUntil).getTime() - Date.now();
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  return {
    expired: daysRemaining < 0,
    daysRemaining,
    expiringSoon: daysRemaining >= 0 && daysRemaining <= EXPIRING_SOON_DAYS,
  };
}

/** Garante que existe um usuário logado e que a conta da empresa já foi aprovada
 * (pagamento confirmado) e não está com a assinatura vencida; caso contrário
 * redireciona para login ou tela de espera. */
export async function requireUser(): Promise<SessionData> {
  const access = await getAccessState();
  if (access.status === "UNAUTHENTICATED") {
    redirect("/");
  }
  if (access.status === "SUBSCRIPTION_BLOCKED") {
    redirect("/aguardando-aprovacao");
  }
  return access.user;
}

/** Mesmos controles de requireUser(), mas com respostas JSON para Route Handlers. */
export async function requireApiUser(): Promise<SessionData> {
  const access = await getAccessState();
  if (access.status === "UNAUTHENTICATED") {
    throw new ApiError(401, "Não autenticado.");
  }
  if (access.status === "SUBSCRIPTION_BLOCKED") {
    throw new ApiError(403, "A assinatura da empresa está aguardando aprovação ou vencida.");
  }
  return access.user;
}

/** Garante que o usuário logado possui um dos papéis (roles) permitidos. */
export async function requireRole(allowed: Role[]): Promise<SessionData> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) {
    redirect("/acesso-negado");
  }
  return user;
}

/** Permissões efetivas são lidas do banco em cada autorização, evitando que uma
 * alteração feita pelo Dono dependa de novo login do usuário afetado. */
export async function getEffectivePermissions(
  user: Pick<SessionData, "userId" | "role">
): Promise<EffectivePermissions> {
  const current = await getUserById(user.userId);
  if (!current) {
    return {
      REGISTER_ENTRIES: false,
      MANAGE_PRODUCTS: false,
      IMPORT_PRODUCTS: false,
      EDIT_ORDER_PRICE: false,
      FORCE_STOCK: false,
      CANCEL_ORDERS: false,
      VIEW_REPORTS: false,
      VIEW_COSTS_MARGIN: false,
      MANAGE_PROMOTIONS: false,
      MANAGE_BRANCHES: false,
    };
  }
  return resolvePermissions(current.role, current.permissions);
}

export async function hasPermission(
  user: Pick<SessionData, "userId" | "role">,
  permission: PermissionKey
): Promise<boolean> {
  const permissions = await getEffectivePermissions(user);
  return permissions[permission];
}

export async function requirePermission(permission: PermissionKey): Promise<SessionData> {
  const user = await requireUser();
  if (!(await hasPermission(user, permission))) redirect("/acesso-negado");
  return user;
}

export function canAccessReportsFull(role: Role) {
  return role === "OWNER";
}

export function canAccessReportsLimited(role: Role) {
  return role === "OWNER" || role === "MANAGER";
}

export function canManageProducts(role: Role) {
  return role === "OWNER";
}

export function canCancelPedidos(role: Role) {
  return role === "OWNER";
}
