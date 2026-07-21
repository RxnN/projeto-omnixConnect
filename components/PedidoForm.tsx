"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MovementType, PackageType, Product, Role } from "@/lib/types";
import { formatBRL } from "@/lib/format";
import ProductAutocomplete, { type ProductAutocompleteHandle } from "./ProductAutocomplete";
import NFeImport from "./NFeImport";

const PACKAGE_LABEL: Record<PackageType, string> = { CX: "Caixa", PCT: "Pacote" };

/** Leitores de código de barras "digitam" muito mais rápido que uma pessoa
 * (poucos ms entre caracteres) e terminam com Enter. Detectando esse padrão em
 * qualquer lugar da página, adicionamos o produto direto no pedido sem precisar
 * clicar em nenhum campo específico primeiro. */
const SCAN_MAX_GAP_MS = 50;
const SCAN_MIN_LENGTH = 4;

interface CartItem {
  productId: string;
  name: string;
  unit: string;
  category: string;
  packageType: PackageType | null;
  unitsPerPackage: number | null;
  /** Em qual unidade a quantidade digitada está sendo lançada. */
  mode: "UNIT" | "PACKAGE";
  /** Quantidade digitada pelo usuário, no termo do `mode` atual (unidades OU caixas/pacotes). */
  displayQty: number;
  unitValue: number;
  source: "MANUAL" | "QRCODE";
}

/** Quantidade real em unidades (o que de fato entra/sai do estoque). */
function baseQuantity(item: CartItem): number {
  return item.mode === "PACKAGE" && item.unitsPerPackage ? item.displayQty * item.unitsPerPackage : item.displayQty;
}

interface InsufficientItem {
  productId: string;
  productName: string;
  unit: string;
  available: number;
  requested: number;
}

