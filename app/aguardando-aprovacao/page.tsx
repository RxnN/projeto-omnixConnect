import { redirect } from "next/navigation";
import { getEmpresaById } from "@/lib/repo";
import { getAccessState, isSubscriptionExpired } from "@/lib/auth";

export default async function AguardandoAprovacaoPage() {
  const access = await getAccessState();
  if (access.status === "UNAUTHENTICATED") redirect("/");
  if (access.status === "OK") redirect("/inicio");

  const user = access.user;
  const empresa = await getEmpresaById(user.empresaId);
  const expired = empresa ? isSubscriptionExpired(empresa) : false;

  return (
    <div className="max-w-md mx-auto text-center py-20">
      <h1 className="text-2xl font-bold mb-2">
        {expired ? "Assinatura vencida" : "Conta aguardando aprovação"}
      </h1>
      <p style={{ color: "var(--ink-soft)" }}>
        {expired ? (
          <>
            O acesso de <strong>{empresa?.name ?? "sua empresa"}</strong> foi pausado porque o período pago venceu.
            Assim que o pagamento for renovado, o acesso volta ao normal.
          </>
        ) : (
          <>
            Sua conta em <strong>{empresa?.name ?? "sua empresa"}</strong> foi criada, mas o acesso só é liberado depois
            da confirmação do pagamento. Assim que aprovarmos, você já pode entrar normalmente — não precisa se
            cadastrar de novo.
          </>
        )}
      </p>
    </div>
  );
}
