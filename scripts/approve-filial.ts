// Aprova uma filial extra solicitada além do limite do plano — libera seu uso e
// aumenta o limite de filiais da empresa em 1 (pra não bloquear o próprio contador).
// Uso: npx tsx scripts/approve-filial.ts <filialId>

import { adminPrisma as prisma } from "../lib/admin-prisma";

async function main() {
  const [filialId] = process.argv.slice(2);

  if (!filialId) {
    console.error("Uso: npx tsx scripts/approve-filial.ts <filialId>");
    process.exit(1);
  }

  const filial = await prisma.filial.findUnique({ where: { id: filialId } });
  if (!filial) {
    console.error(`Nenhuma filial encontrada com id "${filialId}".`);
    process.exit(1);
  }
  if (filial.approved) {
    console.log(`Filial "${filial.name}" (${filial.id}) já estava aprovada.`);
    return;
  }

  await prisma.$transaction([
    prisma.filial.update({ where: { id: filialId }, data: { approved: true } }),
    prisma.empresa.update({ where: { id: filial.empresaId }, data: { maxFiliais: { increment: 1 } } }),
  ]);

  console.log(`Filial "${filial.name}" (${filial.id}) APROVADA — limite de filiais da empresa aumentado em 1.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
