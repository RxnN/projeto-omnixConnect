// Lista os cadastros de empresas que ainda aguardam aprovação administrativa.
// Uso: npm run list-pending-empresas

import { adminPrisma as prisma } from "../lib/admin-prisma";

async function main() {
  const pendentes = await prisma.empresa.findMany({
    where: { approved: false },
    select: {
      name: true,
      createdAt: true,
      users: {
        where: { role: "OWNER" },
        select: { email: true, emailVerifiedAt: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (pendentes.length === 0) {
    console.log("Nenhuma empresa aguardando aprovação.");
    return;
  }

  console.log(`${pendentes.length} empresa(s) aguardando aprovação:\n`);

  for (const empresa of pendentes) {
    const owner = empresa.users[0];
    const email = owner?.email ?? "proprietário não encontrado";
    const emailStatus = owner?.emailVerifiedAt ? "e-mail confirmado" : "e-mail pendente";
    console.log(
      `${empresa.createdAt.toLocaleString("pt-BR")} | ${empresa.name} | ${email} | ${emailStatus}`,
    );
  }

  console.log("\nPara aprovar: npm run approve-empresa -- <email-do-dono> on [dias]");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
