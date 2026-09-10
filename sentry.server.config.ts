import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent, tracesSampler } from "./lib/sentry-privacy";

// Sem NEXT_PUBLIC_SENTRY_DSN configurada, o SDK fica desabilitado (não envia nada,
// não quebra o app) — é o estado normal antes de criar a conta no Sentry.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampler,
  // Envia console.error/warn/log do servidor (ex: o console.error de lib/api-handler.ts)
  // pra aba Logs do Sentry, além do captureException que já cria o Issue.
  integrations: [Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] })],
  enableLogs: true,
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
});
