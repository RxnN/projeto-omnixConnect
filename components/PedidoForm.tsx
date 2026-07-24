"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MovementType, OrderProduct, PackageType, PaymentMethod, Promotion } from "@/lib/types";
import { formatBRL } from "@/lib/format";
import { getEffectivePrice } from "@/lib/pricing";
import ProductAutocomplete from "./ProductAutocomplete";
import NFeImport from "./NFeImport";
import PedidoCartTable, { type CartRowView } from "./PedidoCartTable";
import PaymentDialog from "./PaymentDialog";

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
  canEditPrice,
  canForceStock,
  promotions = [],
}: {
  products: OrderProduct[];
  type: MovementType;
  canEditPrice: boolean;
  canForceStock: boolean;
  promotions?: Promotion[];
}) {
  const router = useRouter();
  const isEntrada = type === "IN";
  // Funcionário vende sempre pelo preço de tabela (ou promocional, se houver); só
  // dono/gerente pode negociar um preço diferente disso.
  const canEditItemPrice = isEntrada || canEditPrice;
  // Só o dono pode forçar o fechamento de um pedido de saída com estoque insuficiente
  // (deixando o estoque negativo de propósito) — Gerente e Funcionário nunca podem.
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const total = useMemo(() => cart.reduce((sum, item) => sum + baseQuantity(item) * item.unitValue, 0), [cart]);

  const rows: CartRowView[] = useMemo(
    () =>
      cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        category: item.category,
        packageType: item.packageType,
        unitsPerPackage: item.unitsPerPackage,
        mode: item.mode,
        displayQty: item.displayQty,
        unitValue: item.unitValue,
        baseQty: baseQuantity(item),
        subtotal: baseQuantity(item) * item.unitValue,
        isPromo: !isEntrada && item.unitValue < item.basePrice,
      })),
    [cart, isEntrada]
  );

  function resetMessages() {
    setError(null);
    setWarning(null);
    setInsufficient([]);
    setSuccess(null);
  }

  function addToCart(product: OrderProduct) {
    resetMessages();
    const basePrice = isEntrada ? product.costPrice ?? 0 : product.salePrice;
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
                unitValue: canEditItemPrice ? item.unitValue : effectivePriceFor(product.id, item.basePrice, qty),
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
  function addToCartWithQuantity(product: OrderProduct, quantity: number, unitValue: number) {
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

  function handleNFeImport(items: { product: OrderProduct; quantity: number; unitValue: number }[]) {
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
        if (canEditItemPrice) return { ...item, displayQty };
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
        if (canEditItemPrice) return updated;
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
      setDialogOpen(false);
      closeButtonRef.current?.focus();
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  /** Só valida o que não depende da forma de pagamento; se passar, abre o Dialog
   * onde o pagamento é escolhido e confirmado. */
  function openPaymentDialog() {
    if (cart.length === 0) {
      setError("Adicione ao menos um produto ao pedido.");
      return;
    }
    if (cart.some((item) => !item.displayQty || item.displayQty <= 0)) {
      setError("Informe uma quantidade válida para todos os itens.");
      return;
    }
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setError(null);
    setWarning(null);
    setInsufficient([]);
    closeButtonRef.current?.focus();
  }

  /** Mesma validação que antes vivia no submit do formulário, agora disparada pelo
   * botão "Confirmar Pedido" dentro do PaymentDialog. */
  function confirmPayment() {
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
    <div className="space-y-6">
      {isEntrada && <NFeImport products={products} onImport={handleNFeImport} />}

      <div className="panel space-y-2 order-search-panel">
        <label className="label">Adicionar produto ao pedido de {isEntrada ? "entrada" : "saída"}</label>
        <ProductAutocomplete products={products} onSelect={(p) => addToCart(p)} />
      </div>

      <PedidoCartTable
        rows={rows}
        canEditPrice={canEditItemPrice}
        emptyMessage={`Nenhum produto no pedido de ${isEntrada ? "entrada" : "saída"} ainda. Adicione produtos na busca acima.`}
        onQuantityChange={handleQuantityInput}
        onModeChange={updateMode}
        onUnitValueChange={updateUnitValue}
        onRemove={removeItem}
      />

      <div className="order-total-bar">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
          Total
        </span>
        <span className="font-display font-extrabold text-3xl tabular" style={{ color: "var(--accent)" }}>
          {formatBRL(total)}
        </span>
      </div>

      {!dialogOpen && error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm" style={{ color: "var(--ok)" }}>
          {success}
        </p>
      )}

      <button
        ref={closeButtonRef}
        type="button"
        onClick={openPaymentDialog}
        disabled={cart.length === 0}
        className="btn-primary w-full text-base order-submit transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={
          {
            paddingTop: "0.875rem",
            paddingBottom: "0.875rem",
            "--tw-ring-color": "var(--accent)",
            "--tw-ring-offset-color": "var(--surface)",
          } as React.CSSProperties
        }
      >
        {`Fechar pedido de ${isEntrada ? "entrada" : "saída"}`}
      </button>

      <PaymentDialog
        open={dialogOpen}
        isEntrada={isEntrada}
        options={PAYMENT_OPTIONS[type]}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        boletoDueDays={boletoDueDays}
        onBoletoDueDaysChange={setBoletoDueDays}
        error={error}
        warning={warning}
        insufficient={insufficient}
        canForceStock={canForceStock}
        loading={loading}
        onCancel={closeDialog}
        onConfirm={confirmPayment}
        onForceConfirm={() => closePedido(true)}
      />
    </div>
  );
}
