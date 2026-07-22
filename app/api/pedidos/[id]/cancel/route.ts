import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { canCancelPedidos } from "@/lib/auth";
import { cancelPedido, checkPedidoCancelStock, getPedidoById } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";
import { getCurrentFilialId } from "@/lib/filial-context";

export const POST = withErrorHandling<{ params: { id: string } }>(async (req, { params }) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!canCancelPedidos(user.role)) {
    return NextResponse.json({ error: "Você não tem permissão para cancelar pedidos." }, { status: 403 });
  }

  const filialId = await getCurrentFilialId(user);
  const pedido = await getPedidoById(params.id, filialId);
  if (!pedido) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  if (pedido.cancelledAt) {
    return NextResponse.json({ error: "Esse pedido já está cancelado." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const force = Boolean(body?.force);

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

  const cancelled = await cancelPedido(params.id, filialId, user.userId);
  return NextResponse.json({ ok: true, pedido: cancelled });
});
