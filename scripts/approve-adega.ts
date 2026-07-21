// Aprova (libera) ou revoga o acesso de uma adega — cadastro self-service nasce travado
// até o pagamento ser confirmado e a conta ser aprovada manualmente por aqui.
// Uso: npx tsx scripts/approve-adega.ts email@do-dono.com on
//      npx tsx scripts/approve-adega.ts email@do-dono.com off

import { prisma } from "../lib/prisma";

async function main() {
  const [email, action] = process.argv.slice(2);

  if (!email || (action !== "on" && action !== "off")) {
    console.error("Uso: npx tsx scripts/approve-adega.ts <email-do-usuario> <on|off>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    console.error(`Nenhum usuário encontrado com o e-mail "${email}".`);
    process.exit(1);
  }

  const adega = await prisma.adega.update({
    where: { id: user.adegaId },
    data: { approved: action === "on" },
  });

  console.log(
    `Adega "${adega.name}" (${adega.id}) ${action === "on" ? "APROVADA — acesso liberado." : "com acesso REVOGADO."}`
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
