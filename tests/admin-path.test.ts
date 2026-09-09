import { afterEach, describe, expect, it } from "vitest";
import { getAdminPath } from "@/lib/admin-path";

const original = process.env.ADMIN_PATH;

afterEach(() => {
  if (original === undefined) delete process.env.ADMIN_PATH;
  else process.env.ADMIN_PATH = original;
});

describe("getAdminPath", () => {
  it("mantém /admin quando não foi configurado", () => {
    delete process.env.ADMIN_PATH;
    expect(getAdminPath()).toBe("/admin");
  });

  it("aceita um caminho administrativo longo e não público", () => {
    process.env.ADMIN_PATH = "/central-gestao-a1b2c3d4";
    expect(getAdminPath()).toBe("/central-gestao-a1b2c3d4");
  });

  it("recusa caminhos curtos ou fora do padrão", () => {
    process.env.ADMIN_PATH = "/adm";
    expect(() => getAdminPath()).toThrow("ADMIN_PATH");
  });
});
