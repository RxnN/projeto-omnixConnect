import { requireRole, canAccessReportsFull } from "@/lib/auth";
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
  searchParams: { periodo?: string; from?: string; to?: string };
}) {
  const user = await requireRole(["OWNER", "MANAGER"]);
  const isOwner = canAccessReportsFull(user.role);

  // Gerente só pode ver o mês corrente; dono pode escolher qualquer período.
  const periodo: Periodo = isOwner ? ((searchParams.periodo as Periodo) || "mes") : "mes";
  const { from, to } = resolvePeriodo(periodo, searchParams.from, searchParams.to);

  const [estoque, faturamento, faturamentoPorProduto, rentabilidade, sugestaoCompra, ranking] = await Promise.all([
    getEstoqueAtual(user.adegaId),
    getFaturamento(user.adegaId, from, to),
    getFaturamentoPorProduto(user.adegaId, from, to),
    isOwner ? getRentabilidade(user.adegaId, from, to) : Promise.resolve(null),
    isOwner ? getSugestaoCompra(user.adegaId) : Promise.resolve(null),
    isOwner ? getRankingRecorrencia(user.adegaId, from, to) : Promise.resolve(null),
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
