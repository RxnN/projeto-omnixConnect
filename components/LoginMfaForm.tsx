"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function LoginMfaForm({ email }: { email: string }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function verify(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/login/mfa/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Não foi possível confirmar o código.");
        setLoading(false);
        return;
      }
      window.location.href = "/inicio";
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <form className="card space-y-5" onSubmit={verify}>
      <div>
        <span className="page-eyebrow">Proteção da conta</span>
        <h1 className="page-title">Confirme seu acesso</h1>
        <p className="page-description">Enviamos um código temporário para {email}.</p>
      </div>
      <div>
        <label className="label" htmlFor="login-code">Código de 6 números</label>
        <input id="login-code" className="input text-center text-2xl tracking-[0.35em]" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button className="btn-primary w-full" disabled={loading || code.length !== 6} type="submit">
        {loading ? "Verificando..." : "Confirmar e entrar"}
      </button>
      <Link href="/" className="btn-secondary block w-full text-center">Voltar ao login</Link>
    </form>
  );
}
