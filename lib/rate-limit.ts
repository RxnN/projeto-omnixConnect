import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const testBuckets = new Map<string, { count: number; resetAt: number }>();

/** Janela fixa persistida no Postgres. Funciona entre processos, reinícios e instâncias
 * diferentes sem depender da memória local do servidor. */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  if (process.env.NODE_ENV === "test") {
    const nowMs = Date.now();
    const existingTest = testBuckets.get(key);
    if (!existingTest || existingTest.resetAt <= nowMs) {
      testBuckets.set(key, { count: 1, resetAt: nowMs + windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (existingTest.count >= limit) {
      return { allowed: false, retryAfterSeconds: Math.ceil((existingTest.resetAt - nowMs) / 1000) };
    }
    existingTest.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);

  // Limpeza amostral evita crescimento indefinido sem adicionar uma consulta
  // extra em toda requisição protegida.
  if (Math.random() < 0.01) {
    const retentionCutoff = new Date(now.getTime() - 24 * 60 * 60_000);
    await prisma.rateLimitBucket.deleteMany({
      where: { resetAt: { lt: retentionCutoff } },
    });
  }

  const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });

  if (!existing) {
    try {
      await prisma.rateLimitBucket.create({ data: { key, count: 1, resetAt: nextReset } });
      return { allowed: true, retryAfterSeconds: 0 };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return rateLimit(key, limit, windowMs);
      }
      throw error;
    }
  }

  if (existing.resetAt <= now) {
    const reset = await prisma.rateLimitBucket.updateMany({
      where: { key, resetAt: { lte: now } },
      data: { count: 1, resetAt: nextReset },
    });
    if (reset.count === 1) return { allowed: true, retryAfterSeconds: 0 };
    return rateLimit(key, limit, windowMs);
  }

  const incremented = await prisma.rateLimitBucket.updateMany({
    where: { key, resetAt: { gt: now }, count: { lt: limit } },
    data: { count: { increment: 1 } },
  });
  if (incremented.count === 1) return { allowed: true, retryAfterSeconds: 0 };

  const current = await prisma.rateLimitBucket.findUnique({ where: { key } });
  return {
    allowed: false,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil(((current?.resetAt ?? existing.resetAt).getTime() - now.getTime()) / 1000)
    ),
  };
}

export function clientIp(req: NextRequest): string {
  const trustProxy = process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "test";
  if (!trustProxy) return "proxy-nao-configurado";
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
