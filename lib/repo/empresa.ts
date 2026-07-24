import { prisma } from "../prisma";
import { createId } from "../id";
import type { Empresa, Filial, User } from "../types";
import { toIso } from "./shared";

export async function getEmpresaById(id: string): Promise<Empresa | undefined> {
  const empresa = await prisma.empresa.findUnique({ where: { id } });
  return empresa
    ? { ...empresa, paidUntil: empresa.paidUntil ? toIso(empresa.paidUntil) : null, createdAt: toIso(empresa.createdAt) }
    : undefined;
}

export async function createEmpresa(name: string, cnpjCpf: string): Promise<Empresa> {
  const empresa = await prisma.empresa.create({
    data: { id: createId("empresa"), name: name.trim(), cnpjCpf },
  });
  return { ...empresa, paidUntil: null, createdAt: toIso(empresa.createdAt) };
}

export async function registerEmpresaWithOwner(input: {
  empresaName: string;
  cnpjCpf: string;
  userName: string;
  phone: string;
  email: string;
  passwordHash: string;
}): Promise<{ empresa: Empresa; filial: Filial; user: User }> {
  const empresaId = createId("empresa");
  const created = await prisma.$transaction(async (tx) => {
    await tx.registrationDocument.create({
      data: { cnpjCpf: input.cnpjCpf, empresaId },
    });
    return tx.empresa.create({
      data: {
        id: empresaId,
        name: input.empresaName.trim(),
        cnpjCpf: input.cnpjCpf,
        filiais: {
          create: { id: createId("filial"), name: input.empresaName.trim() },
        },
        users: {
          create: {
            id: createId("user"),
            name: input.userName.trim(),
            phone: input.phone,
            email: input.email,
            passwordHash: input.passwordHash,
            role: "OWNER",
          },
        },
      },
      include: { filiais: true, users: true },
    });
  });
  const filial = created.filiais[0];
  const user = created.users[0];
  return {
    empresa: {
      id: created.id,
      name: created.name,
      cnpjCpf: created.cnpjCpf,
      importEnabled: created.importEnabled,
      approved: created.approved,
      paidUntil: created.paidUntil ? toIso(created.paidUntil) : null,
      maxFiliais: created.maxFiliais,
      createdAt: toIso(created.createdAt),
    },
    filial: { ...filial, createdAt: toIso(filial.createdAt) },
    user: {
      ...user,
      role: "OWNER",
      permissions: null,
      createdAt: toIso(user.createdAt),
    },
  };
}
