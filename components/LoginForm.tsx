"use client";

import { useRef, useState } from "react";
import Turnstile, { type TurnstileHandle } from "./Turnstile";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, turnstileToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível entrar.");
        setLoading(false);
        // Token do Turnstile é de uso único — precisa resolver o desafio de novo
        // antes de tentar submeter outra vez.
        turnstileRef.current?.reset();
        setTurnstileToken("");
        return;
      }
      // Navegação completa — garante que toda a árvore (layout + página) renderize do
      // zero pra sessão nova, sem reaproveitar cache de rota de uma conta anterior
      // (ex: papel/preços de um dono aparecendo depois de logar como funcionário).
      window.location.href = data.admin ? "/admin" : "/inicio";
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@suaempresa.com"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          type="password"
          required
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <Turnstile ref={turnstileRef} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading || !turnstileToken} className="btn-primary w-full">
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
