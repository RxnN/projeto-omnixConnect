import { redirect } from "next/navigation";
import { getCurrentUser, SessionData } from "./session";
import { getAdegaById } from "./repo";
import type { Adega, Role } from "./types";

const EXPIRING_SOON_DAYS = 5;

/** Verdadeiro quando a assinatura foi aprovada mas a data de vencimento já passou —
 * conta deve ser tratada como travada mesmo com approved = true. */
export function isSubscriptionExpired(adega: Pick<Adega, "paidUntil">): boolean {
  return Boolean(adega.paidUntil && new Date(adega.paidUntil) < new Date());
}

export interface SubscriptionStatus {
  expired: boolean;
  daysRemaining: number | null;
  expiringSoon: boolean;
}

/** Dias restantes até o vencimento (null = sem data de vencimento controlada) e se está
 * perto o suficiente pra avisar o dono (usado pelo banner no layout). */
export function getSubscriptionStatus(adega: Pick<Adega, "paidUntil">): SubscriptionStatus {
  if (!adega.paidUntil) {
    return { expired: false, daysRemaining: null, expiringSoon: false };
  }
  const msRemaining = new Date(adega.paidUntil).getTime() - Date.now();
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  return {
    expired: daysRemaining < 0,
    daysRemaining,
    expiringSoon: daysRemaining >= 0 && daysRemaining <= EXPIRING_SOON_DAYS,
  };
}

/** Garante que existe um usuário logado e que a conta da adega já foi aprovada
 * (pagamento confirmado) e não está com a assinatura vencida; caso contrário
 * redireciona para login ou tela de espera. */
export async function requireUser(): Promise<SessionData> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  const adega = await getAdegaById((user as SessionData).adegaId);
  if (!adega?.approved || isSubscriptionExpired(adega)) {
    redirect("/aguardando-aprovacao");
  }
  return user as SessionData;
}

/** Garante que o usuário logado possui um dos papéis (roles) permitidos. */
export async function requireRole(allowed: Role[]): Promise<SessionData> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) {
    redirect("/acesso-negado");
  }
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
