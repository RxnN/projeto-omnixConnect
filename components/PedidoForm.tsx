"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MovementType, PackageType, PaymentMethod, Product, Promotion, Role } from "@/lib/types";
import { formatBRL } from "@/lib/format";
import { getEffectivePrice } from "@/lib/pricing";
import ProductAutocomplete from "./ProductAutocomplete";
import NFeImport from "./NFeImport";

const PACKAGE_LABEL: Record<PackageType, string> = { CX: "Caixa", PCT: "Pacote" };

const PAYMENT_OPTIONS: Record<MovementType, { value: PaymentMethod; label: string }[]> = {
  OUT: [
    { value: "CARTAO", label: "Cartão" },
    { value: "DINHEIRO", label: "Dinheiro" },
    { value: "PIX", label: "Pix" },
    { value: "FIADO", label: "Fiado" },
  ],
  IN: [
    { value: "BOLETO", label: "Boleto" },
    { value: "DINHEIRO", label: "Dinheiro" },
    { value: "PIX", label: "Pix" },
  ],
};

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
  /** Preço de tabela do produto (custo na entrada, venda na saída) — referência pra
   * recalcular a promoção quando a quantidade muda, sem precisar buscar o produto de novo. */
  basePrice: number;
}

/** Quantidade real em unidades (o que de fato entra/sai do estoque), pra uma quantidade
 * digitada arbitrária no `mode` atual do item. */
function baseQuantityFor(item: Pick<CartItem, "mode" | "unitsPerPackage">, displayQty: number): number {
  return item.mode === "PACKAGE" && item.unitsPerPackage ? displayQty * item.unitsPerPackage : displayQty;
}

function baseQuantity(item: CartItem): number {
  return baseQuantityFor(item, item.displayQty);
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
  promotions = [],
}: {
  products: Product[];
  type: MovementType;
  userRole: Role;
  promotions?: Promotion[];
}) {
  const router = useRouter();
  const isEntrada = type === "IN";
  // Funcionário vende sempre pelo preço de tabela (ou promocional, se houver); só
  // dono/gerente pode negociar um preço diferente disso.
  const canEditPrice = isEntrada || userRole !== "EMPLOYEE";
  const [cart, setCart] = useState<CartItem[]>([]);

  const promotionsByProduct = useMemo(() => {
    const map = new Map<string, Promotion[]>();
    for (const p of promotions) {
      const arr = map.get(p.productId) ?? [];
      arr.push(p);
      map.set(p.productId, arr);
    }
    return map;
  }, [promotions]);

  function effectivePriceFor(productId: string, basePrice: number, quantity: number): number {
    if (isEntrada) return basePrice;
    return getEffectivePrice(basePrice, promotionsByProduct.get(productId) ?? [], quantity);
  }
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [insufficient, setInsufficient] = useState<InsufficientItem[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [boletoDueDays, setBoletoDueDays] = useState("");

  const total = useMemo(() => cart.reduce((sum, item) => sum + baseQuantity(item) * item.unitValue, 0), [cart]);

  function resetMessages() {
    setError(null);
    setWarning(null);
    setInsufficient([]);
    setSuccess(null);
  }

  function addToCart(product: Product) {
    resetMessages();
    const basePrice = isEntrada ? product.costPrice : product.salePrice;
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const displayQty = existing.displayQty + 1;
        const qty = baseQuantityFor(existing, displayQty);
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                displayQty,
                unitValue: canEditPrice ? item.unitValue : effectivePriceFor(product.id, item.basePrice, qty),
              }
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
          displayQty: 1,
          unitValue: effectivePriceFor(product.id, basePrice, 1),
          basePrice,
        },
      ];
    });
  }

  /** Usado pela importação de NF-e: adiciona com a quantidade e o valor exatos da nota,
   * em vez de incrementar 1 unidade por vez como na busca. */
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
          basePrice: unitValue,
        },
      ];
    });
  }

  function handleNFeImport(items: { product: Product; quantity: number; unitValue: number }[]) {
    items.forEach((it) => addToCartWithQuantity(it.product, it.quantity, it.unitValue));
    setSuccess(`${items.length} produto(s) da NF-e adicionados ao pedido de entrada.`);
  }

  /** Aceita apenas dígitos inteiros; qualquer outro caractere (ponto, vírgula, sinal) é ignorado.
   * Pra quem não pode editar o preço manualmente, recalcula o valor a cada mudança de
   * quantidade — é assim que o desconto por quantidade mínima da promoção passa a valer. */
  function handleQuantityInput(productId: string, raw: string) {
    if (raw !== "" && !/^\d+$/.test(raw)) return;
    const displayQty = raw === "" ? 0 : Number(raw);
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        if (canEditPrice) return { ...item, displayQty };
        const qty = baseQuantityFor(item, displayQty);
        return { ...item, displayQty, unitValue: effectivePriceFor(productId, item.basePrice, qty) };
      })
    );
  }

  /** Troca entre lançar em UNID ou em CX/PCT; reinicia a quantidade para evitar conversões estranhas. */
  function updateMode(productId: string, mode: "UNIT" | "PACKAGE") {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const updated = { ...item, mode, displayQty: 1 };
        if (canEditPrice) return updated;
        const qty = baseQuantityFor(updated, 1);
        return { ...updated, unitValue: effectivePriceFor(productId, item.basePrice, qty) };
      })
    );
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
            source: "MANUAL",
          })),
          force,
          paymentMethod,
          boletoDueDays: paymentMethod === "BOLETO" && boletoDueDays ? Number(boletoDueDays) : undefined,
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
      setPaymentMethod("");
      setBoletoDueDays("");
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
    if (!paymentMethod) {
      setError("Selecione a forma de pagamento.");
      return;
    }
    if (paymentMethod === "BOLETO" && !(Number(boletoDueDays) > 0)) {
      setError("Informe em quantos dias vence o boleto.");
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
          <ProductAutocomplete products={products} onSelect={(p) => addToCart(p)} autoFocus />
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
                {!isEntrada && item.unitValue < item.basePrice && (
                  <p className="text-xs font-semibold" style={{ color: "var(--ok)" }}>
                    🏷 preço promocional aplicado
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

        <div className="space-y-2 mt-3">
          <label className="label">{isEntrada ? "Forma de pagamento da NF-e" : "Forma de pagamento"}</label>
          <select
            className="input"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | "")}
          >
            <option value="">Selecione...</option>
            {PAYMENT_OPTIONS[type].map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {isEntrada && paymentMethod === "BOLETO" && (
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="input"
              placeholder="Vencimento em quantos dias (ex: 30)"
              value={boletoDueDays}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "" || /^\d+$/.test(raw)) setBoletoDueDays(raw);
              }}
            />
          )}
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
