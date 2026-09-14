import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { getSubscriptionStatus, requireUser } from "@/lib/auth";
import { getCurrentFilialId } from "@/lib/filial-context";
import { getEmpresaById, listFiliais, listProducts } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AlertasPage() {
  const user = await requireUser();
  const filialId = await getCurrentFilialId(user);
  const [products, empresa, filiais] = await Promise.all([
    listProducts(filialId, { activeOnly: true }),
    getEmpresaById(user.empresaId),
    listFiliais(user.empresaId),
  ]);
  const lowStock = products.filter((product) => product.currentStock <= (product.minStockAlert ?? 0));
  const subscription = empresa ? getSubscriptionStatus(empresa) : null;
  const pendingBranches = filiais.filter((filial) => !filial.approved);
  const total = lowStock.length + pendingBranches.length + (subscription?.expiringSoon ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Acompanhamento" title="Alertas" description="Pendências que precisam da atenção da empresa." />
      {total === 0 ? <div className="card"><strong>Tudo em ordem</strong><p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>Não há alertas ativos nesta filial.</p></div> : null}
      {subscription?.expiringSoon ? <div className="card"><span className="pill pill-warn">Assinatura</span><h2 className="font-bold mt-3">Acesso vence em {subscription.daysRemaining} dia(s)</h2><p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>Organize a renovação para evitar a interrupção do acesso.</p></div> : null}
      {pendingBranches.map((filial) => <div className="card" key={filial.id}><span className="pill pill-warn">Filial pendente</span><h2 className="font-bold mt-3">{filial.name}</h2><p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>Aguardando liberação para começar a operar.</p></div>)}
      {lowStock.length > 0 ? <div className="card data-card overflow-x-auto"><div className="section-heading"><h2>Estoque baixo</h2><Link href="/produtos" className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Abrir produtos</Link></div><table className="data-table"><thead><tr><th>Produto</th><th>Saldo</th><th>Mínimo</th></tr></thead><tbody>{lowStock.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.currentStock} {product.unit}</td><td>{product.minStockAlert ?? 0} {product.unit}</td></tr>)}</tbody></table></div> : null}
    </div>
  );
}
