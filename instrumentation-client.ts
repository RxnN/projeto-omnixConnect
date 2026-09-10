import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent, tracesSampler } from "./lib/sentry-privacy";

// Roda no navegador antes de qualquer outro código do app — captura erro de
// renderização/JS do lado do cliente. Sem NEXT_PUBLIC_SENTRY_DSN, fica desabilitado.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampler,
  integrations: [Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] })],
  enableLogs: true,
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
