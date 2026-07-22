import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
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
  adegaId: string,
  filialId: string,
  adegaName: string,
  userId: string,
  name: string,
  email: string,
  role: "OWNER" | "MANAGER" | "EMPLOYEE"
) {
  vi.mocked(getCurrentUser).mockResolvedValue({ userId, adegaId, adegaName, filialId, name, email, role });
}

describe("POST /api/filiais", () => {
  afterEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("adega nova (maxFiliais padrão 1) já bate no limite com a filial que nasce no cadastro", async () => {
    const { adega, filial, user } = await seedFixture();
    await loginAs(adega.id, filial.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(makeRequest({ name: "Filial Nova" }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/licenciada/);
  });

  it("permite criar filial extra depois que a licença é aumentada", async () => {
    const { adega, filial, user } = await seedFixture();
    await prisma.adega.update({ where: { id: adega.id }, data: { maxFiliais: 2 } });
    await loginAs(adega.id, filial.id, adega.name, user.id, user.name, user.email, "OWNER");

    const res = await POST(makeRequest({ name: "Filial Nova" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.filial.name).toBe("Filial Nova");
  });

  it("bloqueia a terceira filial quando a licença é só pra 2", async () => {
    const { adega, filial, user } = await seedFixture();
    await prisma.adega.update({ where: { id: adega.id }, data: { maxFiliais: 2 } });
    await loginAs(adega.id, filial.id, adega.name, user.id, user.name, user.email, "OWNER");

    const first = await POST(makeRequest({ name: "Segunda filial" }));
    expect(first.status).toBe(200);

    const second = await POST(makeRequest({ name: "Terceira filial" }));
    expect(second.status).toBe(403);
  });

  it("funcionário não pode criar filial mesmo dentro da licença", async () => {
    const { adega, filial, user } = await seedFixture();
    await prisma.adega.update({ where: { id: adega.id }, data: { maxFiliais: 5 } });
    await loginAs(adega.id, filial.id, adega.name, user.id, user.name, user.email, "EMPLOYEE");

    const res = await POST(makeRequest({ name: "Filial Nova" }));

    expect(res.status).toBe(403);
  });
});
