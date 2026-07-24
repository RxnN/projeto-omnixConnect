import { NextRequest, NextResponse } from "next/server";
import { hasPermission, requireApiUser } from "@/lib/auth";
import { createProduct } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";
import { produtoCreateSchema, firstZodError } from "@/lib/validation";
import { getCurrentFilialId } from "@/lib/filial-context";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireApiUser();
  if (!(await hasPermission(user, "MANAGE_PRODUCTS"))) {
    return NextResponse.json({ error: "Você não tem permissão para cadastrar produtos." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = produtoCreateSchema.safeParse(body);
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
  const filialId = await getCurrentFilialId(user);
  const product = await createProduct({
    empresaId: user.empresaId,
    filialId,
    ...data,
    barcode: null,
    unitsPerPackage: data.packageType ? data.unitsPerPackage : null,
  });

  return NextResponse.json({ ok: true, product });
});
