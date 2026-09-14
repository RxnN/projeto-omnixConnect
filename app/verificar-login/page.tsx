import { redirect } from "next/navigation";
import LoginMfaForm from "@/components/LoginMfaForm";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "seu e-mail";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export default async function LoginMfaPage() {
  const session = await getSession();
  if (session.user) redirect("/inicio");
  if (!session.loginMfa || session.loginMfa.expiresAt < Date.now()) redirect("/");

  return (
    <main className="page-container flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md">
        <LoginMfaForm email={maskEmail(session.loginMfa.email)} />
      </div>
    </main>
  );
}
