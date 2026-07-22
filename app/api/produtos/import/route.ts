import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/session";
import { canManageProducts } from "@/lib/auth";
import { createProduct, getAdegaById, getProductByCode, updateProduct } from "@/lib/repo";
import type { PackageType } from "@/lib/types";
import { withErrorHandling } from "@/lib/api-handler";
import { getCurrentFilialId } from "@/lib/filial-context";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!canManageProducts(user.role)) {
    return NextResponse.json({ error: "Você não tem permissão para importar produtos." }, { status: 403 });
  }

  const adega = await getAdegaById(user.adegaId);
  if (!adega?.importEnabled) {
    return NextResponse.json(
      { error: "Importação em lote não está habilitada para sua adega. Fale com a gente para habilitar." },
      { status: 403 }
    );
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande (máximo 5MB)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler o arquivo. Envie um arquivo .xlsx válido." },
      { status: 400 }
    );
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    return NextResponse.json({ error: "A planilha enviada está vazia." }, { status: 400 });
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const filialId = await getCurrentFilialId(user);

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // linha 1 é o cabeçalho

    const name = String(row["Nome"] ?? "").trim();
    const category = String(row["Categoria"] ?? "").trim();
    const unit = String(row["Unidade"] ?? "").trim();
    const costPrice = Number(row["Preço de Custo"]);
    const salePrice = Number(row["Preço de Venda"]);
    const rawMinStock = row["Estoque Mínimo"];
    const minStockAlert =
      rawMinStock === "" || rawMinStock === undefined || rawMinStock === null ? null : Number(rawMinStock);
    const codeInFile = String(row["Código"] ?? "").trim();
    const rawPackageType = String(row["Tipo de Embalagem"] ?? "").trim().toUpperCase();
    const packageType: PackageType | null =
      rawPackageType === "CX" || rawPackageType === "PCT" ? (rawPackageType as PackageType) : null;
    const rawUnitsPerPackage = row["Unidades por Embalagem"];
    const unitsPerPackage =
      rawUnitsPerPackage === "" || rawUnitsPerPackage === undefined || rawUnitsPerPackage === null
        ? null
        : Number(rawUnitsPerPackage);

    if (!name || !category || !unit) {
      errors.push(`Linha ${rowNum}: nome, categoria e unidade são obrigatórios.`);
      continue;
    }
    if (Number.isNaN(costPrice) || Number.isNaN(salePrice) || costPrice < 0 || salePrice < 0) {
      errors.push(`Linha ${rowNum}: preços inválidos.`);
      continue;
    }
    if (minStockAlert !== null && Number.isNaN(minStockAlert)) {
      errors.push(`Linha ${rowNum}: estoque mínimo inválido.`);
      continue;
    }
    if (packageType && (unitsPerPackage === null || !Number.isInteger(unitsPerPackage) || unitsPerPackage < 1)) {
      errors.push(`Linha ${rowNum}: informe "Unidades por Embalagem" (inteiro maior que zero) para o tipo ${packageType}.`);
      continue;
    }

    const existing = codeInFile ? await getProductByCode(codeInFile, filialId) : undefined;

    if (existing) {
      await updateProduct(existing.id, filialId, {
        name,
        category,
        unit,
        costPrice,
        salePrice,
        minStockAlert,
        barcode: existing.barcode,
        packageType,
        unitsPerPackage: packageType ? unitsPerPackage : null,
      });
      updated++;
    } else {
      const currentStock = Number(row["Estoque Atual"]);
      await createProduct({
        adegaId: user.adegaId,
        filialId,
        name,
        category,
        unit,
        costPrice,
        salePrice,
        currentStock: Number.isNaN(currentStock) ? 0 : currentStock,
        minStockAlert,
        barcode: null,
        packageType,
        unitsPerPackage: packageType ? unitsPerPackage : null,
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, created, updated, errors });
});
