import { requireRole, canAccessReportsFull } from "@/lib/auth";
import { getCurrentFilialId } from "@/lib/filial-context";
import { listFiliais } from "@/lib/repo";
import {
  getEstoqueAtual,
  getFaturamento,
  getFaturamentoPorProduto,
  getRentabilidade,
  getSugestaoCompra,
  getRankingRecorrencia,
  resolvePeriodo,
  type Periodo,
} from "@/lib/reports";
import RelatoriosTabs from "@/components/relatorios/RelatoriosTabs";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { periodo?: string; from?: string; to?: string; filial?: string };
}) {
  const user = await requireRole(["OWNER", "MANAGER"]);
  const isOwner = canAccessReportsFull(user.role);

  // Gerente/funcionário estão sempre travados na própria filial (relatório nunca
  // mistura dados de outras filiais que essa pessoa não trabalha). Dono enxerga
  // "todas as filiais" por padrão (consolidado), com opção de filtrar por uma só.
  const filiais = isOwner ? await listFiliais(user.adegaId) : [];
  let filialId: string | undefined;
  if (isOwner) {
    const requested = filiais.find((f) => f.id === searchParams.filial);
    filialId = requested?.id;
  } else {
    filialId = await getCurrentFilialId(user);
  }

  // Gerente só pode ver o mês corrente; dono pode escolher qualquer período.
  const periodo: Periodo = isOwner ? ((searchParams.periodo as Periodo) || "mes") : "mes";
  const { from, to } = resolvePeriodo(periodo, searchParams.from, searchParams.to);

  const [estoque, faturamento, faturamentoPorProduto, rentabilidade, sugestaoCompra, ranking] = await Promise.all([
    getEstoqueAtual(user.adegaId, filialId),
    getFaturamento(user.adegaId, from, to, filialId),
    getFaturamentoPorProduto(user.adegaId, from, to, filialId),
    isOwner ? getRentabilidade(user.adegaId, from, to, filialId) : Promise.resolve(null),
    isOwner ? getSugestaoCompra(user.adegaId, filialId) : Promise.resolve(null),
    isOwner ? getRankingRecorrencia(user.adegaId, from, to, filialId) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          {isOwner
            ? "Visão completa da adega: estoque, rentabilidade, faturamento, sugestão de compra e produtos mais recorrentes."
            : "Visão gerencial: estoque atual e faturamento do mês corrente."}
        </p>
      </div>

      <RelatoriosTabs
        isOwner={isOwner}
        filiais={filiais}
        filialId={filialId}
        estoque={estoque}
        rentabilidade={rentabilidade}
        faturamentoResumo={faturamento}
        faturamentoPorProduto={faturamentoPorProduto}
        sugestaoCompra={sugestaoCompra}
        ranking={ranking}
        from={from}
        to={to}
        periodo={periodo}
        searchFrom={searchParams.from}
        searchTo={searchParams.to}
      />
    </div>
  );
}
