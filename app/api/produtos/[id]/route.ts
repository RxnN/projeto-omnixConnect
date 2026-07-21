import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { canManageProducts } from "@/lib/auth";
import { deleteProduct, getProductById, isBarcodeTaken, updateProduct } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";
import { produtoUpdateSchema, firstZodError } from "@/lib/validation";

export const PUT = withErrorHandling<{ params: { id: string } }>(async (req, { params }) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!canManageProducts(user.role)) {
    return NextResponse.json({ error: "Você não tem permissão para editar produtos." }, { status: 403 });
  }

  const existing = await getProductById(params.id, user.adegaId);
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
  if (data.barcode && (await isBarcodeTaken(data.barcode, user.adegaId, params.id))) {
    return NextResponse.json({ error: "Já existe um produto com esse código de barras." }, { status: 400 });
  }

  const product = await updateProduct(params.id, user.adegaId, {
    ...data,
    unitsPerPackage: data.packageType ? data.unitsPerPackage : null,
  });

  return NextResponse.json({ ok: true, product });
});

export const DELETE = withErrorHandling<{ params: { id: string } }>(async (_req, { params }) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!canManageProducts(user.role)) {
    return NextResponse.json({ error: "Você não tem permissão para excluir produtos." }, { status: 403 });
  }

  const existing = await getProductById(params.id, user.adegaId);
  if (!existing) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  await deleteProduct(params.id, user.adegaId);
  return NextResponse.json({ ok: true });
});
