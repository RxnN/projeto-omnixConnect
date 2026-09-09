// Define quantas filiais uma empresa pode ter — licenciado manualmente por você,
// não é algo que o dono habilita sozinho.
// Uso: npx tsx scripts/set-max-filiais.ts email@do-dono.com 3

import { adminPrisma as prisma } from "../lib/admin-prisma";

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

  const empresa = await prisma.empresa.update({
    where: { id: user.empresaId },
    data: { maxFiliais: count },
  });

  console.log(`Empresa "${empresa.name}" (${empresa.id}) agora pode ter até ${count} filial(is).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
