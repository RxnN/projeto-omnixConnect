import { prisma } from "../prisma";

/** Incrementa um contador atômico por filial+escopo (upsert com increment é uma única
 * instrução UPDATE no Postgres — seguro sob concorrência sem lock explícito). Usado tanto
 * pra código sequencial de produto quanto pra número de pedido por tipo. */
export async function nextCounter(filialId: string, scope: string): Promise<number> {
  const counter = await prisma.counter.upsert({
    where: { filialId_scope: { filialId, scope } },
    create: { filialId, scope, value: 1 },
    update: { value: { increment: 1 } },
  });
  return counter.value;
}
