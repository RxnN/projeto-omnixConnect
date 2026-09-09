import { NextRequest, NextResponse } from "next/server";
import { getEffectivePermissions, requireApiUser } from "@/lib/auth";
import { getProductById, updateProduct } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";
import { produtoUpdateSchema, firstZodError } from "@/lib/validation";
import { getCurrentFilialId } from "@/lib/filial-context";

export const PUT = withErrorHandling<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireApiUser();
  const permissions = await getEffectivePermissions(user);
  if (!permissions.MANAGE_PRODUCTS) {
    return NextResponse.json({ error: "Você não tem permissão para editar produtos." }, { status: 403 });
  }

  const filialId = await getCurrentFilialId(user);
  const existing = await getProductById(id, filialId);
  if (!existing) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const safeBody =
    body && typeof body === "object"
      ? {
          ...body,
          costPrice: permissions.VIEW_COSTS_MARGIN
            ? (body as Record<string, unknown>).costPrice
            : existing.costPrice,
        }
      : body;
  const parsed = produtoUpdateSchema.safeParse(safeBody);
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
  const product = await updateProduct(id, filialId, {
    ...data,
    barcode: existing.barcode,
    unitsPerPackage: data.packageType ? data.unitsPerPackage : null,
  });
  if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  const safeProduct = permissions.VIEW_COSTS_MARGIN
    ? product
    : (({ costPrice: _costPrice, ...visible }) => visible)(product);
  return NextResponse.json({ ok: true, product: safeProduct });
});
