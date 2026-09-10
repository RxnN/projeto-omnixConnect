import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent, tracesSampler } from "./lib/sentry-privacy";

// Cobre o middleware.ts, que roda no runtime edge (fora do Node.js normal).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampler,
  integrations: [Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] })],
  enableLogs: true,
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
});
