import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { listActiveFiliais } from "@/lib/repo";
import { getEffectivePermissions, getSubscriptionStatus } from "@/lib/auth";
import type { EffectivePermissions } from "@/lib/types";
import { getCurrentFilialId, SELECTED_FILIAL_COOKIE } from "@/lib/filial-context";
import AppShell from "@/components/AppShell";
import { cookies, headers } from "next/headers";
import { enterTenantDatabaseContext } from "@/lib/prisma";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Omnix Connect — Gestão conectada para o seu negócio",
  description: "Omnix Connect: gestão conectada para o seu negócio.",
  icons: {
    icon: "/brand/omnix-connect-mark.png",
    apple: "/brand/omnix-connect-mark.png",
  },
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (user) enterTenantDatabaseContext(user.empresaId);
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const adminRoute = requestHeaders.get("x-admin-route") === "1";

  // O layout raiz nunca pode deixar de renderizar a barra lateral (é onde fica o botão
  // "Sair") — se a sessão estiver inválida (ex: empresa apagada) ou o banco estiver
  // momentaneamente fora do ar, essas buscas extras degradam silenciosamente em vez de
  // derrubar a página inteira e prender o usuário sem conseguir deslogar.
  let filiais: Awaited<ReturnType<typeof listActiveFiliais>> = [];
  let currentFilialId: string | null = null;
  let permissions: EffectivePermissions | null = null;
  if (user) {
    try {
      if (user.role === "OWNER") {
        filiais = await listActiveFiliais(user.empresaId);
        const selectedFilialId = (await cookies()).get(SELECTED_FILIAL_COOKIE)?.value;
        currentFilialId = filiais.find((filial) => filial.id === selectedFilialId)?.id ?? filiais[0]?.id ?? null;
        if (!currentFilialId) currentFilialId = await getCurrentFilialId(user);
      } else {
        currentFilialId = user.filialId;
      }
      permissions = await getEffectivePermissions(user);
    } catch (error) {
      console.error("[RootLayout] falha ao carregar contexto de filial/assinatura", error);
    }
  }
  const subscriptionStatus = user?.subscriptionPaidUntil !== undefined
    ? getSubscriptionStatus({ paidUntil: user.subscriptionPaidUntil })
    : null;

  return (
    <html lang="pt-BR" className={`${manrope.variable} ${plexMono.variable}`}>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <AppShell
          user={user ?? null}
          filiais={filiais}
          currentFilialId={currentFilialId}
          subscriptionStatus={subscriptionStatus}
          permissions={permissions}
          adminRoute={adminRoute}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
