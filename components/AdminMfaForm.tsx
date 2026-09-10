"use client";

import { FormEvent, useState } from "react";

export default function AdminMfaForm({ email }: { email: string }) {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestCode() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/mfa/request", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) return setError(data.error ?? "Não foi possível enviar o código.");
    setSent(true);
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/mfa/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) return setError(data.error ?? "Não foi possível confirmar o código.");
    window.location.href = data.adminPath;
  }

  return (
    <div className="auth-card space-y-5">
      <div>
        <span className="page-eyebrow">Verificação administrativa</span>
        <h1 className="page-title">Confirme que é você</h1>
        <p className="page-description">Enviaremos um código temporário para {email}.</p>
      </div>
      {!sent ? (
        <button className="btn-primary w-full" type="button" disabled={loading} onClick={requestCode}>
          {loading ? "Enviando..." : "Enviar código"}
        </button>
      ) : (
        <form className="space-y-4" onSubmit={verify}>
          <label className="form-label" htmlFor="admin-code">Código de 6 números</label>
          <input id="admin-code" className="form-input text-center text-2xl tracking-[0.35em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
          <button className="btn-primary w-full" disabled={loading || code.length !== 6} type="submit">
            {loading ? "Verificando..." : "Entrar no painel"}
          </button>
          <button className="btn-secondary w-full" disabled={loading} type="button" onClick={requestCode}>Reenviar código</button>
        </form>
      )}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}
