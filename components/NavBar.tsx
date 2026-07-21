"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SessionData } from "@/lib/session";
import ThemeToggle from "./ThemeToggle";

const roleLabel: Record<string, string> = {
  OWNER: "Dono",
  MANAGER: "Gerente",
  EMPLOYEE: "Funcionário",
};

const ICONS: Record<string, React.ReactNode> = {
  "/pedidos": (
    <path d="M3 4h2l1.6 9.6a2 2 0 0 0 2 1.7h7.1a2 2 0 0 0 2-1.6L19 8H6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "/entrada": (
    <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "/movimentacao": (
    <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "/relatorios": (
    <path d="M5 19V9m6.5 10V4M18 19v-6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "/produtos": (
    <path
      d="M4 7.5 12 4l8 3.5M4 7.5v9L12 20m-8-3.5L12 20m0-12.5 8 3.5M12 7.5V20m8-9v9l-8 3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

export default function NavBar({ user }: { user: SessionData }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Fecha o drawer automaticamente ao navegar para outra tela (mobile).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links = [
    { href: "/pedidos", label: "Pedidos" },
    { href: "/entrada", label: "Entrada" },
    { href: "/movimentacao", label: "Movimentações" },
  ];
  if (user.role === "OWNER" || user.role === "MANAGER") {
    links.push({ href: "/relatorios", label: "Relatórios" });
  }
  links.push({ href: "/produtos", label: "Produtos" });

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      {/* Barra superior compacta — só em telas estreitas (celular) */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-30"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="flex items-center justify-center w-9 h-9 rounded-full border"
          style={{ borderColor: "var(--border)", color: "var(--ink)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="font-display font-extrabold text-base tracking-tight truncate mx-3">{user.adegaName}</span>
        <ThemeToggle />
      </div>

      {/* Fundo escurecido atrás do drawer aberto no mobile */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setOpen(false)}
        />
      )}

      <header
        className={`w-60 shrink-0 flex flex-col border-r fixed md:sticky top-0 left-0 h-screen overflow-y-auto z-50 transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="px-5 py-5 border-b flex items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
          <span className="font-display font-extrabold text-lg tracking-tight truncate block">{user.adegaName}</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-full shrink-0"
            style={{ color: "var(--ink-soft)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {links.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-semibold transition-colors"
                style={
                  active
                    ? { backgroundColor: "var(--accent)", color: "var(--accent-ink)" }
                    : { color: "var(--ink-soft)" }
                }
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                  {ICONS[l.href]}
                </svg>
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
                {roleLabel[user.role]}
              </p>
            </div>
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary w-full">
            Sair
          </button>
        </div>
      </header>
    </>
  );
}
