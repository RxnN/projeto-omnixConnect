import { describe, expect, it } from "vitest";
import { signDatabaseContext } from "@/lib/prisma";

describe("assinatura do contexto RLS", () => {
  it("vincula a assinatura ao tipo e ao valor do contexto", () => {
    const tenantA = signDatabaseContext("tenant", "empresa-a");
    const tenantB = signDatabaseContext("tenant", "empresa-b");
    const loginA = signDatabaseContext("login", "empresa-a");

    expect(tenantA).toMatch(/^[a-f0-9]{64}$/);
    expect(tenantA).not.toBe(tenantB);
    expect(tenantA).not.toBe(loginA);
  });
});
