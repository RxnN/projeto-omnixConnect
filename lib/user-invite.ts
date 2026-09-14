import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";

export const USER_INVITE_TTL_MS = 48 * 60 * 60 * 1000;

export function createUserInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashUserInviteToken(token), expiresAt: new Date(Date.now() + USER_INVITE_TTL_MS) };
}

export function hashUserInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function listPendingInvites(empresaId: string) {
  return prisma.userInvite.findMany({ where: { empresaId, acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
}
