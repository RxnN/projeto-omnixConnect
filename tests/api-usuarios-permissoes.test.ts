import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createUser } from "@/lib/repo";
import { prisma, runWithDatabaseContext } from "@/lib/prisma";
import { seedFixture } from "./helpers";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from "@/lib/session";
import { PUT as permissoesPut } from "@/app/api/usuarios/[id]/permissoes/route";

async function loginAs(
  empresaId: string,
  filialId: string,
  empresaName: string,
  userId: string,
  name: string,
  email: string,
  role: "OWNER" | "MANAGER" | "EMPLOYEE"
) {
  vi.mocked(getCurrentUser).mockResolvedValue({ userId, empresaId, empresaName, filialId, name, email, role, lastActivityAt: Date.now() });
}

describe("PUT /api/usuarios/[id]/permissoes", () => {
  afterEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("não permite alterar permissões de usuário de outra empresa (isolamento multi-tenant)", async () => {
    const { empresa, filial, user: owner } = await seedFixture();
    const other = await seedFixture();
    const foreignEmployee = await createUser({
      empresaId: other.empresa.id,
      name: "Funcionário de Outra Empresa",
      email: `outro-func-${Date.now()}@teste.com`,
      passwordHash: "hash-fake",
      role: "EMPLOYEE",
    });
    await loginAs(empresa.id, filial.id, empresa.name, owner.id, owner.name, owner.email, "OWNER");

    const res = await permissoesPut(
      new NextRequest("http://localhost/api/usuarios/x/permissoes", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reset: false, permissions: { VIEW_REPORTS: true } }),
      }),
      { params: Promise.resolve({ id: foreignEmployee.id }) }
    );

    expect(res.status).toBe(404);
    const stillUnchanged = await runWithDatabaseContext("tenant", other.empresa.id, () =>
      prisma.user.findUnique({ where: { id: foreignEmployee.id } }),
    );
    expect(stillUnchanged?.permissions).toBeNull();
  });
});
