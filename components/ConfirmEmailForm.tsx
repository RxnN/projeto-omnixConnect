"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ConfirmEmailForm() {
  const [token, setToken] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    setToken(params.get("token") ?? "");
    window.history.replaceState({}, "", "/verificar-email");
  }, []);

  async function confirm() {
    setState("loading");
    setError(null);
    try {
      const response = await fetch("/api/verificar-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) {
        setState("error");
        setError(data.error ?? "Não foi possível confirmar o e-mail.");
        return;
      }
      setState("success");
    } catch {
      setState("error");
      setError("Erro de conexão. Tente novamente.");
    }
  }

  if (state === "success") {
    return (
      <div className="space-y-4">
        <p style={{ color: "var(--ink-soft)" }}>
          E-mail confirmado. Sua empresa agora aguarda a conferência e a aprovação do acesso.
        </p>
        <Link href="/" className="btn-primary inline-flex">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p style={{ color: "var(--ink-soft)" }}>
        Confirme que este endereço de e-mail pertence a você. O link é de uso único e expira em 24 horas.
      </p>
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <button type="button" className="btn-primary" disabled={!token || state === "loading"} onClick={confirm}>
        {state === "loading" ? "Confirmando..." : "Confirmar meu e-mail"}
      </button>
    </div>
  );
}
