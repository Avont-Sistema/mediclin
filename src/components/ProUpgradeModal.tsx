import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, Crown, Loader2 } from "lucide-react";
import { fetchActivePlans, type PublicPlan } from "../lib/plans";
import { createMPSubscriptionCheckout } from "../lib/mp-subscription";
import { PlanCheckoutModal } from "./PlanCheckoutModal";

// ─── Modal de assinatura (reutilizável) ───────────────────────────────────────
// Abre a partir de qualquer botão "Assinar plano PRO". Busca os planos pagos,
// deixa escolher (se houver mais de um) e abre o PlanCheckoutModal para concluir
// o checkout via Mercado Pago.

function formatPlanPrice(precoMensal: string): string {
  return Number(precoMensal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProUpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: plans = [] } = useQuery({
    queryKey: ["activePlans"],
    queryFn: () => fetchActivePlans(),
    enabled: open,
  });
  const paid = useMemo(() => plans.filter((p) => Number(p.precoMensal) > 0), [plans]);

  const [selected, setSelected] = useState<PublicPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkout = useMutation({
    mutationFn: (planId: string) => createMPSubscriptionCheckout({ data: { planId } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Erro ao iniciar o checkout."),
  });

  // Se só há um plano pago, já abre o checkout dele direto.
  useEffect(() => {
    if (open && !selected && paid.length === 1) setSelected(paid[0]);
  }, [open, paid, selected]);

  // Limpa o estado ao fechar.
  useEffect(() => {
    if (!open) {
      setSelected(null);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  // Checkout de um plano específico (PlanCheckoutModal já mostra benefícios).
  if (selected) {
    return (
      <PlanCheckoutModal
        open
        plan={selected}
        pending={checkout.isPending}
        error={error}
        onConfirm={(id) => {
          setError(null);
          checkout.mutate(id);
        }}
        onClose={() => {
          // Volta para a escolha quando há vários planos; senão fecha tudo.
          if (paid.length > 1) setSelected(null);
          else onClose();
        }}
      />
    );
  }

  // Seleção de plano (quando há mais de um plano pago).
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative bg-gradient-to-br from-teal-600 to-indigo-600 px-6 py-6 text-white">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-white/80 transition hover:bg-white/15"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
              <Crown className="h-3.5 w-3.5" /> Escolha seu plano
            </div>
            <h2 className="mt-3 text-xl font-bold">Assine o CuidandoVC</h2>
            <p className="mt-1 text-sm text-white/85">
              Desbloqueie agenda, pagamentos e todos os recursos.
            </p>
          </div>

          <div className="space-y-2 p-5">
            {paid.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Nenhum plano disponível no momento.
              </p>
            ) : (
              paid.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3.5 text-left transition hover:border-teal-400 hover:bg-teal-50/40"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">{p.nome}</p>
                    {p.descricao && <p className="text-xs text-slate-500">{p.descricao}</p>}
                  </div>
                  <span className="text-sm font-black text-slate-900">
                    {formatPlanPrice(p.precoMensal)}
                    <span className="text-xs font-normal text-slate-400">/mês</span>
                  </span>
                </button>
              ))
            )}
            {checkout.isPending && (
              <p className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Abrindo checkout…
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
