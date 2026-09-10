import type { Event } from "@sentry/nextjs";

/** Remove dados pessoais e credenciais antes de qualquer evento sair da aplicação. */
export function scrubSentryEvent<T extends Event>(event: T): T {
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
  }
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      const headers = { ...event.request.headers };
      for (const name of Object.keys(headers)) {
        if (["authorization", "cookie", "x-forwarded-for", "x-real-ip"].includes(name.toLowerCase())) {
          delete headers[name];
        }
      }
      event.request.headers = headers;
    }
  }
  return event;
}

export function tracesSampler(context: { name?: string }): number {
  return context.name?.includes("/api/health") ? 0 : 0.1;
}
