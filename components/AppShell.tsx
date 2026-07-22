"use client";

import { usePathname } from "next/navigation";
import type { SessionData } from "@/lib/session";
import type { Filial } from "@/lib/types";
import type { SubscriptionStatus } from "@/lib/auth";
import NavBar from "./NavBar";
import SubscriptionBanner from "./SubscriptionBanner";

// Telas públicas (login, cadastro) nunca mostram o menu do app, mesmo que a sessão
// do usuário ainda esteja presente numa navegação em trânsito (ex: logo após "Sair").
const PUBLIC_ROUTES = ["/", "/cadastro"];

export default function AppShell({
  user,
  filiais,
  currentFilialId,
  subscriptionStatus,
  children,
}: {
  user: SessionData | null;
  filiais: Filial[];
  currentFilialId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublicRoute = pathname !== null && PUBLIC_ROUTES.includes(pathname);

  if (!user || isPublicRoute) {
    return <main>{children}</main>;
  }

  return (
    <div className="md:flex min-h-screen">
      <NavBar user={user} filiais={filiais} currentFilialId={currentFilialId} />
      <div className="flex-1 min-w-0">
        {subscriptionStatus?.expiringSoon && subscriptionStatus.daysRemaining !== null && (
          <SubscriptionBanner daysRemaining={subscriptionStatus.daysRemaining} />
        )}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
