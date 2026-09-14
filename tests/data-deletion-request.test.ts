import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma, runWithDatabaseContext } from "@/lib/prisma";
import { seedFixture } from "./helpers";

vi.mock("@/lib/auth", () => ({ requireApiUser: vi.fn() }));
import { requireApiUser } from "@/lib/auth";
import { POST as requestDeletion } from "@/app/api/dados/exclusao/route";

describe("solicitação de exclusão", () => {
  it("exige o nome exato e cria uma fila sem apagar dados", async () => {
    const { empresa, user } = await seedFixture();
    vi.mocked(requireApiUser).mockResolvedValue({ userId: user.id, empresaId: empresa.id, empresaName: empresa.name, filialId: null, name: user.name, email: user.email, role: "OWNER", sessionVersion: 0, lastActivityAt: Date.now() });
    const invalid = await requestDeletion(new NextRequest("http://localhost/api/dados/exclusao", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation: "nome errado" }) }), undefined);
    expect(invalid.status).toBe(400);
    const valid = await requestDeletion(new NextRequest("http://localhost/api/dados/exclusao", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation: empresa.name, reason: "Teste controlado" }) }), undefined);
    expect(valid.status).toBe(200);
    const stored = await runWithDatabaseContext("tenant", empresa.id, () => prisma.dataDeletionRequest.findFirst({ where: { empresaId: empresa.id } }));
    expect(stored).toMatchObject({ status: "PENDING", empresaName: empresa.name });
    const companyStillExists = await runWithDatabaseContext("tenant", empresa.id, () => prisma.empresa.findUnique({ where: { id: empresa.id } }));
    expect(companyStillExists).not.toBeNull();
  });
});
