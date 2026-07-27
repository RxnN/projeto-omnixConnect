import { getEffectivePermissions, requirePermission } from "@/lib/auth";
import { getCurrentFilialId } from "@/lib/filial-context";
import { listActiveFiliais } from "@/lib/repo";
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
import PageHeader from "@/components/PageHeader";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; from?: string; to?: string; filial?: string }>;
}) {
  const filters = await searchParams;
  const user = await requirePermission("VIEW_REPORTS");
  const permissions = await getEffectivePermissions(user);
  const canChooseBranch = user.role === "OWNER";
  const canViewAdvanced = permissions.VIEW_COSTS_MARGIN;

  // Gerente/funcionário estão sempre travados na própria filial (relatório nunca
  // mistura dados de outras filiais que essa pessoa não trabalha). Dono enxerga
  // "todas as filiais" por padrão (consolidado), com opção de filtrar por uma só.
  const filiais = canChooseBranch ? await listActiveFiliais(user.empresaId) : [];
  let filialId: string | undefined;
  if (canChooseBranch) {
    const requested = filiais.find((f) => f.id === filters.filial);
    filialId = requested?.id;
  } else {
    filialId = await getCurrentFilialId(user);
  }

  // Gerente só pode ver o mês corrente; dono pode escolher qualquer período.
  const periodo: Periodo = canViewAdvanced ? ((filters.periodo as Periodo) || "mes") : "mes";
  const { from, to } = resolvePeriodo(periodo, filters.from, filters.to);

  const [estoqueRaw, faturamento, faturamentoPorProduto, rentabilidade, sugestaoCompra, ranking] = await Promise.all([
    getEstoqueAtual(user.empresaId, filialId),
    getFaturamento(user.empresaId, from, to, filialId),
    getFaturamentoPorProduto(user.empresaId, from, to, filialId),
    canViewAdvanced ? getRentabilidade(user.empresaId, from, to, filialId) : Promise.resolve(null),
    canViewAdvanced ? getSugestaoCompra(user.empresaId, filialId) : Promise.resolve(null),
    canViewAdvanced ? getRankingRecorrencia(user.empresaId, from, to, filialId) : Promise.resolve(null),
  ]);

  // RelatoriosTabs é Client Component: qualquer campo aqui atravessa para o payload do
  // navegador mesmo que a UI não renderize a coluna. Sem VIEW_COSTS_MARGIN, zera o custo
  // antes de sair do servidor em vez de só esconder a coluna.
  const estoque = canViewAdvanced
    ? estoqueRaw
    : estoqueRaw.map((item) => ({ ...item, costPrice: 0, valorEmEstoque: 0 }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Visão da operação"
        title="Relatórios"
        description={canViewAdvanced
          ? "Acompanhe estoque, rentabilidade, faturamento, sugestão de compra e recorrência de produtos."
          : "Acompanhe o estoque atual e o faturamento do mês corrente."}
      />

      <RelatoriosTabs
        canViewAdvanced={canViewAdvanced}
        canChooseBranch={canChooseBranch}
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
        searchFrom={filters.from}
        searchTo={filters.to}
      />
    </div>
  );
}
