import { redirect } from "next/navigation";
import { getCurrentUser, SessionData } from "./session";
import { getAdegaById } from "./repo";
import type { Role } from "./types";

/** Garante que existe um usuário logado e que a conta da adega já foi aprovada
 * (pagamento confirmado); caso contrário redireciona para login ou tela de espera. */
export async function requireUser(): Promise<SessionData> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  const adega = await getAdegaById((user as SessionData).adegaId);
  if (!adega?.approved) {
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
