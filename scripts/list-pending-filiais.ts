// Lista todas as filiais extras solicitadas e ainda pendentes de aprovação, de todas
// as empresas. Uso: npx tsx scripts/list-pending-filiais.ts

import { adminPrisma as prisma } from "../lib/admin-prisma";

async function main() {
  const pendentes = await prisma.filial.findMany({
    where: { approved: false },
    include: { empresa: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (pendentes.length === 0) {
    console.log("Nenhuma solicitação de filial pendente.");
    return;
  }

  for (const f of pendentes) {
    console.log(
      `${f.id} | empresa: ${f.empresa.name} | filial: "${f.name}" | solicitado em ${f.createdAt.toLocaleString("pt-BR")}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
