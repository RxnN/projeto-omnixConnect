import { redirect } from "next/navigation";
import AdminMfaForm from "@/components/AdminMfaForm";
import { hasFreshAdminMfa, requireSuperAdminIdentityPage } from "@/lib/admin-access";
import { getAdminPath } from "@/lib/admin-path";

export const dynamic = "force-dynamic";

export default async function AdminMfaPage() {
  const admin = await requireSuperAdminIdentityPage();
  if (await hasFreshAdminMfa()) redirect(getAdminPath());
  return <main className="page-container flex min-h-[70vh] items-center justify-center"><AdminMfaForm email={admin.email} /></main>;
}
