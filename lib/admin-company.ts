import { ApiError } from "./api-handler";
import { prisma } from "./prisma";

export async function listAdminCompanies() {
  return prisma.empresa.findMany({
    select: {
      id: true,
      name: true,
      approved: true,
      paidUntil: true,
      createdAt: true,
      users: {
        where: { role: "OWNER" },
        select: { email: true, emailVerifiedAt: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function activateAdminCompany(empresaId: string, days: number, adminEmail: string) {
  return prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.findUnique({
      where: { id: empresaId },
      include: {
        users: {
          where: { role: "OWNER" },
          select: { emailVerifiedAt: true },
          take: 1,
        },
      },
    });
    if (!empresa) throw new ApiError(404, "Empresa não encontrada.");
    if (!empresa.users[0]?.emailVerifiedAt) {
      throw new ApiError(409, "O proprietário ainda não confirmou o e-mail.");
    }
    if (empresa.approved && !empresa.paidUntil) {
      throw new ApiError(409, "Esta empresa já está ativa sem vencimento definido.");
    }

    if (empresa.cnpjCpf) {
      const reservation = await tx.registrationDocument.findUnique({
        where: { cnpjCpf: empresa.cnpjCpf },
      });
      if (reservation && reservation.empresaId !== empresa.id) {
        throw new ApiError(409, "Este CPF/CNPJ já pertence a outra empresa ativa.");
      }
      if (!reservation) {
        await tx.registrationDocument.create({
          data: { cnpjCpf: empresa.cnpjCpf, empresaId: empresa.id },
        });
      }
    }

    const renewalBase = empresa.paidUntil && empresa.paidUntil > new Date() ? empresa.paidUntil : new Date();
    const paidUntil = new Date(renewalBase.getTime() + days * 24 * 60 * 60 * 1000);
    const updated = await tx.empresa.update({
      where: { id: empresa.id },
      data: { approved: true, paidUntil },
      select: { id: true, approved: true, paidUntil: true },
    });
    await tx.adminAuditLog.create({
      data: {
        action: empresa.approved ? "COMPANY_RENEWED" : "COMPANY_ACTIVATED",
        adminEmail: adminEmail.trim().toLowerCase(),
        empresaId: empresa.id,
        empresaName: empresa.name,
        details: {
          days,
          previousApproved: empresa.approved,
          previousPaidUntil: empresa.paidUntil?.toISOString() ?? null,
          newPaidUntil: paidUntil.toISOString(),
        },
      },
    });
    return updated;
  });
}
