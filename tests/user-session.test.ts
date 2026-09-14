import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { runWithDatabaseContext } from "@/lib/prisma";
import { createTrackedSession, listUserSessions, revokeUserSession, sessionDeviceLabel, validateTrackedSession } from "@/lib/user-session";
import { seedFixture } from "./helpers";

describe("sessões rastreadas", () => {
  it("cria, lista e revoga um dispositivo no servidor", async () => {
    const { empresa, user } = await seedFixture();
    const request = new NextRequest("https://app.example.com/api/login", { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/140.0", "x-forwarded-for": "10.0.0.8" } });
    const id = await runWithDatabaseContext("tenant", empresa.id, () => createTrackedSession(user.id, empresa.id, request));
    expect(await runWithDatabaseContext("tenant", empresa.id, () => validateTrackedSession(id, user.id, empresa.id))).toBe(true);
    const sessions = await runWithDatabaseContext("tenant", empresa.id, () => listUserSessions(user.id, empresa.id));
    expect(sessions.some((item) => item.id === id)).toBe(true);
    expect(sessionDeviceLabel(sessions[0].userAgent)).toContain("Chrome em Windows");
    await runWithDatabaseContext("tenant", empresa.id, () => revokeUserSession(id, user.id, empresa.id));
    expect(await runWithDatabaseContext("tenant", empresa.id, () => validateTrackedSession(id, user.id, empresa.id))).toBe(false);
  });
});
