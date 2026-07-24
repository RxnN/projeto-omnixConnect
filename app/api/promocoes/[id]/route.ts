import { NextResponse } from "next/server";
import { deletePromotion } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";
import { getCurrentFilialId } from "@/lib/filial-context";
import { hasPermission, requireApiUser } from "@/lib/auth";

export const DELETE = withErrorHandling<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  const user = await requireApiUser();
  if (!(await hasPermission(user, "MANAGE_PROMOTIONS"))) {
    return NextResponse.json({ error: "Você não tem permissão para remover promoções." }, { status: 403 });
  }

  const filialId = await getCurrentFilialId(user);
  const deleted = await deletePromotion(id, filialId);
  if (!deleted) {
    return NextResponse.json({ error: "Promoção não encontrada nesta filial." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});
