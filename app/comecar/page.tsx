import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { getCurrentFilialId } from "@/lib/filial-context";
import { listFiliais, listPedidos, listProducts, listUsersByEmpresa } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function ComecarPage() {
  const user = await requireUser();
  const filialId = await getCurrentFilialId(user);
  const [filiais, products, pedidos, users] = await Promise.all([
    listFiliais(user.empresaId), listProducts(filialId), listPedidos(filialId, { limit: 1 }), listUsersByEmpresa(user.empresaId),
  ]);
  const steps = [
    { done: filiais.length > 0, title: "Confirme sua filial", href: "/filiais", text: "Confira a matriz e cadastre outras unidades quando necessário." },
    { done: products.length > 0, title: "Cadastre produtos", href: "/produtos/novo", text: "Monte o catálogo e defina os alertas de estoque mínimo." },
    { done: users.length > 1, title: "Prepare sua equipe", href: "/usuarios", text: "Convide funcionários e ajuste suas permissões." },
    { done: pedidos.length > 0, title: "Registre a primeira operação", href: "/pedidos", text: "Faça uma venda ou registre uma entrada de estoque." },
  ];
  const completed = steps.filter((step) => step.done).length;
  return <div className="space-y-6"><PageHeader eyebrow="Primeiros passos" title="Configure sua empresa" description={`${completed} de ${steps.length} etapas concluídas.`} /><div className="grid gap-3">{steps.map((step) => <Link href={step.href} key={step.title} className="card flex items-start gap-4"><span className={`pill ${step.done ? "pill-ok" : "pill-warn"}`}>{step.done ? "Concluído" : "Pendente"}</span><span><strong className="block">{step.title}</strong><small style={{ color: "var(--ink-soft)" }}>{step.text}</small></span></Link>)}</div></div>;
}
