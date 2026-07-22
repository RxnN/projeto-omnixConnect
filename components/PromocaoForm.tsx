"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import ProductAutocomplete from "./ProductAutocomplete";

export default function PromocaoForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [promoPrice, setPromoPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setProduct(null);
    setPromoPrice("");
    setStartDate("");
    setEndDate("");
    setMinQuantity("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!product) {
      setError("Selecione um produto.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/promocoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          promoPrice,
          startDate: startDate || "",
          endDate: endDate || "",
          minQuantity: minQuantity || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar a promoção.");
        setLoading(false);
        return;
      }
      resetForm();
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label">Produto</label>
        {product ? (
          <div className="flex items-center justify-between gap-2 input">
            <span className="truncate">
              {product.name} <span style={{ color: "var(--ink-soft)" }}>({product.code})</span>
            </span>
            <button type="button" onClick={() => setProduct(null)} className="text-xs font-semibold shrink-0">
              Trocar
            </button>
          </div>
        ) : (
          <ProductAutocomplete products={products} onSelect={setProduct} />
        )}
      </div>

      <div>
        <label className="label">Preço promocional</label>
        <input
          type="number"
          min="0"
          step="0.01"
          required
          className="input"
          value={promoPrice}
          onChange={(e) => setPromoPrice(e.target.value)}
          placeholder="Ex: 24.90"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Início (opcional)</label>
          <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Fim (opcional)</label>
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Quantidade mínima por pedido (opcional)</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="input"
          value={minQuantity}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "" || /^\d+$/.test(raw)) setMinQuantity(raw);
          }}
          placeholder="Ex: 6 (leve 6 ou mais, pague esse preço)"
        />
        <p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>
          Deixe em branco pra valer desde a 1ª unidade.
        </p>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Criando..." : "+ Nova promoção"}
      </button>
    </form>
  );
}
