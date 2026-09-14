import { createHmac, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { clientIp } from "./rate-limit";
import { SESSION_TTL_SECONDS } from "./session";

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

function hashIp(ip: string): string | null {
  if (!ip || ip === "unknown" || ip === "proxy-nao-configurado") return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(`session-ip:${ip}`).digest("hex");
}

export async function createTrackedSession(userId: string, empresaId: string, req: NextRequest): Promise<string> {
  const id = randomUUID();
  await prisma.userSession.create({
    data: {
      id,
      userId,
      empresaId,
      userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      ipHash: hashIp(clientIp(req)),
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    },
  });
  return id;
}

export async function validateTrackedSession(id: string, userId: string, empresaId: string): Promise<boolean> {
  const now = new Date();
  const tracked = await prisma.userSession.findFirst({ where: { id, userId, empresaId, revokedAt: null, expiresAt: { gt: now } } });
  if (!tracked) return false;
  if (tracked.lastSeenAt.getTime() < now.getTime() - TOUCH_INTERVAL_MS) {
    await prisma.userSession.updateMany({ where: { id, userId, empresaId, revokedAt: null }, data: { lastSeenAt: now } });
  }
  return true;
}

export async function listUserSessions(userId: string, empresaId: string) {
  return prisma.userSession.findMany({ where: { userId, empresaId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } });
}

export async function revokeUserSession(id: string, userId: string, empresaId: string) {
  return prisma.userSession.updateMany({ where: { id, userId, empresaId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeOtherUserSessions(currentId: string | undefined, userId: string, empresaId: string) {
  return prisma.userSession.updateMany({ where: { userId, empresaId, revokedAt: null, ...(currentId ? { id: { not: currentId } } : {}) }, data: { revokedAt: new Date() } });
}

export function sessionDeviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Dispositivo desconhecido";
  const browser = userAgent.includes("Edg/") ? "Edge" : userAgent.includes("Chrome/") ? "Chrome" : userAgent.includes("Firefox/") ? "Firefox" : userAgent.includes("Safari/") ? "Safari" : "Navegador";
  const system = userAgent.includes("Windows") ? "Windows" : userAgent.includes("Android") ? "Android" : userAgent.includes("iPhone") || userAgent.includes("iPad") ? "iOS" : userAgent.includes("Mac OS") ? "macOS" : "dispositivo";
  return `${browser} em ${system}`;
}
