import PageHeader from "@/components/PageHeader";
import SessionManager from "@/components/SessionManager";
import { requireUser } from "@/lib/auth";
import { listUserSessions, sessionDeviceLabel } from "@/lib/user-session";
import DeletionRequestForm from "@/components/DeletionRequestForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SegurancaPage() {
  const user = await requireUser();
  const sessions = await listUserSessions(user.userId, user.empresaId);
  const deletion = user.role === "OWNER" ? await prisma.dataDeletionRequest.findFirst({ where: { empresaId: user.empresaId, status: "PENDING" } }) : null;
  return <div className="space-y-6"><PageHeader eyebrow="Conta" title="Segurança" description="Acompanhe e controle os dispositivos que acessaram sua conta." /><SessionManager initialSessions={sessions.map((session) => ({ id: session.id, label: sessionDeviceLabel(session.userAgent), createdAt: session.createdAt.toISOString(), lastSeenAt: session.lastSeenAt.toISOString(), current: session.id === user.sessionId }))} />{user.role === "OWNER" && <DeletionRequestForm empresaName={user.empresaName} pending={Boolean(deletion)} />}</div>;
}
