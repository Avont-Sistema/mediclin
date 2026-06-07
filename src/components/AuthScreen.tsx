import { useState, useEffect } from "react";
import { useSignIn, useAuth } from "@clerk/tanstack-start";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck, CalendarCheck, Wallet } from "lucide-react";

// ─── Tela de login/cadastro personalizada (CuidandoVC) ────────────────────────
// Não mostra a UI do Clerk: dispara o OAuth do Google direto via useSignIn.
// O cliente vê só a nossa marca; o Clerk/Google entram em cena depois do clique.
// O mesmo botão serve para login E cadastro: o Clerk reconhece a conta existente
// ou cria uma nova automaticamente (transfer no /sso-callback).

interface Props {
  mode?: "sign-in" | "sign-up";
}

// Extrai a mensagem real de um erro do Clerk (em vez de uma genérica).
function clerkErrorMessage(err: unknown): string {
  const e = err as { errors?: { longMessage?: string; message?: string }[]; message?: string };
  const first = e?.errors?.[0];
  return (
    first?.longMessage ||
    first?.message ||
    e?.message ||
    "Não foi possível conectar com o Google. Tente novamente."
  );
}

// Logo "G" oficial do Google (multicolor)
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export function AuthScreen({ mode = "sign-in" }: Props) {
  const { isLoaded, signIn } = useSignIn();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === "sign-up";

  // Se já existe uma sessão ativa, não tenta autenticar de novo (isso lançava
  // erro "already signed in") — leva direto para o app.
  useEffect(() => {
    if (isSignedIn) void navigate({ to: "/onboarding" });
  }, [isSignedIn, navigate]);

  async function handleGoogle() {
    if (!isLoaded || !signIn || loading) return;
    setError(null);
    setLoading(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${origin}/sso-callback`,
        redirectUrlComplete: `${origin}/onboarding`,
      });
    } catch (err) {
      setError(clerkErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-teal-50 via-white to-indigo-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60">
        {/* Marca */}
        <div className="flex items-center justify-center gap-2">
          <img src="/logo-icon.png" alt="CuidandoVC" className="h-9 w-9" />
          <span className="text-xl font-bold tracking-tight text-slate-800">CuidandoVC</span>
        </div>

        {/* Título */}
        <div className="mt-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            {isSignUp ? "Crie sua conta" : "Acesse sua conta"}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Gerencie sua agenda, pacientes e pagamentos — tudo num só lugar.
          </p>
        </div>

        {/* Botão Google */}
        <button
          onClick={handleGoogle}
          disabled={loading || !isLoaded}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> Conectando...
            </>
          ) : (
            <>
              <GoogleIcon /> {isSignUp ? "Cadastrar com Google" : "Entrar com Google"}
            </>
          )}
        </button>

        {error && <p className="mt-3 text-center text-sm text-rose-600">{error}</p>}

        {/* Benefícios rápidos */}
        <div className="mt-7 grid grid-cols-3 gap-2 border-t border-slate-100 pt-5 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <CalendarCheck className="h-5 w-5 text-teal-600" />
            <span className="text-[11px] leading-tight text-slate-500">Agenda online</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Wallet className="h-5 w-5 text-teal-600" />
            <span className="text-[11px] leading-tight text-slate-500">Pagamentos integrados</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <ShieldCheck className="h-5 w-5 text-teal-600" />
            <span className="text-[11px] leading-tight text-slate-500">Dados seguros</span>
          </div>
        </div>
      </div>

      <p className="mt-6 max-w-xs text-center text-xs text-slate-400">
        Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade do CuidandoVC.
      </p>
    </div>
  );
}
