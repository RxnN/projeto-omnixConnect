import { describe, expect, it } from "vitest";
import { scrubSentryEvent, tracesSampler } from "@/lib/sentry-privacy";

describe("privacidade do monitoramento", () => {
  it("remove credenciais, IP e conteúdo do corpo", () => {
    const event = scrubSentryEvent({
      event_id: "x",
      user: { email: "pessoa@example.com", ip_address: "127.0.0.1", username: "pessoa", id: "id-opaco" },
      request: {
        cookies: { session: "segredo" },
        data: { password: "segredo" },
        headers: { Authorization: "Bearer segredo", Cookie: "sessao=segredo", Accept: "application/json" },
      },
    });
    expect(event.user).toEqual({ id: "id-opaco" });
    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.data).toBeUndefined();
    expect(event.request?.headers).toEqual({ Accept: "application/json" });
  });

  it("não coleta rastreamento da rota de saúde", () => {
    expect(tracesSampler({ name: "GET /api/health" })).toBe(0);
    expect(tracesSampler({ name: "POST /api/login" })).toBe(0.1);
  });
});
