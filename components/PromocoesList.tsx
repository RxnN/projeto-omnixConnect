"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, Promotion } from "@/lib/types";
import { formatBRL, formatDateShort } from "@/lib/format";

function statusOf(promotion: Promotion): { label: string; color: string } {
  const now = new Date();
  if (promotion.startDate && new Date(promotion.startDate) > now) {
    return { label: "Agendada", color: "var(--ink-soft)" };
  }
  if (promotion.endDate && new Date(promotion.endDate) < now) {
    return { label: "Expirada", color: "var(--ink-soft)" };
  }
  return { label: "Ativa", color: "var(--ok)" };
}

export default function PromocoesList({ promotions, products }: { promotions: Promotion[]; products: Product[] }) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const productById = new Map(products.map((p) => [p.id, p]));

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      await fetch(`/api/promocoes/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setRemovingId(null);
    }
  }

  if (promotions.length === 0) {
    return (
      <p className="text-sm py-2" style={{ color: "var(--ink-soft)" }}>
        Nenhuma promoção cadastrada nesta filial ainda.
      </p>
    );
  }

  return (
    <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
      {promotions.map((promo) => {
        const product = productById.get(promo.productId);
        const status = statusOf(promo);
        return (
          <li key={promo.id} className="py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{product?.name ?? "Produto removido"}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>
                {formatBRL(promo.promoPrice)}
                {promo.minQuantity ? ` · a partir de ${promo.minQuantity} un.` : ""}
                {promo.startDate ? ` · de ${formatDateShort(new Date(promo.startDate))}` : ""}
                {promo.endDate ? ` até ${formatDateShort(new Date(promo.endDate))}` : ""}
              </p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: status.color }}>
                {status.label}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(promo.id)}
              disabled={removingId === promo.id}
              className="text-xs font-medium shrink-0"
              style={{ color: "var(--danger)" }}
            >
              Remover
            </button>
          </li>
        );
      })}
    </ul>
  );
}
