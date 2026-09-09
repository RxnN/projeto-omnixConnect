import { AsyncLocalStorage } from "node:async_hooks";
import { createHmac } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";

export type DatabaseContextKind = "tenant" | "login" | "verify";

interface DatabaseContext {
  kind: DatabaseContextKind;
  value: string;
  transaction?: Prisma.TransactionClient;
}

type PrismaGlobals = {
  __prismaGlobal?: PrismaClient;
  __databaseContext?: AsyncLocalStorage<DatabaseContext>;
};

const globalForPrisma = globalThis as unknown as PrismaGlobals;
const rawPrisma = globalForPrisma.__prismaGlobal ?? new PrismaClient();
const databaseContext = globalForPrisma.__databaseContext ?? new AsyncLocalStorage<DatabaseContext>();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prismaGlobal = rawPrisma;
  globalForPrisma.__databaseContext = databaseContext;
}

function contextSecret(): string {
  const secret = process.env.RLS_CONTEXT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("RLS_CONTEXT_SECRET precisa ter pelo menos 32 caracteres.");
  }
  return secret;
}

export function signDatabaseContext(kind: DatabaseContextKind, value: string): string {
  return createHmac("sha256", contextSecret()).update(`${kind}:${value}`).digest("hex");
}

async function applyDatabaseContext(tx: Prisma.TransactionClient, context: DatabaseContext) {
  const signature = signDatabaseContext(context.kind, context.value);
  await tx.$executeRaw`
    SELECT
      set_config('app.context_kind', ${context.kind}, TRUE),
      set_config('app.context_value', ${context.value}, TRUE),
      set_config('app.context_signature', ${signature}, TRUE)
  `;
}

function isTransientConnectionError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    (typeof error === "object" &&
      error !== null &&
      ("code" in error || "errorCode" in error) &&
      ((error as { code?: string }).code === "P1001" ||
        (error as { errorCode?: string }).errorCode === "P1001"))
  );
}

async function retryTransientConnection<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isTransientConnectionError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 300));
    return operation();
  }
}

export function runWithDatabaseContext<T>(
  kind: DatabaseContextKind,
  value: string,
  callback: () => T,
): T {
  return databaseContext.run({ kind, value }, callback);
}

export function enterTenantDatabaseContext(empresaId: string): void {
  const current = databaseContext.getStore();
  if (current?.kind === "tenant" && current.value === empresaId) return;
  databaseContext.enterWith({ kind: "tenant", value: empresaId });
}

async function executeWithContext<T>(operation: (client: any) => Promise<T>): Promise<T> {
  const context = databaseContext.getStore();
  if (!context) return retryTransientConnection(() => operation(rawPrisma));
  if (context.transaction) return operation(context.transaction);

  return retryTransientConnection(() =>
    rawPrisma.$transaction(async (tx) => {
      await applyDatabaseContext(tx, context);
      return databaseContext.run({ ...context, transaction: tx }, () => operation(tx));
    }, { maxWait: 10_000, timeout: 30_000 }),
  );
}

const modelNames = new Set([
  "empresa",
  "filial",
  "counter",
  "rateLimitBucket",
  "registrationDocument",
  "user",
  "emailVerificationToken",
  "product",
  "promotion",
  "pedido",
  "movement",
]);

const rawMethods = new Set(["$queryRaw", "$queryRawUnsafe", "$executeRaw", "$executeRawUnsafe"]);
const delegateProxies = new Map<string, object>();

function modelDelegate(modelName: string): object {
  const existing = delegateProxies.get(modelName);
  if (existing) return existing;

  const proxy = new Proxy(
    {},
    {
      get(_target, method) {
        if (typeof method !== "string") return undefined;
        return (...args: unknown[]) => executeWithContext((client) => client[modelName][method](...args));
      },
    },
  );
  delegateProxies.set(modelName, proxy);
  return proxy;
}

function transactionWithContext(first: unknown, options?: unknown) {
  const context = databaseContext.getStore();
  if (typeof first !== "function") {
    if (context) {
      throw new Error("Transações em lote não são permitidas dentro de um contexto RLS; use uma função interativa.");
    }
    return (rawPrisma.$transaction as any)(first, options);
  }

  if (context?.transaction) {
    return (first as (tx: Prisma.TransactionClient) => unknown)(context.transaction);
  }

  return retryTransientConnection(() =>
    rawPrisma.$transaction(async (tx) => {
      if (!context) return (first as (client: Prisma.TransactionClient) => unknown)(tx);
      await applyDatabaseContext(tx, context);
      return databaseContext.run(
        { ...context, transaction: tx },
        () => (first as (client: Prisma.TransactionClient) => unknown)(tx),
      );
    }, { maxWait: 10_000, timeout: 30_000, ...((options as object | undefined) ?? {}) } as any),
  );
}

export const prisma = new Proxy(rawPrisma, {
  get(target, property, receiver) {
    if (property === "$transaction") return transactionWithContext;
    if (typeof property === "string" && modelNames.has(property)) return modelDelegate(property);
    if (typeof property === "string" && rawMethods.has(property)) {
      return (...args: unknown[]) => executeWithContext((client) => client[property](...args));
    }
    const value = Reflect.get(target, property, receiver);
    return typeof value === "function" ? value.bind(target) : value;
  },
}) as PrismaClient;
