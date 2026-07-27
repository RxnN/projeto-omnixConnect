import { requirePermission } from "@/lib/auth";
import { getEmpresaById, listFiliais } from "@/lib/repo";
import { estimateFilialUpgrade } from "@/lib/billing";
import FilialForm from "@/components/FilialForm";
import FilialUpgradeRequest from "@/components/FilialUpgradeRequest";
import { formatDateShort } from "@/lib/format";
import PageHeader from "@/components/PageHeader";

export default async function FiliaisPage() {
  const user = await requirePermission("MANAGE_BRANCHES");
  const [filiais, empresa] = await Promise.all([listFiliais(user.empresaId), getEmpresaById(user.empresaId)]);
  const limite = empresa?.maxFiliais ?? 1;
  const ativas = filiais.filter((f) => f.approved);
  const pendente = filiais.find((f) => !f.approved);
  const noLimite = ativas.length >= limite;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader eyebrow="Estrutura da empresa" title="Filiais" description="Gerencie as unidades e mantenha catálogos e estoques separados." />

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Filiais cadastradas</h2>
          <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
            {ativas.length} de {limite} licenciada(s)
          </span>
        </div>
        <ul className="grid sm:grid-cols-2 gap-3">
          {filiais.map((f) => (
            <li key={f.id} className="rounded-xl border p-4 flex items-center justify-between gap-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)" }}>
              <span>
                <strong className="block">{f.name}</strong>
                <small style={{ color: f.approved ? "var(--ink-soft)" : "var(--warn)" }}>
                  {f.approved ? "Filial ativa" : "Aguardando aprovação"}
                </small>
              </span>
              <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
                criada em {formatDateShort(new Date(f.createdAt))}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Nova filial</h2>
        {pendente ? (
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Sua solicitação para "{pendente.name}" está aguardando aprovação da equipe.
          </p>
        ) : noLimite ? (
          <FilialUpgradeRequest estimate={estimateFilialUpgrade(ativas.length)} />
        ) : (
          <FilialForm />
        )}
      </div>
    </div>
  );
}
