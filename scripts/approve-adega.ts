// Aprova (libera) ou revoga o acesso de uma adega — cadastro self-service nasce travado
// até o pagamento ser confirmado e a conta ser aprovada manualmente por aqui.
// Uso: npx tsx scripts/approve-adega.ts email@do-dono.com on [dias]   (dias default: 30)
//      npx tsx scripts/approve-adega.ts email@do-dono.com off

import { prisma } from "../lib/prisma";

const DEFAULT_DAYS = 30;

async function main() {
  const [email, action, daysArg] = process.argv.slice(2);

  if (!email || (action !== "on" && action !== "off")) {
    console.error("Uso: npx tsx scripts/approve-adega.ts <email-do-usuario> <on|off> [dias]");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    console.error(`Nenhum usuário encontrado com o e-mail "${email}".`);
    process.exit(1);
  }

  const days = daysArg ? Number(daysArg) : DEFAULT_DAYS;
  if (action === "on" && (!Number.isInteger(days) || days < 1)) {
    console.error("O número de dias deve ser um inteiro maior que zero.");
    process.exit(1);
  }

  const paidUntil = action === "on" ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

  const adega = await prisma.adega.update({
    where: { id: user.adegaId },
    data: { approved: action === "on", paidUntil },
  });

  console.log(
    action === "on"
      ? `Adega "${adega.name}" (${adega.id}) APROVADA — acesso liberado até ${paidUntil!.toLocaleDateString("pt-BR")} (${days} dias).`
      : `Adega "${adega.name}" (${adega.id}) com acesso REVOGADO.`
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
