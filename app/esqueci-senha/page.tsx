import PasswordResetRequestForm from "@/components/PasswordResetRequestForm";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">Recuperar senha</h1>
        <PasswordResetRequestForm />
      </div>
    </div>
  );
}
