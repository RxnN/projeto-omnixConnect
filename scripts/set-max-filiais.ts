// Define quantas filiais uma adega pode ter — licenciado manualmente por você,
// não é algo que o dono habilita sozinho.
// Uso: npx tsx scripts/set-max-filiais.ts email@do-dono.com 3

import { prisma } from "../lib/prisma";

async function main() {
  const [email, countArg] = process.argv.slice(2);
  const count = Number(countArg);

  if (!email || !Number.isInteger(count) || count < 1) {
    console.error("Uso: npx tsx scripts/set-max-filiais.ts <email-do-usuario> <quantidade>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    console.error(`Nenhum usuário encontrado com o e-mail "${email}".`);
    process.exit(1);
  }

  const adega = await prisma.adega.update({
    where: { id: user.adegaId },
    data: { maxFiliais: count },
  });

  console.log(`Adega "${adega.name}" (${adega.id}) agora pode ter até ${count} filial(is).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
