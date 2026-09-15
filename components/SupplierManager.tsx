"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Supplier } from "@/lib/types";

type FormState = {
  name: string;
  cnpjCpf: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
};

const EMPTY_FORM: FormState = { name: "", cnpjCpf: "", contactName: "", email: "", phone: "", notes: "" };

function documentLabel(value: string | null) {
  if (!value) return "Documento não informado";
  if (value.length === 14) return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  return value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

export default function SupplierManager({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [statusId, setStatusId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(supplier: Supplier) {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      cnpjCpf: supplier.cnpjCpf ?? "",
      contactName: supplier.contactName ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      notes: supplier.notes ?? "",
    });
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(editingId ? `/api/fornecedores/${editingId}` : "/api/fornecedores", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível salvar o fornecedor.");
        return;
      }
      setSuccess(editingId ? "Fornecedor atualizado." : "Fornecedor cadastrado.");
      setEditingId(null);
      setForm(EMPTY_FORM);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(supplier: Supplier) {
    setStatusId(supplier.id);
    setError(null);
    try {
      const response = await fetch(`/api/fornecedores/${supplier.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !supplier.active }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error ?? "Não foi possível alterar o fornecedor.");
      else router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setStatusId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form className="panel space-y-4" onSubmit={save}>
        <div className="section-heading">
          <div><h2>{editingId ? "Editar fornecedor" : "Novo fornecedor"}</h2><p>Somente o nome é obrigatório.</p></div>
          {editingId && <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar edição</button>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className="label" htmlFor="supplier-name">Nome ou razão social</label><input id="supplier-name" className="input" value={form.name} onChange={(event) => update("name", event.target.value)} maxLength={200} required /></div>
          <div><label className="label" htmlFor="supplier-document">CNPJ ou CPF</label><input id="supplier-document" className="input" value={form.cnpjCpf} onChange={(event) => update("cnpjCpf", event.target.value)} maxLength={32} inputMode="numeric" placeholder="Opcional" /></div>
          <div><label className="label" htmlFor="supplier-contact">Pessoa de contato</label><input id="supplier-contact" className="input" value={form.contactName} onChange={(event) => update("contactName", event.target.value)} maxLength={200} placeholder="Opcional" /></div>
          <div><label className="label" htmlFor="supplier-email">E-mail</label><input id="supplier-email" className="input" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} maxLength={254} placeholder="Opcional" /></div>
          <div><label className="label" htmlFor="supplier-phone">Telefone</label><input id="supplier-phone" className="input" value={form.phone} onChange={(event) => update("phone", event.target.value)} maxLength={32} inputMode="tel" placeholder="Opcional, com DDD" /></div>
          <div><label className="label" htmlFor="supplier-notes">Observações</label><input id="supplier-notes" className="input" value={form.notes} onChange={(event) => update("notes", event.target.value)} maxLength={1000} placeholder="Prazo, vendedor, condições..." /></div>
        </div>
        {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
        {success && <p className="text-sm" style={{ color: "var(--ok)" }}>{success}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar fornecedor"}</button>
      </form>

      <section>
        <div className="section-heading"><div><h2>Fornecedores cadastrados</h2><p>{suppliers.filter((supplier) => supplier.active).length} ativo(s) de {suppliers.length}</p></div></div>
        {suppliers.length === 0 ? <div className="card text-center py-10"><p className="text-sm" style={{ color: "var(--ink-soft)" }}>Nenhum fornecedor cadastrado ainda.</p></div> : (
          <div className="supplier-grid">
            {suppliers.map((supplier) => (
              <article key={supplier.id} className="card supplier-card" style={!supplier.active ? { opacity: .68 } : undefined}>
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold truncate">{supplier.name}</h3><p className="text-xs mt-1 tabular" style={{ color: "var(--ink-soft)" }}>{documentLabel(supplier.cnpjCpf)}</p></div><span className={`pill ${supplier.active ? "pill-ok" : "pill-muted"}`}>{supplier.active ? "Ativo" : "Inativo"}</span></div>
                <div className="supplier-contact-list">
                  <p><span>Contato</span>{supplier.contactName ?? "Não informado"}</p>
                  <p><span>Telefone</span>{supplier.phone ?? "Não informado"}</p>
                  <p><span>E-mail</span>{supplier.email ?? "Não informado"}</p>
                </div>
                {supplier.notes && <p className="text-xs supplier-notes">{supplier.notes}</p>}
                <div className="flex gap-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}><button type="button" className="btn-secondary flex-1" onClick={() => startEdit(supplier)}>Editar</button><button type="button" className="btn-secondary flex-1" onClick={() => changeStatus(supplier)} disabled={statusId === supplier.id}>{statusId === supplier.id ? "Salvando..." : supplier.active ? "Inativar" : "Reativar"}</button></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
