import { requireRole } from "@/lib/auth";
import { getAdegaById, listFiliais } from "@/lib/repo";
import FilialForm from "@/components/FilialForm";
import { formatDateShort } from "@/lib/format";

export default async function FiliaisPage() {
  const user = await requireRole(["OWNER"]);
  const [filiais, adega] = await Promise.all([listFiliais(user.adegaId), getAdegaById(user.adegaId)]);
  const limite = adega?.maxFiliais ?? 1;
  const noLimite = filiais.length >= limite;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Filiais</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          Cada filial tem seu próprio catálogo de produtos e estoque. Troque entre elas pelo seletor no menu.
        </p>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Filiais cadastradas</h2>
          <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
            {filiais.length} de {limite} licenciada(s)
          </span>
        </div>
        <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
          {filiais.map((f) => (
            <li key={f.id} className="py-2 flex items-center justify-between">
              <span className="font-medium">{f.name}</span>
              <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
                criada em {formatDateShort(new Date(f.createdAt))}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Nova filial</h2>
        {noLimite ? (
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Sua conta está licenciada para {limite} filial(is) e já atingiu o limite. Fale com a gente pra liberar
            mais.
          </p>
        ) : (
          <FilialForm />
        )}
      </div>
    </div>
  );
}
