import { requireRole } from "@/lib/auth";
import { listProducts, listPromotionsByFilial } from "@/lib/repo";
import { getCurrentFilialId } from "@/lib/filial-context";
import PromocaoForm from "@/components/PromocaoForm";
import PromocoesList from "@/components/PromocoesList";

export default async function PromocoesPage() {
  const user = await requireRole(["OWNER"]);
  const filialId = await getCurrentFilialId(user);
  const [products, promotions] = await Promise.all([
    listProducts(filialId, { activeOnly: true }),
    listPromotionsByFilial(filialId),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Promoções</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          Promoções valem só nesta filial. O preço volta ao normal sozinho quando o período
          acaba ou a quantidade mínima deixa de ser atingida.
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Promoções cadastradas</h2>
        <PromocoesList promotions={promotions} products={products} />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Nova promoção</h2>
        <PromocaoForm products={products} />
      </div>
    </div>
  );
}
