import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/repo", () => ({
  getUserById: vi.fn(),
  getEmpresaById: vi.fn(),
}));

import { getAccessState } from "@/lib/auth";
import { getEmpresaById, getUserById } from "@/lib/repo";
import { getCurrentUser } from "@/lib/session";

const sessionUser = {
  userId: "user-antigo",
  empresaId: "empresa-demo",
  empresaName: "Empresa Exemplo",
  filialId: null,
  name: "Renan Fernandes",
  email: "dono@empresaexemplo.com",
  role: "OWNER" as const,
  lastActivityAt: Date.now(),
};

describe("getAccessState", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("trata como não autenticada uma sessão cujo usuário foi recriado", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(sessionUser);
    vi.mocked(getUserById).mockResolvedValue(undefined);
    vi.mocked(getEmpresaById).mockResolvedValue(undefined);

    await expect(getAccessState()).resolves.toEqual({ status: "UNAUTHENTICATED" });
  });

  it("libera uma sessão que ainda corresponde ao usuário e à empresa", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(sessionUser);
    vi.mocked(getUserById).mockResolvedValue({
      id: sessionUser.userId,
      empresaId: sessionUser.empresaId,
      filialId: null,
      name: sessionUser.name,
      phone: null,
      email: sessionUser.email,
      emailVerifiedAt: new Date().toISOString(),
      passwordHash: "hash",
      role: "OWNER",
      permissions: null,
      createdAt: new Date().toISOString(),
    });
    vi.mocked(getEmpresaById).mockResolvedValue({
      id: sessionUser.empresaId,
      name: sessionUser.empresaName,
      cnpjCpf: null,
      importEnabled: true,
      approved: true,
      paidUntil: new Date(Date.now() + 86_400_000).toISOString(),
      maxFiliais: 1,
      createdAt: new Date().toISOString(),
    });

    const access = await getAccessState();

    expect(access.status).toBe("OK");
    if (access.status === "OK") expect(access.user.userId).toBe(sessionUser.userId);
  });
});
