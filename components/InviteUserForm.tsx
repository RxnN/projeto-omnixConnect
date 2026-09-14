"use client";

import { useState } from "react";

export default function InviteUserForm({ filiais }: { filiais: { id: string; name: string }[] }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MANAGER" | "EMPLOYEE">("EMPLOYEE");
  const [filialId, setFilialId] = useState(filiais[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/convites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role, filialId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(data.error ?? "Não foi possível enviar o convite.");
      setEmail(""); setMessage("Convite enviado. O link expira em 48 horas.");
    } catch { setMessage("Erro de conexão. Tente novamente."); } finally { setLoading(false); }
  }

  return <form className="card space-y-4" onSubmit={submit}><div><h2 className="font-bold">Convidar usuário</h2><p className="text-sm" style={{ color: "var(--ink-soft)" }}>A pessoa receberá um link para criar a própria senha.</p></div><div className="grid md:grid-cols-3 gap-3"><div><label className="label" htmlFor="invite-email">E-mail</label><input id="invite-email" className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div><div><label className="label" htmlFor="invite-role">Perfil</label><select id="invite-role" className="input" value={role} onChange={(event) => setRole(event.target.value as "MANAGER" | "EMPLOYEE")}><option value="EMPLOYEE">Funcionário</option><option value="MANAGER">Gerente</option></select></div><div><label className="label" htmlFor="invite-filial">Filial</label><select id="invite-filial" className="input" required value={filialId} onChange={(event) => setFilialId(event.target.value)}>{filiais.filter((item) => item.id).map((filial) => <option value={filial.id} key={filial.id}>{filial.name}</option>)}</select></div></div><button className="btn-primary" disabled={loading || !email || !filialId}>{loading ? "Enviando..." : "Enviar convite"}</button>{message && <p className="text-sm">{message}</p>}</form>;
}
