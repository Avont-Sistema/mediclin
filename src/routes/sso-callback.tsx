import { AuthenticateWithRedirectCallback } from "@clerk/tanstack-start";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

// Rota que completa o handshake do OAuth (Google → Clerk) e redireciona.
// O usuário cai aqui por instantes; mostramos só um spinner com a marca.

export const Route = createFileRoute("/sso-callback")({
  head: () => ({
    meta: [{ title: "Entrando… — CuidandoVC" }],
  }),
  component: SSOCallbackPage,
});

function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-teal-50 via-white to-indigo-50">
      <div className="flex items-center gap-2">
        <img src="/logo-icon.png" alt="CuidandoVC" className="h-8 w-8" />
        <span className="text-lg font-bold tracking-tight text-slate-800">CuidandoVC</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Conectando sua conta…
      </div>
      {/* Componente do Clerk que processa o retorno do OAuth e redireciona */}
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/onboarding"
        signUpForceRedirectUrl="/onboarding"
      />
    </div>
  );
}
