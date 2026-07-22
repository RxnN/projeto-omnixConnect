import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { createId } from "../id";
import type { PackageType, Product } from "../types";
import { toIso } from "./shared";
import { nextCounter } from "./counter";

function toProduct(p: {
  id: string;
  adegaId: string;
  filialId: string;
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
  active: boolean;
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

export async function listProducts(filialId: string, opts?: { activeOnly?: boolean }): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { filialId, ...(opts?.activeOnly ? { active: true } : {}) },
    orderBy: { name: "asc" },
  });
  return products.map(toProduct);
}

export async function getProductById(id: string, filialId: string): Promise<Product | undefined> {
  const product = await prisma.product.findFirst({ where: { id, filialId } });
  return product ? toProduct(product) : undefined;
}

/** Busca um produto pelo código sequencial (aceita variações sem zeros à esquerda). */
export async function getProductByCode(code: string, filialId: string): Promise<Product | undefined> {
  const trimmed = code.trim();
  let product = await prisma.product.findFirst({ where: { filialId, code: trimmed } });
  if (!product && /^\d+$/.test(trimmed)) {
    const padded = trimmed.padStart(4, "0");
    product = await prisma.product.findFirst({ where: { filialId, code: padded } });
  }
  return product ? toProduct(product) : undefined;
}

/** Busca vários produtos por código de barras numa única query (evita abrir uma conexão
 * por item ao processar uma NF-e com muitos produtos). */
export async function getProductsByBarcodes(barcodes: string[], filialId: string): Promise<Product[]> {
  if (barcodes.length === 0) return [];
  const products = await prisma.product.findMany({ where: { filialId, barcode: { in: barcodes } } });
  return products.map(toProduct);
}

async function nextProductCode(filialId: string): Promise<string> {
  const value = await nextCounter(filialId, "product");
  return String(value).padStart(4, "0");
}

export async function createProduct(input: {
  adegaId: string;
  filialId: string;
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
  const code = await nextProductCode(input.filialId);
  const product = await prisma.product.create({
    data: {
      id: createId("prod"),
      adegaId: input.adegaId,
      filialId: input.filialId,
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
  filialId: string,
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
  const existing = await prisma.product.findFirst({ where: { id, filialId }, select: { id: true } });
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

export async function setProductActive(id: string, filialId: string, active: boolean): Promise<Product | undefined> {
  const existing = await prisma.product.findFirst({ where: { id, filialId }, select: { id: true } });
  if (!existing) return undefined;
  const product = await prisma.product.update({ where: { id }, data: { active } });
  return toProduct(product);
}
