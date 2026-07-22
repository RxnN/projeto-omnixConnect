import { prisma } from "../prisma";
import { createId } from "../id";
import type { Filial } from "../types";
import { toIso } from "./shared";

export async function listFiliais(adegaId: string): Promise<Filial[]> {
  const filiais = await prisma.filial.findMany({ where: { adegaId }, orderBy: { createdAt: "asc" } });
  return filiais.map((f) => ({ ...f, createdAt: toIso(f.createdAt) }));
}

export async function getFilialById(id: string, adegaId: string): Promise<Filial | undefined> {
  const filial = await prisma.filial.findFirst({ where: { id, adegaId } });
  return filial ? { ...filial, createdAt: toIso(filial.createdAt) } : undefined;
}

export async function createFilial(adegaId: string, name: string): Promise<Filial> {
  const filial = await prisma.filial.create({
    data: { id: createId("filial"), adegaId, name: name.trim() },
  });
  return { ...filial, createdAt: toIso(filial.createdAt) };
}
