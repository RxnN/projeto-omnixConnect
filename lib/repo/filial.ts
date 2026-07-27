import { prisma } from "../prisma";
import { createId } from "../id";
import type { Filial } from "../types";
import { toIso } from "./shared";

export async function listFiliais(empresaId: string): Promise<Filial[]> {
  const filiais = await prisma.filial.findMany({ where: { empresaId }, orderBy: { createdAt: "asc" } });
  return filiais.map((f) => ({ ...f, createdAt: toIso(f.createdAt) }));
}

/** Só filiais aprovadas — usada em seletor/operação, nunca deve oferecer uma filial
 * ainda pendente de aprovação de cobrança como opção utilizável. */
export async function listActiveFiliais(empresaId: string): Promise<Filial[]> {
  const filiais = await prisma.filial.findMany({
    where: { empresaId, approved: true },
    orderBy: { createdAt: "asc" },
  });
  return filiais.map((f) => ({ ...f, createdAt: toIso(f.createdAt) }));
}

export async function getFilialById(id: string, empresaId: string): Promise<Filial | undefined> {
  const filial = await prisma.filial.findFirst({ where: { id, empresaId } });
  return filial ? { ...filial, createdAt: toIso(filial.createdAt) } : undefined;
}

export async function createFilial(empresaId: string, name: string): Promise<Filial> {
  const filial = await prisma.filial.create({
    data: { id: createId("filial"), empresaId, name: name.trim() },
  });
  return { ...filial, createdAt: toIso(filial.createdAt) };
}

export async function createFilialWithinLimit(
  empresaId: string,
  name: string
): Promise<{ filial: Filial | null; limit: number }> {
  return prisma.$transaction(async (tx) => {
    // UPDATE com incremento zero obtém lock da linha da empresa. Assim, duas criações
    // concorrentes para o mesmo tenant são serializadas antes da contagem.
    const empresa = await tx.empresa.update({
      where: { id: empresaId },
      data: { maxFiliais: { increment: 0 } },
      select: { maxFiliais: true },
    });
    // Filiais pendentes de aprovação (solicitadas além do plano) não consomem o limite
    // já pago — só contam depois que a cobrança extra for aprovada.
    const count = await tx.filial.count({ where: { empresaId, approved: true } });
    if (count >= empresa.maxFiliais) {
      return { filial: null, limit: empresa.maxFiliais };
    }
    const filial = await tx.filial.create({
      data: { id: createId("filial"), empresaId, name: name.trim() },
    });
    return {
      filial: { ...filial, createdAt: toIso(filial.createdAt) },
      limit: empresa.maxFiliais,
    };
  });
}

/** Cria a filial "extra" solicitada além do limite atual do plano — nasce pendente
 * (approved=false) e só passa a ser utilizável depois de aprovada manualmente via
 * scripts/approve-filial.ts, quando a cobrança adicional for confirmada. */
export async function createPendingFilial(empresaId: string, name: string): Promise<Filial> {
  const filial = await prisma.filial.create({
    data: { id: createId("filial"), empresaId, name: name.trim(), approved: false },
  });
  return { ...filial, createdAt: toIso(filial.createdAt) };
}
