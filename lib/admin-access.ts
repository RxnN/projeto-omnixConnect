import { redirect } from "next/navigation";
import { ApiError } from "./api-handler";
import { enterAdminDatabaseContext, prisma } from "./prisma";
import { getCurrentUser } from "./session";

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

export async function requireSuperAdminPage() {
  const admin = await currentVerifiedAdmin();
  if (!admin) redirect("/acesso-negado");
  return admin;
}

export async function requireSuperAdminApi() {
  const admin = await currentVerifiedAdmin();
  if (!admin) throw new ApiError(403, "Acesso administrativo não autorizado.");
  return admin;
}
