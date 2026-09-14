import AcceptInviteForm from "@/components/AcceptInviteForm";

export default function AceitarConvitePage() {
  return <div className="min-h-[80vh] flex items-center justify-center px-4"><div className="card w-full max-w-md"><h1 className="text-2xl font-bold mb-2">Entre para a equipe</h1><p className="text-sm mb-5" style={{ color: "var(--ink-soft)" }}>Confirme seus dados e crie sua senha de acesso.</p><AcceptInviteForm /></div></div>;
}
