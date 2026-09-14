"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Turnstile, { type TurnstileHandle } from "./Turnstile";

export default function AcceptInviteForm() {
  const [token, setToken] = useState(""); const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [turnstileToken, setTurnstileToken] = useState(""); const [loading, setLoading] = useState(false); const [success, setSuccess] = useState(false); const [error, setError] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);
  useEffect(() => { const params = new URLSearchParams(window.location.hash.slice(1)); setToken(params.get("token") ?? ""); window.history.replaceState({}, "", "/aceitar-convite"); setLoaded(true); }, []);
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(""); if (password !== confirmation) return setError("As senhas não são iguais."); setLoading(true); try { const response = await fetch("/api/convites/aceitar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, name, phone, password, turnstileToken }) }); const data = await response.json().catch(() => ({})); if (!response.ok) { setError(data.error ?? "Não foi possível aceitar o convite."); turnstileRef.current?.reset(); setTurnstileToken(""); return; } setSuccess(true); } catch { setError("Erro de conexão. Tente novamente."); } finally { setLoading(false); } }
  if (!loaded) return <p>Carregando convite...</p>;
  if (!token) return <div className="text-center space-y-4"><p>Convite inválido ou incompleto.</p><Link className="btn-primary inline-flex" href="/">Ir ao login</Link></div>;
  if (success) return <div className="text-center space-y-4"><h2 className="font-bold">Acesso criado</h2><p>Agora você pode entrar com seu e-mail e a senha escolhida.</p><Link className="btn-primary inline-flex" href="/">Entrar</Link></div>;
  return <form className="space-y-4" onSubmit={submit}><div><label className="label" htmlFor="invite-name">Nome</label><input id="invite-name" className="input" required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} /></div><div><label className="label" htmlFor="invite-phone">Telefone com DDD</label><input id="invite-phone" className="input" required inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></div><div><label className="label" htmlFor="invite-password">Crie sua senha</label><input id="invite-password" className="input" type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div><div><label className="label" htmlFor="invite-confirmation">Confirme a senha</label><input id="invite-confirmation" className="input" type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div><Turnstile ref={turnstileRef} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />{error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}<button className="btn-primary w-full" disabled={loading || !turnstileToken}>{loading ? "Criando acesso..." : "Aceitar convite"}</button></form>;
}
