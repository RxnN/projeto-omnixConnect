import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { createId } from "../id";
import type { PackageType, Product } from "../types";
import { toIso } from "./shared";
import { nextCounter } from "./counter";

function toProduct(p: {
  id: string;
  adegaId: string;
  code: string;
  barcode: string | null;
  name: string;
  category: string;
  unit: string;
  costPrice: Prisma.Decimal;
  salePrice: Prisma.Decimal;
  currentStock: number;
  minStockAlert: number | null;
  packageType: string | null;
  unitsPerPackage: number | null;
  createdAt: Date;
}): Product {
  return {
    ...p,
    costPrice: p.costPrice.toNumber(),
    salePrice: p.salePrice.toNumber(),
    packageType: p.packageType as PackageType | null,
    createdAt: toIso(p.createdAt),
  };
}

export async function listProducts(adegaId: string): Promise<Product[]> {
  const products = await prisma.product.findMany({ where: { adegaId }, orderBy: { name: "asc" } });
  return products.map(toProduct);
}

export async function getProductById(id: string, adegaId: string): Promise<Product | undefined> {
  const product = await prisma.product.findFirst({ where: { id, adegaId } });
  return product ? toProduct(product) : undefined;
}

/** Busca um produto pelo código sequencial (aceita variações sem zeros à esquerda). */
export async function getProductByCode(code: string, adegaId: string): Promise<Product | undefined> {
  const trimmed = code.trim();
  let product = await prisma.product.findFirst({ where: { adegaId, code: trimmed } });
  if (!product && /^\d+$/.test(trimmed)) {
    const padded = trimmed.padStart(4, "0");
    product = await prisma.product.findFirst({ where: { adegaId, code: padded } });
  }
  return product ? toProduct(product) : undefined;
}

export async function getProductByBarcode(barcode: string, adegaId: string): Promise<Product | undefined> {
  const product = await prisma.product.findFirst({ where: { adegaId, barcode: barcode.trim() } });
  return product ? toProduct(product) : undefined;
}

/** Busca vários produtos por código de barras numa única query (evita abrir uma conexão
 * por item ao processar uma NF-e com muitos produtos). */
export async function getProductsByBarcodes(barcodes: string[], adegaId: string): Promise<Product[]> {
  if (barcodes.length === 0) return [];
  const products = await prisma.product.findMany({ where: { adegaId, barcode: { in: barcodes } } });
  return products.map(toProduct);
}

export async function isBarcodeTaken(barcode: string, adegaId: string, excludeId?: string): Promise<boolean> {
  const found = await prisma.product.findFirst({
    where: {
      adegaId,
      barcode: barcode.trim(),
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(found);
}

async function nextProductCode(adegaId: string): Promise<string> {
  const value = await nextCounter(adegaId, "product");
  return String(value).padStart(4, "0");
}

export async function createProduct(input: {
  adegaId: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  minStockAlert: number | null;
  barcode: string | null;
  packageType: PackageType | null;
  unitsPerPackage: number | null;
}): Promise<Product> {
  const code = await nextProductCode(input.adegaId);
  const product = await prisma.product.create({
    data: {
      id: createId("prod"),
      adegaId: input.adegaId,
      code,
      barcode: input.barcode,
      name: input.name,
      category: input.category,
      unit: input.unit,
      costPrice: input.costPrice,
      salePrice: input.salePrice,
      currentStock: input.currentStock,
      minStockAlert: input.minStockAlert,
      packageType: input.packageType,
      unitsPerPackage: input.unitsPerPackage,
    },
  });
  return toProduct(product);
}

export async function updateProduct(
  id: string,
  adegaId: string,
  input: {
    name: string;
    category: string;
    unit: string;
    costPrice: number;
    salePrice: number;
    minStockAlert: number | null;
    barcode: string | null;
    packageType: PackageType | null;
    unitsPerPackage: number | null;
  }
): Promise<Product | undefined> {
  const existing = await prisma.product.findFirst({ where: { id, adegaId }, select: { id: true } });
  if (!existing) return undefined;
  const product = await prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      category: input.category,
      unit: input.unit,
      costPrice: input.costPrice,
      salePrice: input.salePrice,
      minStockAlert: input.minStockAlert,
      barcode: input.barcode,
      packageType: input.packageType,
      unitsPerPackage: input.unitsPerPackage,
    },
  });
  return toProduct(product);
}

export async function deleteProduct(id: string, adegaId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.movement.deleteMany({ where: { productId: id, adegaId } });
    await tx.product.deleteMany({ where: { id, adegaId } });
  });
}
