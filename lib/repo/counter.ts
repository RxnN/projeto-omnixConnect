import { prisma } from "../prisma";

/** Incrementa um contador atômico por adega+escopo (upsert com increment é uma única
 * instrução UPDATE no Postgres — seguro sob concorrência sem lock explícito). Usado tanto
 * pra código sequencial de produto quanto pra número de pedido por tipo. */
export async function nextCounter(adegaId: string, scope: string): Promise<number> {
  const counter = await prisma.counter.upsert({
    where: { adegaId_scope: { adegaId, scope } },
    create: { adegaId, scope, value: 1 },
    update: { value: { increment: 1 } },
  });
  return counter.value;
}
