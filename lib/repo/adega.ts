import { prisma } from "../prisma";
import { createId } from "../id";
import type { Adega } from "../types";
import { toIso } from "./shared";

export async function getAdegaById(id: string): Promise<Adega | undefined> {
  const adega = await prisma.adega.findUnique({ where: { id } });
  return adega
    ? { ...adega, paidUntil: adega.paidUntil ? toIso(adega.paidUntil) : null, createdAt: toIso(adega.createdAt) }
    : undefined;
}

export async function createAdega(name: string, cnpjCpf: string): Promise<Adega> {
  const adega = await prisma.adega.create({
    data: { id: createId("adega"), name: name.trim(), cnpjCpf },
  });
  return { ...adega, paidUntil: null, createdAt: toIso(adega.createdAt) };
}
