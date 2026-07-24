import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";
import { createId } from "../id";
import type { PermissionOverrides, Role, User } from "../types";
import { normalizePermissionOverrides } from "../permissions";
import { toIso } from "./shared";

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const user = await prisma.user.findUnique({ where: { email } });
  return user ? mapUser(user) : undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? mapUser(user) : undefined;
}

export async function listUsersByEmpresa(empresaId: string): Promise<User[]> {
  const users = await prisma.user.findMany({ where: { empresaId }, orderBy: { createdAt: "asc" } });
  return users.map(mapUser);
}

function mapUser(user: Prisma.UserGetPayload<object>): User {
  return {
    ...user,
    role: user.role as Role,
    permissions: normalizePermissionOverrides(user.permissions),
    createdAt: toIso(user.createdAt),
  };
}

export async function createUser(input: {
  empresaId: string;
  filialId?: string | null;
  name: string;
  phone?: string;
  email: string;
  passwordHash: string;
  role: Role;
}): Promise<User> {
  let filialId: string | null = null;
  if (input.role !== "OWNER") {
    const filial = input.filialId
      ? await prisma.filial.findFirst({ where: { id: input.filialId, empresaId: input.empresaId }, select: { id: true } })
      : await prisma.filial.findFirst({ where: { empresaId: input.empresaId }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (!filial) {
      throw new Error("Gerentes e funcionários precisam estar vinculados a uma filial válida.");
    }
    filialId = filial.id;
  }
  const user = await prisma.user.create({
    data: {
      id: createId("user"),
      empresaId: input.empresaId,
      filialId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
    },
  });
  return mapUser(user);
}

export async function updateUserPermissions(
  id: string,
  empresaId: string,
  permissions: PermissionOverrides | null
): Promise<User | undefined> {
  const existing = await prisma.user.findFirst({ where: { id, empresaId } });
  if (!existing) return undefined;
  const user = await prisma.user.update({
    where: { id },
    data: { permissions: permissions ?? Prisma.DbNull },
  });
  return mapUser(user);
}
