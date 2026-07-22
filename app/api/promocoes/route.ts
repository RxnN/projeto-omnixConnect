import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createPromotion, getProductById, listPromotionsByFilial } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";
import { promotionCreateSchema, firstZodError } from "@/lib/validation";
import { getCurrentFilialId } from "@/lib/filial-context";

export const GET = withErrorHandling(async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const filialId = await getCurrentFilialId(user);
  const promotions = await listPromotionsByFilial(filialId);
  return NextResponse.json({ promotions });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Você não tem permissão para criar promoções." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = promotionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
  }
  const { productId, promoPrice, startDate, endDate, minQuantity } = parsed.data;

  const filialId = await getCurrentFilialId(user);
  const product = await getProductById(productId, filialId);
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado nesta filial." }, { status: 404 });
  }

  const promotion = await createPromotion({
    adegaId: user.adegaId,
    filialId,
    productId,
    promoPrice,
    startDate,
    endDate,
    minQuantity,
    createdByUserId: user.userId,
  });

  return NextResponse.json({ ok: true, promotion });
});
