"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Turnstile, { type TurnstileHandle } from "./Turnstile";

export default function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível solicitar a recuperação.");
        turnstileRef.current?.reset();
        setTurnstileToken("");
        return;
      }
      setMessage(data.message);
    } catch {
      setError("Erro de conexão. Tente novamente.");
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } finally {
      setLoading(false);
    }
  }

  if (message) {
    return (
      <div className="space-y-4 text-center">
        <p style={{ color: "var(--ink-soft)" }}>{message}</p>
        <Link href="/" className="btn-primary inline-flex">Voltar ao login</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
        Informe seu e-mail. Se a conta estiver cadastrada e confirmada, enviaremos um link válido por 30 minutos.
      </p>
      <div>
        <label className="label" htmlFor="reset-email">E-mail</label>
        <input
          id="reset-email"
          type="email"
          required
          autoComplete="email"
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@suaempresa.com"
        />
      </div>
      <Turnstile ref={turnstileRef} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <button type="submit" disabled={loading || !turnstileToken} className="btn-primary w-full">
        {loading ? "Enviando..." : "Enviar link de recuperação"}
      </button>
      <Link href="/" className="btn-secondary w-full">Voltar ao login</Link>
    </form>
  );
}
