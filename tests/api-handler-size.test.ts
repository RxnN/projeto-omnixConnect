import { describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";

describe("limite real do corpo da API", () => {
  it("rejeita JSON acima de 1 MiB mesmo sem Content-Length", async () => {
    const handler = withErrorHandling(async () => NextResponse.json({ ok: true }));
    const req = new NextRequest("http://localhost/api/teste", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(1024 * 1024) }),
    });
    req.headers.delete("content-length");

    const res = await handler(req, undefined);

    expect(res.status).toBe(413);
  });
});
