"use client";

import { useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { formatBRL } from "@/lib/format";
import ProductAutocomplete from "./ProductAutocomplete";

interface ParsedItem {
  ean: string | null;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitValue: number;
  matchedProductId: string | null;
  matchedProductName: string | null;
}

interface ReviewItem extends ParsedItem {
  selectedProduct: Product | null;
  include: boolean;
}

interface NFeInfo {
  number: string | null;
  supplierName: string | null;
}

export default function NFeImport({
  products,
  onImport,
}: {
  products: Product[];
  onImport: (items: { product: Product; quantity: number; unitValue: number }[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nfeInfo, setNfeInfo] = useState<NFeInfo | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setItems([]);
    setNfeInfo(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/nfe-import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível importar a NF-e.");
        return;
      }
      setNfeInfo(data.nfe);
      setItems(
        (data.items as ParsedItem[]).map((it) => ({
          ...it,
          selectedProduct: it.matchedProductId ? productById.get(it.matchedProductId) ?? null : null,
          include: true,
        }))
      );
    } catch {
      setError("Erro de conexão ao importar a NF-e.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function updateItem(index: number, patch: Partial<ReviewItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function handleAddAll() {
    const toAdd = items
      .filter((it) => it.include && it.selectedProduct)
      .map((it) => ({ product: it.selectedProduct as Product, quantity: it.quantity, unitValue: it.unitValue }));
    if (toAdd.length === 0) {
      setError("Nenhum item pronto para adicionar. Vincule os produtos não encontrados a um produto do sistema.");
      return;
    }
    onImport(toAdd);
    setItems([]);
    setNfeInfo(null);
    setError(null);
  }

  const readyCount = items.filter((it) => it.include && it.selectedProduct).length;
  const unmatchedCount = items.filter((it) => !it.selectedProduct).length;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold">Importar Nota Fiscal (XML)</h2>
          <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
            Suba o arquivo .xml da NF-e do fornecedor para trazer os produtos automaticamente.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {loading ? "Lendo..." : "Escolher arquivo XML"}
          </button>
          <input ref={fileInputRef} type="file" accept=".xml" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {nfeInfo && (
        <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
          NF-e {nfeInfo.number ?? "-"}
          {nfeInfo.supplierName ? ` · ${nfeInfo.supplierName}` : ""}
        </p>
      )}

      {items.length > 0 && (
        <>
          {unmatchedCount > 0 && (
            <p className="text-xs rounded-md p-2" style={{ color: "var(--warn)", backgroundColor: "var(--warn-soft)" }}>
              {unmatchedCount} produto(s) da nota não têm código de barras cadastrado em nenhum produto seu.
              Vincule manualmente ou desmarque para ignorar.
            </p>
          )}
          <div className="overflow-x-auto -mx-2">
            <table className="min-w-full text-sm">
              <thead style={{ color: "var(--ink-soft)" }}>
                <tr>
                  <th className="px-2 py-1"></th>
                  <th className="text-left px-2 py-1 font-semibold uppercase text-xs tracking-wide">Produto na NF</th>
                  <th className="text-right px-2 py-1 font-semibold uppercase text-xs tracking-wide">Qtde</th>
                  <th className="text-right px-2 py-1 font-semibold uppercase text-xs tracking-wide">Valor unit.</th>
                  <th className="text-left px-2 py-1 font-semibold uppercase text-xs tracking-wide">Produto no sistema</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1.5 align-top">
                      <input
                        type="checkbox"
                        checked={item.include}
                        onChange={(e) => updateItem(i, { include: e.target.checked })}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <div className="font-medium">{item.description}</div>
                      <div className="text-xs" style={{ color: "var(--ink-soft)" }}>
                        {item.ean ?? "sem código de barras"}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right align-top tabular">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-2 py-1.5 text-right align-top tabular">{formatBRL(item.unitValue)}</td>
                    <td className="px-2 py-1.5 min-w-[220px] align-top">
                      {item.selectedProduct ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{item.selectedProduct.name}</span>
                          <button
                            type="button"
                            className="text-xs font-medium hover:underline"
                            style={{ color: "var(--accent)" }}
                            onClick={() => updateItem(i, { selectedProduct: null })}
                          >
                            trocar
                          </button>
                        </div>
                      ) : (
                        <ProductAutocomplete
                          products={products}
                          onSelect={(p) => updateItem(i, { selectedProduct: p, include: true })}
                          placeholder="Vincular a um produto..."
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn-primary" onClick={handleAddAll} disabled={readyCount === 0}>
            Adicionar {readyCount} item(ns) ao pedido de entrada
          </button>
        </>
      )}
    </div>
  );
}
