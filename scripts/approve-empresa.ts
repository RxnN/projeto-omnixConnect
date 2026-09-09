// Aprova (libera) ou revoga o acesso de uma empresa — cadastro self-service nasce travado
// até o pagamento ser confirmado e a conta ser aprovada manualmente por aqui.
// Uso: npx tsx scripts/approve-empresa.ts email@do-dono.com on [dias]   (dias default: 30)
//      npx tsx scripts/approve-empresa.ts email@do-dono.com off

import { adminPrisma as prisma } from "../lib/admin-prisma";

const DEFAULT_DAYS = 30;

async function main() {
  const [email, action, daysArg] = process.argv.slice(2);

  if (!email || (action !== "on" && action !== "off")) {
    console.error("Uso: npx tsx scripts/approve-empresa.ts <email-do-usuario> <on|off> [dias]");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    console.error(`Nenhum usuário encontrado com o e-mail "${email}".`);
    process.exit(1);
  }
  if (action === "on" && !user.emailVerifiedAt) {
    throw new Error("O e-mail do proprietário ainda não foi confirmado.");
  }

  const days = daysArg ? Number(daysArg) : DEFAULT_DAYS;
  if (action === "on" && (!Number.isInteger(days) || days < 1)) {
    console.error("O número de dias deve ser um inteiro maior que zero.");
    process.exit(1);
  }

  const paidUntil = action === "on" ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

  const empresa = await prisma.$transaction(async (tx) => {
    const current = await tx.empresa.findUniqueOrThrow({ where: { id: user.empresaId } });
    if (action === "on" && current.cnpjCpf) {
      const reservation = await tx.registrationDocument.findUnique({ where: { cnpjCpf: current.cnpjCpf } });
      if (reservation && reservation.empresaId !== current.id) {
        throw new Error("Este CPF/CNPJ já pertence a outra empresa aprovada.");
      }
      if (!reservation) {
        await tx.registrationDocument.create({ data: { cnpjCpf: current.cnpjCpf, empresaId: current.id } });
      }
    }
    return tx.empresa.update({
      where: { id: user.empresaId },
      data: { approved: action === "on", paidUntil },
    });
  });

  console.log(
    action === "on"
      ? `Empresa "${empresa.name}" (${empresa.id}) APROVADA — acesso liberado até ${paidUntil!.toLocaleDateString("pt-BR")} (${days} dias).`
      : `Empresa "${empresa.name}" (${empresa.id}) com acesso REVOGADO.`
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
