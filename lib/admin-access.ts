import { redirect } from "next/navigation";
import { ApiError } from "./api-handler";
import { getAdminMfaPath } from "./admin-path";
import { enterAdminDatabaseContext, prisma } from "./prisma";
import { getCurrentUser, getSession } from "./session";

export const ADMIN_MFA_TTL_MS = 30 * 60 * 1000;

function configuredAdminEmails(): Set<string> {
  return new Set(
    (process.env.SUPER_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isSuperAdminEmail(email: string): boolean {
  return configuredAdminEmails().has(email.trim().toLowerCase());
}

async function currentVerifiedAdmin() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || !isSuperAdminEmail(sessionUser.email)) return null;

  enterAdminDatabaseContext(sessionUser.email);
  const current = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!current?.emailVerifiedAt || !isSuperAdminEmail(current.email)) return null;
  return { ...sessionUser, email: current.email };
}

export async function requireSuperAdminIdentityPage() {
  const admin = await currentVerifiedAdmin();
  if (!admin) redirect("/acesso-negado");
  return admin;
}

export async function requireSuperAdminIdentityApi() {
  const admin = await currentVerifiedAdmin();
  if (!admin) throw new ApiError(403, "Acesso administrativo não autorizado.");
  return admin;
}

export async function hasFreshAdminMfa(): Promise<boolean> {
  const session = await getSession();
  const verifiedAt = session.adminMfa?.verifiedAt;
  return Boolean(verifiedAt && Date.now() - verifiedAt <= ADMIN_MFA_TTL_MS);
}

export async function requireSuperAdminPage() {
  const admin = await requireSuperAdminIdentityPage();
  if (!(await hasFreshAdminMfa())) redirect(getAdminMfaPath());
  return admin;
}

export async function requireSuperAdminApi() {
  const admin = await requireSuperAdminIdentityApi();
  if (!(await hasFreshAdminMfa())) throw new ApiError(403, "Confirme o código de segurança do administrador.");
  return admin;
}
