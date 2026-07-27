"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/format";
import type { FilialUpgradeEstimate } from "@/lib/billing";

export default function FilialUpgradeRequest({ estimate }: { estimate: FilialUpgradeEstimate }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/filiais/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível enviar a solicitação.");
        return;
      }
      setSent(true);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <p className="text-sm" style={{ color: "var(--ok)" }}>
        Solicitação enviada. Entraremos em contato para confirmar o pagamento e ativar a filial.
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        Adicionar filial (+1)
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)" }}>
      <div className="space-y-1 text-sm" style={{ color: "var(--ink-soft)" }}>
        <p>Valores estimados (exemplo, sujeito a confirmação):</p>
        <p>Total atual: <strong style={{ color: "var(--ink)" }}>{formatBRL(estimate.currentTotal)}/mês</strong></p>
        <p>Filial nova (10% de desconto): <strong style={{ color: "var(--ink)" }}>{formatBRL(estimate.newFilialPrice)}/mês</strong></p>
        <p>Novo total: <strong style={{ color: "var(--ink)" }}>{formatBRL(estimate.newTotal)}/mês</strong></p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="nova-filial-nome">Nome da nova filial</label>
        <input
          id="nova-filial-nome"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Filial Centro"
          required
        />
      </div>
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Enviando..." : "Solicitar filial"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={loading}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
