// Liga/desliga a importação em lote de produtos (planilha) para a adega de um usuário.
// Uso: npx tsx scripts/toggle-import.ts email@do-dono.com on
//      npx tsx scripts/toggle-import.ts email@do-dono.com off

import { prisma } from "../lib/prisma";

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

  const adega = await prisma.adega.update({
    where: { id: user.adegaId },
    data: { importEnabled: action === "on" },
  });

  console.log(
    `Importação em lote ${action === "on" ? "HABILITADA" : "DESABILITADA"} para a adega "${adega.name}" (${adega.id}).`
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
