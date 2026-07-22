import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { canManageProducts } from "@/lib/auth";
import { getProductById, setProductActive } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";
import { getCurrentFilialId } from "@/lib/filial-context";

const statusSchema = z.object({ active: z.boolean() });

export const POST = withErrorHandling<{ params: { id: string } }>(async (req: NextRequest, { params }) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!canManageProducts(user.role)) {
    return NextResponse.json({ error: "Você não tem permissão para alterar o status de produtos." }, { status: 403 });
  }

  const filialId = await getCurrentFilialId(user);
  const existing = await getProductById(params.id, filialId);
  if (!existing) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const product = await setProductActive(params.id, filialId, parsed.data.active);
  return NextResponse.json({ ok: true, product });
});
