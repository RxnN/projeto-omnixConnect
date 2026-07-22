import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { canManageProducts } from "@/lib/auth";
import { getProductById, updateProduct } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";
import { produtoUpdateSchema, firstZodError } from "@/lib/validation";
import { getCurrentFilialId } from "@/lib/filial-context";

export const PUT = withErrorHandling<{ params: { id: string } }>(async (req, { params }) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!canManageProducts(user.role)) {
    return NextResponse.json({ error: "Você não tem permissão para editar produtos." }, { status: 403 });
  }

  const filialId = await getCurrentFilialId(user);
  const existing = await getProductById(params.id, filialId);
  if (!existing) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = produtoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
  }
  const data = parsed.data;

  if (data.packageType && (data.unitsPerPackage === null || data.unitsPerPackage < 1)) {
    return NextResponse.json(
      { error: "Informe quantas unidades tem cada caixa/pacote (número inteiro maior que zero)." },
      { status: 400 }
    );
  }
  const product = await updateProduct(params.id, filialId, {
    ...data,
    barcode: existing.barcode,
    unitsPerPackage: data.packageType ? data.unitsPerPackage : null,
  });

  return NextResponse.json({ ok: true, product });
});
