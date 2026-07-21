import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: loadEnv("test", process.cwd(), ""),
    // Testes de integração tocam o Postgres real (Neon); evita corrida entre
    // arquivos de teste rodando em paralelo contra o mesmo banco.
    fileParallelism: false,
  },
});
