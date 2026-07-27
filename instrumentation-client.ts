import * as Sentry from "@sentry/nextjs";

// Roda no navegador antes de qualquer outro código do app — captura erro de
// renderização/JS do lado do cliente. Sem NEXT_PUBLIC_SENTRY_DSN, fica desabilitado.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
