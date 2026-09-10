import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const loadedEnv = loadEnv("test", process.cwd(), "");
const testDatabaseUrl = loadedEnv.DATABASE_TEST_URL?.trim();
const testContextSecret = loadedEnv.RLS_CONTEXT_TEST_SECRET?.trim();

function databaseIdentity(value: string): string {
  const url = new URL(value);
  const port = url.port || "5432";
  return `${url.hostname.toLowerCase()}:${port}${url.pathname}`;
}

if (!testDatabaseUrl) {
  throw new Error(
    "DATABASE_TEST_URL não configurada. Os testes foram bloqueados para proteger o banco de produção. " +
      "Crie uma base/branch exclusiva e configure-a em .env.test.",
  );
}

for (const [name, value] of [
  ["DATABASE_URL", loadedEnv.DATABASE_URL],
  ["DATABASE_ADMIN_URL", loadedEnv.DATABASE_ADMIN_URL],
] as const) {
  if (value && databaseIdentity(testDatabaseUrl) === databaseIdentity(value)) {
    throw new Error(
      `DATABASE_TEST_URL aponta para a mesma base de ${name}. Os testes foram bloqueados para proteger a produção.`,
    );
  }
}

if (!testContextSecret || testContextSecret.length < 32) {
  throw new Error("RLS_CONTEXT_TEST_SECRET precisa ter pelo menos 32 caracteres em .env.test.");
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      ...loadedEnv,
      DATABASE_URL: testDatabaseUrl,
      DATABASE_ADMIN_URL: loadedEnv.DATABASE_ADMIN_TEST_URL ?? "",
      RLS_CONTEXT_SECRET: testContextSecret,
    },
    // Os testes de integração compartilham somente a base exclusiva de testes.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
