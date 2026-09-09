import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  checkPedidoStock,
  createPedido,
  getProductById,
  listPromotionsByProductIds,
  StockConflictError,
} from "@/lib/repo";
import type { PedidoItemInput } from "@/lib/repo";
import type { MovementType } from "@/lib/types";
import { withErrorHandling } from "@/lib/api-handler";
import { pedidoCreateSchema, firstZodError } from "@/lib/validation";
import { getCurrentFilialId } from "@/lib/filial-context";
import { getEffectivePrice } from "@/lib/pricing";
import { getEffectivePermissions, requireApiUser } from "@/lib/auth";
import { redactPedidoValues } from "@/lib/financial-data";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireApiUser();
  const permissions = await getEffectivePermissions(user);
  // Todos os papéis (OWNER, MANAGER, EMPLOYEE) podem fechar pedidos.

  const body = await req.json().catch(() => null);
  const parsed = pedidoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
  }
  const { type, items: rawItems, force, paymentMethod, boletoDueDays } = parsed.data;
  if (type === "IN" && !permissions.REGISTER_ENTRIES) {
    return NextResponse.json({ error: "Você não tem permissão para registrar entradas." }, { status: 403 });
  }
  const filialId = await getCurrentFilialId(user);
  const promotions =
    type === "OUT" ? await listPromotionsByProductIds(filialId, rawItems.map((i) => i.productId)) : [];

  const items: PedidoItemInput[] = [];
  for (const raw of rawItems) {
    const product = await getProductById(raw.productId, filialId);
    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado nesta filial." }, { status: 404 });
    }
    if (!product.active) {
      return NextResponse.json({ error: `Produto "${product.name}" está inativo.` }, { status: 400 });
    }

    // Preço de tabela vigente pra essa venda — já considera promoção ativa (por período
    // e/ou por quantidade mínima) na filial atual.
    const effectiveSalePrice =
      type === "OUT"
        ? getEffectivePrice(
            product.salePrice,
            promotions.filter((p) => p.productId === product.id),
            raw.quantity
          )
        : product.salePrice;
    const defaultUnitValue = type === "IN" ? product.costPrice : effectiveSalePrice;
    const unitValue = raw.unitValue ?? defaultUnitValue;

    if (unitValue < 0) {
      return NextResponse.json({ error: "O valor unitário não pode ser negativo." }, { status: 400 });
    }
    // Funcionário não pode alterar o preço de venda na saída (evita registrar venda por
    // valor menor e ficar com a diferença) — só o preço de tabela (ou promocional, se
    // ativo) é aceito. Descontos/negociação de preço exigem OWNER ou MANAGER.
    if (type === "OUT" && !permissions.EDIT_ORDER_PRICE && unitValue !== effectiveSalePrice) {
      return NextResponse.json(
        { error: "Usuários sem essa permissão não podem alterar o preço de venda." },
        { status: 403 }
      );
    }

    items.push({ productId: raw.productId, quantity: raw.quantity, unitValue, source: raw.source });
  }

  // Só o dono (OWNER) pode forçar o fechamento com estoque insuficiente (ex: correção
  // manual de inventário) — Gerente e Funcionário nunca deixam o estoque ficar negativo,
  // mesmo que enviem force=true diretamente pela API.
  const canForceStock = permissions.FORCE_STOCK;
  if (type === "OUT" && !(force && canForceStock)) {
    const insufficient = await checkPedidoStock(
      filialId,
      items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
    );
    if (insufficient.length > 0) {
      const details = insufficient
        .map((i) => `${i.productName} (disponível: ${i.available} ${i.unit}, pedido: ${i.requested} ${i.unit})`)
        .join("; ");
      const callToAction = canForceStock
        ? "Confirme para fechar o pedido mesmo assim (estoque ficará negativo)."
        : "Ajuste a quantidade ou peça para o dono liberar o fechamento com estoque negativo.";
      return NextResponse.json(
        {
          warning: `Estoque insuficiente para: ${details}. ${callToAction}`,
          insufficient,
          canForce: canForceStock,
        },
        { status: 409 }
      );
    }
  }

  let pedido;
  try {
    pedido = await createPedido({
      empresaId: user.empresaId,
      filialId,
      type: type as MovementType,
      createdByUserId: user.userId,
      items,
      paymentMethod,
      boletoDueDays,
      allowNegativeStock: type === "OUT" && Boolean(force && canForceStock),
    });
  } catch (error) {
    if (error instanceof StockConflictError) {
      return NextResponse.json({ warning: error.message, canForce: canForceStock }, { status: 409 });
    }
    throw error;
  }

  Sentry.metrics.count("pedido_closed", 1, { attributes: { type: pedido.type } });

  const canViewReturnedValues = type === "OUT" ? permissions.VIEW_REPORTS : permissions.VIEW_COSTS_MARGIN;
  return NextResponse.json({ ok: true, pedido: canViewReturnedValues ? pedido : redactPedidoValues(pedido) });
});