export default function PedidoForm({
  products,
  type,
  userRole,
}: {
  products: Product[];
  type: MovementType;
  userRole: Role;
}) {
  const router = useRouter();
  const isEntrada = type === "IN";
  // Funcionário vende sempre pelo preço de tabela; só dono/gerente pode negociar preço.
  const canEditPrice = isEntrada || userRole !== "EMPLOYEE";
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [insufficient, setInsufficient] = useState<InsufficientItem[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const autocompleteRef = useRef<ProductAutocompleteHandle>(null);

  const total = useMemo(() => cart.reduce((sum, item) => sum + baseQuantity(item) * item.unitValue, 0), [cart]);

  function resetMessages() {
    setError(null);
    setWarning(null);
    setInsufficient([]);
    setSuccess(null);
  }

  function addToCart(product: Product, source: "MANUAL" | "QRCODE") {
    resetMessages();
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, displayQty: item.displayQty + 1, source } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          category: product.category,
          packageType: product.packageType,
          unitsPerPackage: product.unitsPerPackage,
          mode: "UNIT",
          displayQty: 1,
          unitValue: isEntrada ? product.costPrice : product.salePrice,
          source,
        },
      ];
    });
  }

  /** Usado pela importação de NF-e: adiciona com a quantidade e o valor exatos da nota,
   * em vez de incrementar 1 unidade por vez como na busca/leitor. */
  function addToCartWithQuantity(product: Product, quantity: number, unitValue: number) {
    resetMessages();
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, mode: "UNIT", displayQty: baseQuantity(item) + quantity, unitValue }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          category: product.category,
          packageType: product.packageType,
          unitsPerPackage: product.unitsPerPackage,
          mode: "UNIT",
          displayQty: quantity,
          unitValue,
          source: "MANUAL",
        },
      ];
    });
  }

  function handleNFeImport(items: { product: Product; quantity: number; unitValue: number }[]) {
    items.forEach((it) => addToCartWithQuantity(it.product, it.quantity, it.unitValue));
    setSuccess(`${items.length} produto(s) da NF-e adicionados ao pedido de entrada.`);
  }

  function handleBarcodeScanned(code: string) {
    fetch(`/api/product-lookup?code=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.product) {
          addToCart(data.product, "QRCODE");
        } else {
          setError(data.error ?? `Produto não encontrado para o código "${code}".`);
        }
      })
      .catch(() => setError("Erro ao consultar produto escaneado."));
  }

  const handleBarcodeScannedRef = useRef(handleBarcodeScanned);
  handleBarcodeScannedRef.current = handleBarcodeScanned;

  // Detecta leituras de um leitor físico de código de barras em qualquer parte da tela
  // (sem precisar clicar em nenhum campo antes) pela velocidade de digitação das teclas.
  useEffect(() => {
    let buffer = "";
    let lastTime = 0;

    function handleKeyDown(e: KeyboardEvent) {
      const active = document.activeElement as HTMLElement | null;
      if (active?.dataset.barcodeIgnore === "true") return;

      const now = Date.now();
      const gap = now - lastTime;
      lastTime = now;

      if (e.key === "Enter") {
        const scanned = buffer;
        buffer = "";
        if (scanned.length >= SCAN_MIN_LENGTH) {
          e.preventDefault();
          e.stopPropagation();
          autocompleteRef.current?.clear();
          handleBarcodeScannedRef.current(scanned);
        }
        return;
      }

      if (e.key.length === 1) {
        buffer = gap <= SCAN_MAX_GAP_MS ? buffer + e.key : e.key;
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  /** Aceita apenas dígitos inteiros; qualquer outro caractere (ponto, vírgula, sinal) é ignorado. */
  function handleQuantityInput(productId: string, raw: string) {
    if (raw !== "" && !/^\d+$/.test(raw)) return;
    const displayQty = raw === "" ? 0 : Number(raw);
    setCart((prev) => prev.map((item) => (item.productId === productId ? { ...item, displayQty } : item)));
  }

  /** Troca entre lançar em UNID ou em CX/PCT; reinicia a quantidade para evitar conversões estranhas. */
  function updateMode(productId: string, mode: "UNIT" | "PACKAGE") {
    setCart((prev) => prev.map((item) => (item.productId === productId ? { ...item, mode, displayQty: 1 } : item)));
  }

  function updateUnitValue(productId: string, unitValue: number) {
    setCart((prev) => prev.map((item) => (item.productId === productId ? { ...item, unitValue } : item)));
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  async function closePedido(force = false) {
    setLoading(true);
    resetMessages();
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: baseQuantity(item),
            unitValue: item.unitValue,
            source: item.source,
          })),
          force,
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data.warning) {
        setWarning(data.warning);
        setInsufficient(data.insufficient ?? []);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Não foi possível fechar o pedido.");
        setLoading(false);
        return;
      }

      setSuccess(
        `Pedido de ${isEntrada ? "entrada" : "saída"} #${data.pedido.number} fechado com sucesso. Total: ${formatBRL(
          data.pedido.totalValue
        )}.`
      );
      setCart([]);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) {
      setError("Adicione ao menos um produto ao pedido.");
      return;
    }
    if (cart.some((item) => !item.displayQty || item.displayQty <= 0)) {
      setError("Informe uma quantidade válida para todos os itens.");
      return;
    }
    closePedido(false);
  }

  return (
    <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-5 items-start">
      <div className="space-y-5">
        {isEntrada && <NFeImport products={products} onImport={handleNFeImport} />}

        <div className="panel space-y-3">
          <label className="label">Adicionar produto ao pedido de {isEntrada ? "entrada" : "saída"}</label>
          <ProductAutocomplete
            ref={autocompleteRef}
            products={products}
            onSelect={(p) => addToCart(p, "MANUAL")}
            autoFocus
          />
          <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
            Pode usar um leitor de código de barras a qualquer momento nesta tela — o produto é adicionado
            automaticamente.
          </p>
        </div>
      </div>

      <div className="panel flex flex-col lg:sticky lg:top-6">
        <h2 className="font-display font-bold text-sm uppercase tracking-wide mb-3" style={{ color: "var(--ink-soft)" }}>
          Pedido de {isEntrada ? "entrada" : "saída"}
        </h2>

        {cart.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: "var(--ink-soft)" }}>
            Nenhum produto no pedido de {isEntrada ? "entrada" : "saída"} ainda. Adicione produtos ao lado.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {cart.map((item) => (
              <li key={item.productId} className="py-3 first:pt-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--ink-soft)" }}>
                      {item.category}
                      {item.source === "QRCODE" && <span className="ml-1.5 font-medium text-accent">(Escaneado)</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="text-xs shrink-0 font-medium"
                    style={{ color: "var(--danger)" }}
                  >
                    Remover
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.packageType && (
                    <select
                      className="input text-xs w-24 py-1.5"
                      value={item.mode}
                      onChange={(e) => updateMode(item.productId, e.target.value as "UNIT" | "PACKAGE")}
                    >
                      <option value="UNIT">UNID</option>
                      <option value="PACKAGE">
                        {item.packageType} ({item.unitsPerPackage} un)
                      </option>
                    </select>
                  )}
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    data-barcode-ignore="true"
                    className="input text-right w-16 py-1.5 tabular"
                    value={item.displayQty === 0 ? "" : item.displayQty}
                    onChange={(e) => handleQuantityInput(item.productId, e.target.value)}
                  />
                  <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
                    ×
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!canEditPrice}
                    title={canEditPrice ? undefined : "Só dono ou gerente pode alterar o preço de venda"}
                    data-barcode-ignore="true"
                    className="input text-right w-20 py-1.5 tabular disabled:opacity-60"
                    value={item.unitValue}
                    onChange={(e) => updateUnitValue(item.productId, Number(e.target.value))}
                  />
                  <span className="ml-auto font-semibold text-sm tabular">
                    {formatBRL(baseQuantity(item) * item.unitValue)}
                  </span>
                </div>
                {item.mode === "PACKAGE" && item.unitsPerPackage && (
                  <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
                    = {baseQuantity(item)} un
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-baseline justify-between border-t pt-3 mt-3" style={{ borderColor: "var(--ink)" }}>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
            Total
          </span>
          <span className="font-display font-extrabold text-2xl tabular">{formatBRL(total)}</span>
        </div>

        {error && (
          <p className="text-sm mt-3" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm mt-3" style={{ color: "var(--ok)" }}>
            {success}
          </p>
        )}
        {warning && (
          <div className="rounded-lg p-3 space-y-2 mt-3" style={{ backgroundColor: "var(--warn-soft)" }}>
            <p className="text-sm" style={{ color: "var(--warn)" }}>
              {warning}
            </p>
            {insufficient.length > 0 && (
              <ul className="text-xs list-disc list-inside" style={{ color: "var(--warn)" }}>
                {insufficient.map((i) => (
                  <li key={i.productId}>
                    {i.productName}: disponível {i.available} {i.unit}, pedido {i.requested} {i.unit}
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => closePedido(true)} className="btn-danger" disabled={loading}>
              Confirmar mesmo assim
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <button type="submit" disabled={loading || cart.length === 0} className="btn-primary w-full mt-4">
            {loading ? "Fechando pedido..." : `Fechar pedido de ${isEntrada ? "entrada" : "saída"}`}
          </button>
        </form>
      </div>
    </div>
  );
}
