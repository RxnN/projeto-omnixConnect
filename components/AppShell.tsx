"use client";

import { usePathname } from "next/navigation";
import type { SessionData } from "@/lib/session";
import type { EffectivePermissions, Filial } from "@/lib/types";
import type { SubscriptionStatus } from "@/lib/auth";
import NavBar from "./NavBar";
import SubscriptionBanner from "./SubscriptionBanner";

// Telas públicas (login, cadastro) nunca mostram o menu do app, mesmo que a sessão
// do usuário ainda esteja presente numa navegação em trânsito (ex: logo após "Sair").
const PUBLIC_ROUTES = ["/", "/cadastro", "/cadastro-recebido", "/verificar-email"];

export default function AppShell({
  user,
  filiais,
  currentFilialId,
  subscriptionStatus,
  permissions,
  children,
}: {
  user: SessionData | null;
  filiais: Filial[];
  currentFilialId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  permissions: EffectivePermissions | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublicRoute = pathname !== null && PUBLIC_ROUTES.includes(pathname);

  if (!user || isPublicRoute) {
    return <main>{children}</main>;
  }

  return (
    <div className="app-shell">
      <NavBar user={user} filiais={filiais} currentFilialId={currentFilialId} permissions={permissions} />
      <div className="app-content branded-watermark">
        {subscriptionStatus?.expiringSoon && subscriptionStatus.daysRemaining !== null && (
          <SubscriptionBanner daysRemaining={subscriptionStatus.daysRemaining} />
        )}
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
