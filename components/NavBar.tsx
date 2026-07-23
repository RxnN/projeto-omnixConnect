"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { SessionData } from "@/lib/session";
import type { Filial } from "@/lib/types";
import ThemeToggle from "./ThemeToggle";
import FilialSwitcher from "./FilialSwitcher";

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
  "/filiais": (
    <path
      d="M4 21V8l8-4 8 4v13M9 21v-6h6v6M4 21h16"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  "/promocoes": (
    <path
      d="M20.6 12.6 12.6 20.6a2 2 0 0 1-2.83 0l-6.37-6.37a2 2 0 0 1 0-2.83L11.4 3.4A2 2 0 0 1 12.83 2.8L20 3l.2 7.17a2 2 0 0 1-.6 1.43ZM15.5 8.5h.01"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

export default function NavBar({
  user,
  filiais,
  currentFilialId,
}: {
  user: SessionData;
  filiais: Filial[];
  currentFilialId: string | null;
}) {
  const pathname = usePathname();
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
  if (user.role === "OWNER") {
    links.push({ href: "/promocoes", label: "Promoções" });
    links.push({ href: "/filiais", label: "Filiais" });
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    // Navegação completa (não client-side) — garante que o layout raiz re-renderize
    // do zero sem reaproveitar o cache de rota do Next com o usuário antigo.
    window.location.href = "/";
  }

  return (
    <>
      {/* Barra superior compacta — só em telas estreitas (celular) */}
      <div
        className="md:hidden flex items-center justify-between px-3 py-2.5 border-b sticky top-0 z-30 shadow-sm"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="flex items-center justify-center w-9 h-9 rounded-lg border"
          style={{ borderColor: "var(--border)", color: "var(--ink)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex items-center gap-2 min-w-0 mx-3">
          <span className="brand-mark brand-mark-mobile">
            <Image src="/brand/omnix-connect-mark.png" alt="" width={32} height={20} priority />
          </span>
          <span className="font-display font-extrabold text-sm tracking-tight truncate">Omnix Connect</span>
        </div>
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
        className={`w-64 shrink-0 flex flex-col border-r fixed md:sticky top-0 left-0 h-screen overflow-y-auto z-50 transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="px-4 py-5 border-b space-y-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className="brand-mark">
                <Image src="/brand/omnix-connect-mark.png" alt="" width={38} height={24} priority />
              </span>
              <span className="min-w-0">
                <strong className="font-display font-extrabold text-base leading-none tracking-tight block">Omnix Connect</strong>
                <small className="text-[11px] block mt-1 truncate" style={{ color: "var(--ink-soft)" }}>Gestão comercial</small>
              </span>
            </div>
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
          <p className="text-xs font-semibold truncate" style={{ color: "var(--ink-soft)" }}>{user.empresaName}</p>
          {user.role === "OWNER" && <FilialSwitcher filiais={filiais} currentFilialId={currentFilialId} />}
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {links.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]"
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
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold shrink-0" style={{ backgroundColor: "var(--surface-2)", color: "var(--ink)" }}>
                {user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--ink)" }}>
                {user.name}
              </p>
              <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
                {roleLabel[user.role]}
              </p>
              </div>
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
