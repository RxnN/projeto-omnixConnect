import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import CadastroForm from "@/components/CadastroForm";
import Image from "next/image";

export default async function CadastroPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/pedidos");
  }

  return (
    <div className="min-h-screen flex items-start justify-center px-4 pt-10 pb-14 sm:pt-14">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="auth-brand-lockup">
            <Image
              src="/brand/omnix-connect-mark.png"
              alt=""
              width={44}
              height={28}
              className="auth-brand-logo"
              priority
            />
            <span className="auth-brand-copy">
              <strong>OMNIX</strong>
              <small>CONNECT</small>
            </span>
          </div>
          <p className="mt-1" style={{ color: "var(--ink-soft)" }}>
            Faça seu cadastro e comece a gerenciar seu negócio
          </p>
        </div>
        <div className="card">
          <CadastroForm />
        </div>
      </div>
    </div>
  );
}
