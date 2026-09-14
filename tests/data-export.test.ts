import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { seedFixture } from "./helpers";

vi.mock("@/lib/auth", () => ({ requireApiUser: vi.fn() }));
import { requireApiUser } from "@/lib/auth";
import { GET as exportGet } from "@/app/api/dados/export/route";

describe("exportação de dados", () => {
  it("permite ao dono exportar sem hashes de senha", async () => {
    const { empresa, user } = await seedFixture();
    vi.mocked(requireApiUser).mockResolvedValue({
      userId: user.id, empresaId: empresa.id, empresaName: empresa.name, filialId: null,
      name: user.name, email: user.email, role: "OWNER", sessionVersion: 0, lastActivityAt: Date.now(),
    });
    const response = await exportGet(new NextRequest("http://localhost/api/dados/export"), undefined);
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(text).toContain(user.email);
    expect(text).not.toContain("passwordHash");
  });
});
