import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";

export const POST = withErrorHandling(async (_req: NextRequest) => {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true });
});
