import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";
import { enterTenantDatabaseContext } from "@/lib/prisma";
import { revokeUserSession } from "@/lib/user-session";

export const POST = withErrorHandling(async (_req: NextRequest) => {
  const session = await getSession();
  if (session.user?.sessionId) {
    enterTenantDatabaseContext(session.user.empresaId);
    await revokeUserSession(session.user.sessionId, session.user.userId, session.user.empresaId);
  }
  session.destroy();
  return NextResponse.json({ ok: true });
});
