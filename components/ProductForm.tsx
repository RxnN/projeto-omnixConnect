"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PackageType, Product } from "@/lib/types";

const CATEGORIAS_SUGERIDAS = [
  "Vinho Tinto",
  "Vinho Branco",
  "Vinho Rosé",
  "Espumante",
  "Whisky",
  "Licor",
  "Vodka",
  "Gin",
  "Cerveja Especial",
];

const UNIDADES_POR_EMBALAGEM_SUGERIDAS = ["6", "12", "24"];

export default function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const isEdit = Boolean(product);

  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [unit, setUnit] = useState(product?.unit ?? "un");
  const [costPrice, setCostPrice] = useState(String(product?.costPrice ?? ""));
  const [salePrice, setSalePrice] = useState(String(product?.salePrice ?? ""));
  const [currentStock, setCurrentStock] = useState(String(product?.currentStock ?? "0"));
  const [minStockAlert, setMinStockAlert] = useState(
    product?.minStockAlert != null ? String(product.minStockAlert) : ""
  );
  const [packageType, setPackageType] = useState<PackageType | "">(product?.packageType ?? "");
  const [unitsPerPackage, setUnitsPerPackage] = useState(
    product?.unitsPerPackage != null ? String(product.unitsPerPackage) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** Aceita apenas dígitos inteiros; qualquer outro caractere (ponto, vírgula, sinal) é ignorado. */
  function handleIntegerInput(setter: (v: string) => void, raw: string) {
    if (raw === "" || /^\d+$/.test(raw)) setter(raw);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (packageType !== "" && (unitsPerPackage === "" || Number(unitsPerPackage) < 1)) {
      setError("Informe quantas unidades tem cada caixa/pacote.");
      return;
    }

    setLoading(true);

    const payload = {
      name,
      category,
      unit,
      costPrice: Number(costPrice),
      salePrice: Number(salePrice),
      currentStock: currentStock === "" ? 0 : Number(currentStock),
      minStockAlert: minStockAlert === "" ? null : Number(minStockAlert),
      packageType: packageType === "" ? null : packageType,
      unitsPerPackage: packageType === "" || unitsPerPackage === "" ? null : Number(unitsPerPackage),
    };

    try {
      const res = await fetch(isEdit ? `/api/produtos/${product!.id}` : "/api/produtos", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível salvar o produto.");
        setLoading(false);
        return;
      }
      const id = isEdit ? product!.id : data.product.id;
      router.push(`/produtos/${id}`);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card grid sm:grid-cols-2 gap-4 max-w-2xl">
      <div className="sm:col-span-2">
        <label className="label">Nome do produto</label>
        <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {isEdit && (
        <div>
          <label className="label">Código</label>
          <input disabled className="input" style={{ color: "var(--ink-soft)" }} value={product!.code} />
        </div>
      )}

      <div>
        <label className="label">Categoria</label>
        <input
          required
          list="categorias"
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <datalist id="categorias">
          {CATEGORIAS_SUGERIDAS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="label">Unidade (un, L, ml...)</label>
        <input required className="input" value={unit} onChange={(e) => setUnit(e.target.value)} />
      </div>

      <div>
        <label className="label">Preço de custo (R$)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          required
          className="input"
          value={costPrice}
          onChange={(e) => setCostPrice(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Preço de venda (R$)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          required
          className="input"
          value={salePrice}
          onChange={(e) => setSalePrice(e.target.value)}
        />
      </div>

      {!isEdit && (
        <div>
          <label className="label">Estoque inicial</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="input"
            value={currentStock}
            onChange={(e) => handleIntegerInput(setCurrentStock, e.target.value)}
          />
        </div>
      )}

      <div>
        <label className="label">Alerta de estoque mínimo (opcional)</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="input"
          value={minStockAlert}
          onChange={(e) => handleIntegerInput(setMinStockAlert, e.target.value)}
        />
      </div>

      <div>
        <label className="label">Entra como (opcional)</label>
        <select
          className="input"
          value={packageType}
          onChange={(e) => {
            setPackageType(e.target.value as PackageType | "");
            if (e.target.value === "") setUnitsPerPackage("");
          }}
        >
          <option value="">Somente unidade (UNID)</option>
          <option value="CX">Caixa (CX)</option>
          <option value="PCT">Pacote (PCT)</option>
        </select>
      </div>

      {packageType !== "" && (
        <div>
          <label className="label">Unidades por {packageType === "CX" ? "caixa" : "pacote"}</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            list="unidades-por-embalagem"
            className="input"
            placeholder="Ex: 12"
            value={unitsPerPackage}
            onChange={(e) => handleIntegerInput(setUnitsPerPackage, e.target.value)}
          />
          <datalist id="unidades-por-embalagem">
            {UNIDADES_POR_EMBALAGEM_SUGERIDAS.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <p className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>
            Poderá ser lançado em {packageType} ou em UNID nas telas de Entrada e Pedidos.
          </p>
        </div>
      )}

      {error && (
        <p className="sm:col-span-2 text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <div className="sm:col-span-2 flex gap-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar produto"}
        </button>
      </div>
    </form>
  );
}
