"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Turnstile, { type TurnstileHandle } from "./Turnstile";

export default function PasswordResetForm() {
  const [token, setToken] = useState("");
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    setToken(params.get("token") ?? "");
    window.history.replaceState({}, "", "/redefinir-senha");
    setTokenLoaded(true);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("As senhas não são iguais.");
      return;
    }
    setState("loading");
    try {
      const response = await fetch("/api/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, turnstileToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        setState("idle");
        setError(data.error ?? "Não foi possível redefinir a senha.");
        turnstileRef.current?.reset();
        setTurnstileToken("");
        return;
      }
      setPassword("");
      setConfirmation("");
      setState("success");
    } catch {
      setState("idle");
      setError("Erro de conexão. Tente novamente.");
      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
  }

  if (state === "success") {
    return (
      <div className="space-y-4 text-center">
        <p style={{ color: "var(--ink-soft)" }}>
          Sua senha foi alterada. Entre novamente com a nova senha.
        </p>
        <Link href="/" className="btn-primary inline-flex">Ir para o login</Link>
      </div>
    );
  }

  if (!tokenLoaded) {
    return <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Carregando link seguro...</p>;
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p style={{ color: "var(--danger)" }}>Link de recuperação inválido ou incompleto.</p>
        <Link href="/esqueci-senha" className="btn-primary inline-flex">Solicitar novo link</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="new-password">Nova senha</label>
        <input
          id="new-password"
          type="password"
          required
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          className="input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Pelo menos 10 caracteres"
        />
      </div>
      <div>
        <label className="label" htmlFor="confirm-password">Confirme a nova senha</label>
        <input
          id="confirm-password"
          type="password"
          required
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          className="input"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="Digite a senha novamente"
        />
      </div>
      <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
        Use pelo menos 10 caracteres, com uma letra e um número.
      </p>
      <Turnstile ref={turnstileRef} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <button type="submit" disabled={state === "loading" || !turnstileToken} className="btn-primary w-full">
        {state === "loading" ? "Alterando..." : "Alterar senha"}
      </button>
    </form>
  );
}
