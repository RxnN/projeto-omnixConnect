// Liga/desliga a importação em lote de produtos (planilha) para a empresa de um usuário.
// Uso: npx tsx scripts/toggle-import.ts email@do-dono.com on
//      npx tsx scripts/toggle-import.ts email@do-dono.com off

import { adminPrisma as prisma } from "../lib/admin-prisma";

async function main() {
  const [email, action] = process.argv.slice(2);

  if (!email || (action !== "on" && action !== "off")) {
    console.error("Uso: npx tsx scripts/toggle-import.ts <email-do-usuario> <on|off>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    console.error(`Nenhum usuário encontrado com o e-mail "${email}".`);
    process.exit(1);
  }

  const empresa = await prisma.empresa.update({
    where: { id: user.empresaId },
    data: { importEnabled: action === "on" },
  });

  console.log(
    `Importação em lote ${action === "on" ? "HABILITADA" : "DESABILITADA"} para a empresa "${empresa.name}" (${empresa.id}).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
