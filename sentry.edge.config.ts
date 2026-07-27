import * as Sentry from "@sentry/nextjs";

// Cobre o middleware.ts, que roda no runtime edge (fora do Node.js normal).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
