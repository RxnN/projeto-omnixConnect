import { prisma } from "../prisma";
import { createId } from "../id";
import type { Supplier } from "../types";
import { toIso } from "./shared";

function toSupplier(value: {
  id: string;
  empresaId: string;
  name: string;
  cnpjCpf: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Supplier {
  return { ...value, createdAt: toIso(value.createdAt), updatedAt: toIso(value.updatedAt) };
}

export type SupplierInput = {
  name: string;
  cnpjCpf: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export async function listSuppliers(empresaId: string, opts?: { activeOnly?: boolean }): Promise<Supplier[]> {
  const values = await prisma.supplier.findMany({
    where: { empresaId, ...(opts?.activeOnly ? { active: true } : {}) },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return values.map(toSupplier);
}

export async function getSupplierById(id: string, empresaId: string): Promise<Supplier | undefined> {
  const value = await prisma.supplier.findFirst({ where: { id, empresaId } });
  return value ? toSupplier(value) : undefined;
}

export async function createSupplier(empresaId: string, input: SupplierInput): Promise<Supplier> {
  return toSupplier(await prisma.supplier.create({ data: { id: createId("sup"), empresaId, ...input } }));
}

export async function updateSupplier(id: string, empresaId: string, input: SupplierInput): Promise<Supplier | undefined> {
  const changed = await prisma.supplier.updateMany({ where: { id, empresaId }, data: input });
  return changed.count === 1 ? getSupplierById(id, empresaId) : undefined;
}

export async function setSupplierActive(id: string, empresaId: string, active: boolean): Promise<Supplier | undefined> {
  const changed = await prisma.supplier.updateMany({ where: { id, empresaId }, data: { active } });
  return changed.count === 1 ? getSupplierById(id, empresaId) : undefined;
}
