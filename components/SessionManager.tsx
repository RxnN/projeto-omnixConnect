"use client";

import { useState } from "react";

export interface SessionRow { id: string; label: string; createdAt: string; lastSeenAt: string; current: boolean }

export default function SessionManager({ initialSessions }: { initialSessions: SessionRow[] }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function revoke(id: string) {
    setLoading(true); setMessage("");
    const response = await fetch(`/api/sessoes/${id}/revoke`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) return setMessage(data.error ?? "Não foi possível encerrar o acesso.");
    setSessions((current) => current.filter((item) => item.id !== id));
    setMessage("Acesso encerrado.");
  }

  async function revokeOthers() {
    setLoading(true); setMessage("");
    const response = await fetch("/api/sessoes/revoke-others", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) return setMessage(data.error ?? "Não foi possível encerrar os outros acessos.");
    setSessions((current) => current.filter((item) => item.current));
    setMessage(`${data.count ?? 0} outro(s) acesso(s) encerrado(s).`);
  }

  return <div className="space-y-4"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">Dispositivos conectados</h2><p className="text-sm" style={{ color: "var(--ink-soft)" }}>Encerre acessos que você não reconhece.</p></div><button className="btn-secondary" disabled={loading || sessions.every((item) => item.current)} onClick={revokeOthers}>Encerrar outros acessos</button></div>{sessions.map((item) => <div className="card flex flex-wrap items-center justify-between gap-3" key={item.id}><div><strong>{item.label}</strong>{item.current && <span className="pill pill-ok ml-2">Este dispositivo</span>}<p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>Último acesso: {new Date(item.lastSeenAt).toLocaleString("pt-BR")}</p></div>{!item.current && <button className="btn-secondary" disabled={loading} onClick={() => revoke(item.id)}>Encerrar</button>}</div>)}{sessions.length === 0 && <div className="card">Nenhum acesso rastreado.</div>}{message && <p className="text-sm">{message}</p>}</div>;
}
