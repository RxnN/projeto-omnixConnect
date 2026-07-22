import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/session";
import { listProducts } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";
import { getCurrentFilialId } from "@/lib/filial-context";

export const GET = withErrorHandling(async (_req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const filialId = await getCurrentFilialId(user);
  const products = await listProducts(filialId);
  const rows = products.map((p) => ({
    Código: p.code,
    "Código de Barras": p.barcode ?? "",
    Nome: p.name,
    Categoria: p.category,
    Unidade: p.unit,
    "Preço de Custo": p.costPrice,
    "Preço de Venda": p.salePrice,
    "Estoque Atual": p.currentStock,
    "Estoque Mínimo": p.minStockAlert ?? "",
    "Tipo de Embalagem": p.packageType ?? "",
    "Unidades por Embalagem": p.unitsPerPackage ?? "",
    Ativo: p.active ? "Sim" : "Não",
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Produtos");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="produtos.xlsx"',
    },
  });
});
