import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getProductByBarcode, getProductByCode, getProductById } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Código não informado." }, { status: 400 });
  }

  // O QR Code do produto pode conter apenas o ID, ou uma URL/JSON contendo o ID.
  const trimmedCode = code.trim();
  let productId = trimmedCode;
  const match = productId.match(/prod_[a-f0-9]+/);
  if (match) productId = match[0];

  const product =
    (await getProductById(productId, user.adegaId)) ??
    (await getProductByCode(trimmedCode, user.adegaId)) ??
    (await getProductByBarcode(trimmedCode, user.adegaId));
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado para o código lido." }, { status: 404 });
  }

  return NextResponse.json({ product });
});
