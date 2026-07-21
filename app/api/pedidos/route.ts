import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { checkPedidoStock, createPedido, getProductById } from "@/lib/repo";
import type { PedidoItemInput } from "@/lib/repo";
import type { MovementType } from "@/lib/types";
import { withErrorHandling } from "@/lib/api-handler";
import { pedidoCreateSchema, firstZodError } from "@/lib/validation";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  // Todos os papéis (OWNER, MANAGER, EMPLOYEE) podem fechar pedidos.

  const body = await req.json().catch(() => null);
  const parsed = pedidoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
  }
  const { type, items: rawItems, force } = parsed.data;

  const items: PedidoItemInput[] = [];
  for (const raw of rawItems) {
    const product = await getProductById(raw.productId, user.adegaId);
    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado nesta adega." }, { status: 404 });
    }

    const defaultUnitValue = type === "IN" ? product.costPrice : product.salePrice;
    const unitValue = raw.unitValue ?? defaultUnitValue;

    if (unitValue < 0) {
      return NextResponse.json({ error: "O valor unitário não pode ser negativo." }, { status: 400 });
    }
    // Funcionário não pode alterar o preço de venda na saída (evita registrar venda por
    // valor menor e ficar com a diferença) — só o preço de tabela do produto é aceito.
    // Descontos/negociação de preço exigem OWNER ou MANAGER.
    if (type === "OUT" && user.role === "EMPLOYEE" && unitValue !== product.salePrice) {
      return NextResponse.json(
        { error: "Funcionários não podem alterar o preço de venda. Peça a um gerente ou dono." },
        { status: 403 }
      );
    }

    items.push({ productId: raw.productId, quantity: raw.quantity, unitValue, source: raw.source });
  }

  if (type === "OUT" && !force) {
    const insufficient = await checkPedidoStock(
      user.adegaId,
      items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
    );
    if (insufficient.length > 0) {
      const details = insufficient
        .map((i) => `${i.productName} (disponível: ${i.available} ${i.unit}, pedido: ${i.requested} ${i.unit})`)
        .join("; ");
      return NextResponse.json(
        {
          warning: `Estoque insuficiente para: ${details}. Confirme para fechar o pedido mesmo assim (estoque ficará negativo).`,
          insufficient,
        },
        { status: 409 }
      );
    }
  }

  const pedido = await createPedido({
    adegaId: user.adegaId,
    type: type as MovementType,
    createdByUserId: user.userId,
    items,
  });

  return NextResponse.json({ ok: true, pedido });
});
