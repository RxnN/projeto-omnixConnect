"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface AdminCompanyRow {
  id: string;
  name: string;
  ownerEmail: string;
  emailVerified: boolean;
  approved: boolean;
  paidUntil: string | null;
  createdAt: string;
}

function companyStatus(company: AdminCompanyRow) {
  if (!company.emailVerified) return { label: "E-mail pendente", className: "pill-warn" };
  if (!company.approved) return { label: "Aguardando ativação", className: "pill-warn" };
  if (company.paidUntil && new Date(company.paidUntil) < new Date()) {
    return { label: "Vencida", className: "pill-danger" };
  }
  return { label: "Ativa", className: "pill-ok" };
}

export default function AdminCompanies({ companies }: { companies: AdminCompanyRow[] }) {
  const router = useRouter();
  const [days, setDays] = useState<Record<string, number>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function activate(company: AdminCompanyRow) {
    const duration = days[company.id] ?? 30;
    if (!window.confirm(`Ativar ${company.name} por ${duration} dias? Confirme somente após validar o pagamento.`)) {
      return;
    }
    setError(null);
    setLoadingId(company.id);
    try {
      const response = await fetch(`/api/admin/empresas/${company.id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: duration }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível ativar a empresa.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível ativar a empresa.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      {error && <div className="card text-sm" style={{ color: "var(--danger)" }}>{error}</div>}
      <div className="card data-card desktop-table overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Proprietário</th>
              <th>Cadastro</th>
              <th>Status</th>
              <th>Prazo</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => {
              const status = companyStatus(company);
              const permanentAccess = company.approved && !company.paidUntil;
              return (
                <tr key={company.id}>
                  <td className="font-semibold">{company.name}</td>
                  <td>{company.ownerEmail}</td>
                  <td>{new Date(company.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td><span className={`pill ${status.className}`}>{status.label}</span></td>
                  <td>
                    {company.paidUntil ? new Date(company.paidUntil).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <input
                        className="input w-20"
                        type="number"
                        min={1}
                        max={3650}
                        aria-label={`Dias para ${company.name}`}
                        value={days[company.id] ?? 30}
                        onChange={(event) => setDays((current) => ({ ...current, [company.id]: Number(event.target.value) }))}
                      />
                      <button
                        className="btn-primary whitespace-nowrap"
                        disabled={!company.emailVerified || permanentAccess || loadingId === company.id}
                        onClick={() => activate(company)}
                      >
                        {loadingId === company.id ? "Ativando..." : permanentAccess ? "Sem prazo" : company.approved ? "Renovar" : "Ativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mobile-list">
        {companies.map((company) => {
          const status = companyStatus(company);
          const permanentAccess = company.approved && !company.paidUntil;
          return (
            <article className="mobile-record" key={company.id}>
              <div className="mobile-record-header">
                <div><strong>{company.name}</strong><small className="block mt-1">{company.ownerEmail}</small></div>
                <span className={`pill ${status.className}`}>{status.label}</span>
              </div>
              <div className="mobile-record-footer">
                <input
                  className="input w-24"
                  type="number"
                  min={1}
                  max={3650}
                  aria-label={`Dias para ${company.name}`}
                  value={days[company.id] ?? 30}
                  onChange={(event) => setDays((current) => ({ ...current, [company.id]: Number(event.target.value) }))}
                />
                <button
                  className="btn-primary"
                  disabled={!company.emailVerified || permanentAccess || loadingId === company.id}
                  onClick={() => activate(company)}
                >
                  {loadingId === company.id ? "Ativando..." : permanentAccess ? "Sem prazo" : company.approved ? "Renovar" : "Ativar"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
