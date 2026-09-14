import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { recordTenantAudit } from "@/lib/tenant-audit";
import { revokeOtherUserSessions } from "@/lib/user-session";

export const POST = withErrorHandling(async () => {
  const user = await requireApiUser();
  const result = await revokeOtherUserSessions(user.sessionId, user.userId, user.empresaId);
  await recordTenantAudit({ user, action: "OTHER_SESSIONS_REVOKED", entityType: "UserSession", details: { count: result.count } });
  return NextResponse.json({ ok: true, count: result.count });
});
