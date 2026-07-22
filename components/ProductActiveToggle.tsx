"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductActiveToggle({
  productId,
  productName,
  active,
}: {
  productId: string;
  productName: string;
  active: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const nextActive = !active;
    const message = nextActive
      ? `Reativar o produto "${productName}"? Ele volta a aparecer na busca de Pedidos e Entrada.`
      : `Inativar o produto "${productName}"? Ele deixa de aparecer na busca de Pedidos e Entrada, mas o histórico é mantido.`;
    if (!confirm(message)) return;

    setLoading(true);
    const res = await fetch(`/api/produtos/${productId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: nextActive }),
    });
    if (res.ok) {
      router.refresh();
      setLoading(false);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Não foi possível alterar o status do produto.");
      setLoading(false);
    }
  }

  return (
    <button onClick={handleToggle} disabled={loading} className="btn-secondary">
      {loading ? "Salvando..." : active ? "Inativar" : "Reativar"}
    </button>
  );
}
