import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Lock, Crown } from "lucide-react";
import { fetchMyAccess, type AccessLevel } from "../lib/access";

// ─── Acesso do médico (hook) ──────────────────────────────────────────────────
// Enquanto carrega, assume "active" para não piscar bloqueio em quem tem acesso.

export function useAccessLevel(): AccessLevel {
  const { data } = useQuery({
    queryKey: ["myAccess"],
    queryFn: () => fetchMyAccess(),
    staleTime: 60_000,
  });
  return data?.level ?? "active";
}

export function useIsFree(): boolean {
  return useAccessLevel() === "free";
}

// ─── ProLock ──────────────────────────────────────────────────────────────────
// Quando `locked`, mantém o conteúdo visível (desfocado/inerte) e sobrepõe um
// aviso "Assine o plano PRO para acessar" com CTA. Não remove a UI — só bloqueia.

export function ProLock({
  locked,
  children,
  message,
  title = "Recurso do plano PRO",
}: {
  locked: boolean;
  children: React.ReactNode;
  message?: string;
  title?: string;
}) {
  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[2px]">{children}</div>
      {/* Overlay bloqueia interação; o card fica sticky para continuar visível */}
      <div className="absolute inset-0 z-10 px-4">
        <div className="sticky top-24 mx-auto mt-10 w-full max-w-sm rounded-2xl border border-amber-200 bg-white/95 p-6 text-center shadow-xl backdrop-blur">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-amber-100">
            <Lock className="h-6 w-6 text-amber-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="mt-1.5 text-sm text-slate-500">
            {message ?? "Assine o plano PRO para acessar este recurso."}
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-teal-700 hover:to-indigo-700"
          >
            <Crown className="h-4 w-4" /> Assinar plano PRO
          </Link>
        </div>
      </div>
    </div>
  );
}
