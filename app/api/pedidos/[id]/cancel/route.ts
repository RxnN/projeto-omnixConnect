import { NextRequest, NextResponse } from "next/server";
import { getEffectivePermissions, requireApiUser } from "@/lib/auth";
import { cancelPedido, checkPedidoCancelStock, getPedidoById, StockConflictError } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";
import { getCurrentFilialId } from "@/lib/filial-context";

export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireApiUser();
  const permissions = await getEffectivePermissions(user);
  if (!permissions.CANCEL_ORDERS) {
    return NextResponse.json({ error: "Você não tem permissão para cancelar pedidos." }, { status: 403 });
  }

  const filialId = await getCurrentFilialId(user);
  const pedido = await getPedidoById(id, filialId);
  if (!pedido) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  if (pedido.cancelledAt) {
    return NextResponse.json({ error: "Esse pedido já está cancelado." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const force = body?.force === true;
  if (force && !permissions.FORCE_STOCK) {
    return NextResponse.json({ error: "Você não tem permissão para forçar estoque negativo." }, { status: 403 });
  }

  if (!force) {
    const blockers = await checkPedidoCancelStock(pedido);
    if (blockers.length > 0) {
      const details = blockers
        .map((b) => `${b.productName} (disponível: ${b.available} ${b.unit}, ficaria: ${b.wouldBecome} ${b.unit})`)
        .join("; ");
      return NextResponse.json(
        {
          warning: `Cancelar esta entrada deixaria o estoque negativo em: ${details}. Confirme para cancelar mesmo assim.`,
          blockers,
        },
        { status: 409 }
      );
    }
  }

  let cancelled;
  try {
    cancelled = await cancelPedido(id, filialId, user.userId, force);
  } catch (error) {
    if (error instanceof StockConflictError) {
      return NextResponse.json({ warning: error.message }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true, pedido: cancelled });
});
