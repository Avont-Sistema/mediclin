import { useEffect } from "react";
import { X, Crown, Check, ShieldCheck, Loader2 } from "lucide-react";
import type { PublicPlan } from "../lib/plans";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  plan: PublicPlan | null;
  pending: boolean;
  onConfirm: (planId: string) => void;
  onClose: () => void;
}

// Benefícios padrão — usados quando o plano ainda não tem "Recursos" preenchidos
// no admin, pra que o modal nunca fique vazio/feio.
const DEFAULT_PLAN_BENEFITS = [
  "Agendamentos online ilimitados",
  "Página pública personalizada para sua bio",
  "Pagamentos online via Mercado Pago",
  "Lembretes automáticos para os pacientes",
  "Painel completo de métricas e faturamento",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPlanPrice(precoMensal: string): string {
  return Number(precoMensal).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// ─── PlanCheckoutModal ────────────────────────────────────────────────────────

export function PlanCheckoutModal({ open, plan, pending, onConfirm, onClose }: Props) {
  // Fecha no Escape (mesmo padrão do NovoAgendamentoModal)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !plan) return null;

  const benefits = plan.recursos.length > 0 ? plan.recursos : DEFAULT_PLAN_BENEFITS;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header com destaque */}
          <div className="relative bg-gradient-to-br from-teal-600 to-indigo-600 px-6 pt-6 pb-7 text-white">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 h-8 w-8 grid place-items-center rounded-lg hover:bg-white/15 transition text-white/80"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
              <Crown className="h-3.5 w-3.5" /> Assinatura
            </div>
            <h2 className="mt-3 text-xl font-bold">{plan.nome}</h2>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold">{formatPlanPrice(plan.precoMensal)}</span>
              <span className="text-sm text-white/80">/mês</span>
            </div>
            {plan.descricao && <p className="mt-1.5 text-sm text-white/85">{plan.descricao}</p>}
          </div>

          {/* Corpo */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              O que está incluso
            </p>
            <ul className="mt-3 space-y-2.5">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100">
                    <Check className="h-3 w-3 text-emerald-600" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            {/* Selos de confiança */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-teal-600" /> Cancele quando quiser
              </span>
              {plan.trialDias > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-600" /> {plan.trialDias} dias grátis
                </span>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <div className="flex items-center gap-2 border-t border-slate-100 px-6 py-4">
            <button
              onClick={onClose}
              disabled={pending}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-100 transition disabled:opacity-60"
            >
              Agora não
            </button>
            <button
              onClick={() => onConfirm(plan.id)}
              disabled={pending}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 transition shadow-sm disabled:opacity-60"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Aguarde...
                </>
              ) : (
                "Continuar para pagamento"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
