import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUser } from "@/lib/repo";
import { seedFixture } from "./helpers";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from "@/lib/session";
import { POST as filiaisPost } from "@/app/api/filiais/route";

const POST = (req: NextRequest) => filiaisPost(req, undefined);

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/filiais", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

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

describe("POST /api/filiais", () => {
  afterEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("empresa nova (maxFiliais padrão 1) já bate no limite com a filial que nasce no cadastro", async () => {
    const { empresa, filial, user } = await seedFixture();
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(makeRequest({ name: "Filial Nova" }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/licenciada/);
  });

  it("permite criar filial extra depois que a licença é aumentada", async () => {
    const { empresa, filial, user } = await seedFixture();
    await prisma.empresa.update({ where: { id: empresa.id }, data: { maxFiliais: 2 } });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(makeRequest({ name: "Filial Nova" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.filial.name).toBe("Filial Nova");
  });

  it("bloqueia a terceira filial quando a licença é só pra 2", async () => {
    const { empresa, filial, user } = await seedFixture();
    await prisma.empresa.update({ where: { id: empresa.id }, data: { maxFiliais: 2 } });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const first = await POST(makeRequest({ name: "Segunda filial" }));
    expect(first.status).toBe(200);

    const second = await POST(makeRequest({ name: "Terceira filial" }));
    expect(second.status).toBe(403);
  });

  it("serializa criações concorrentes no limite contratado", async () => {
    const { empresa, filial, user } = await seedFixture();
    await prisma.empresa.update({ where: { id: empresa.id }, data: { maxFiliais: 2 } });
    await loginAs(empresa.id, filial.id, empresa.name, user.id, user.name, user.email, "OWNER");

    const responses = await Promise.all([
      POST(makeRequest({ name: "Concorrente A" })),
      POST(makeRequest({ name: "Concorrente B" })),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 403]);
  });

  it("funcionário não pode criar filial mesmo dentro da licença", async () => {
    const { empresa, filial } = await seedFixture();
    await prisma.empresa.update({ where: { id: empresa.id }, data: { maxFiliais: 5 } });
    const employee = await createUser({
      empresaId: empresa.id,
      name: "Funcionário",
      email: `filial-employee-${Date.now()}@teste.com`,
      passwordHash: "x",
      role: "EMPLOYEE",
    });
    await loginAs(
      empresa.id,
      filial.id,
      empresa.name,
      employee.id,
      employee.name,
      employee.email,
      "EMPLOYEE"
    );

    const res = await POST(makeRequest({ name: "Filial Nova" }));

    expect(res.status).toBe(403);
  });
});
