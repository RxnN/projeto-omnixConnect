// Resumo operacional administrativo sem expor uma rota pública no site.
// Uso: npm run admin-status

import { adminPrisma as prisma } from "../lib/admin-prisma";

async function main() {
  const now = new Date();
  const expiringLimit = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const empresas = await prisma.empresa.findMany({
    select: {
      approved: true,
      paidUntil: true,
      users: {
        where: { role: "OWNER" },
        select: { emailVerifiedAt: true },
        take: 1,
      },
    },
  });

  const ownerVerified = (empresa: (typeof empresas)[number]) =>
    Boolean(empresa.users[0]?.emailVerifiedAt);
  const active = empresas.filter(
    (empresa) => empresa.approved && (!empresa.paidUntil || empresa.paidUntil >= now),
  );

  const summary = {
    "Empresas cadastradas": empresas.length,
    "Empresas ativas": active.length,
    "E-mail ainda não confirmado": empresas.filter((empresa) => !ownerVerified(empresa)).length,
    "E-mail confirmado, aguardando aprovação/pagamento": empresas.filter(
      (empresa) => !empresa.approved && ownerVerified(empresa),
    ).length,
    "Assinaturas vencidas": empresas.filter(
      (empresa) => empresa.approved && empresa.paidUntil && empresa.paidUntil < now,
    ).length,
    "Vencem nos próximos 5 dias": active.filter(
      (empresa) => empresa.paidUntil && empresa.paidUntil <= expiringLimit,
    ).length,
    "Ativas sem vencimento definido": active.filter((empresa) => !empresa.paidUntil).length,
  };

  console.table(summary);
  console.log(
    "Usuários online: indisponível — a aplicação ainda não persiste a última atividade no banco.",
  );
  console.log(
    "Pagamento pendente separado de aprovação: indisponível — o modelo atual usa um único estado para ambos.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
