import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { deletePromotion } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";
import { getCurrentFilialId } from "@/lib/filial-context";

export const DELETE = withErrorHandling<{ params: { id: string } }>(async (_req, { params }) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Você não tem permissão para remover promoções." }, { status: 403 });
  }

  const filialId = await getCurrentFilialId(user);
  const deleted = await deletePromotion(params.id, filialId);
  if (!deleted) {
    return NextResponse.json({ error: "Promoção não encontrada nesta filial." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});
