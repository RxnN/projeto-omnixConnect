import PasswordResetForm from "@/components/PasswordResetForm";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">Criar nova senha</h1>
        <PasswordResetForm />
      </div>
    </div>
  );
}
