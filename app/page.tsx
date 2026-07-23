import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import Link from "next/link";
import Image from "next/image";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/pedidos");
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
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
            Gestão conectada para o seu negócio
          </p>
        </div>
        <div className="card">
          <LoginForm />
          <div className="text-center mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
              Não tem uma conta?{" "}
              <Link href="/cadastro" className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>
                Cadastre sua empresa
              </Link>
            </p>
          </div>
        </div>

        <div className="card mt-4 text-xs space-y-1" style={{ color: "var(--ink-soft)" }}>
          <p className="font-semibold">Credenciais de demonstração (senha: senha123)</p>
          <p>Dono: dono@empresaexemplo.com</p>
          <p>Gerente: gerente@empresaexemplo.com</p>
          <p>Funcionário: funcionario@empresaexemplo.com</p>
        </div>
      </div>
    </div>
  );
}
