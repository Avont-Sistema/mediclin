import { ChevronLeft, Lock, ShieldCheck, Loader2, ChevronRight } from "lucide-react";
import { METODOS_PAGAMENTO, type MetodoPagamento } from "../lib/payment-methods";

// ─── Tela de seleção de método de pagamento (página pública) ──────────────────
// Mostra os métodos liberados (interseção plano ∩ médico) com selo de confiança
// do Mercado Pago. Online → redireciona pro checkout do MP; dinheiro → presencial.

interface Props {
  professionalNome: string;
  serviceNome: string;
  valor: number;
  dataLabel: string;
  metodos: string[];
  onlinePending: boolean;
  cashPending: boolean;
  onPickOnline: (metodo: "credito" | "debito" | "pix") => void;
  onPickCash: () => void;
  onBack: () => void;
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MercadoPagoBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[#009ee3] px-2 py-0.5 text-[11px] font-bold text-white">
      Mercado&nbsp;Pago
    </span>
  );
}

export function PaymentMethodScreen({
  professionalNome,
  serviceNome,
  valor,
  dataLabel,
  metodos,
  onlinePending,
  cashPending,
  onPickOnline,
  onPickCash,
  onBack,
}: Props) {
  const disponiveis = METODOS_PAGAMENTO.filter((m) => metodos.includes(m.value));
  const pending = onlinePending || cashPending;

  return (
    <div className="mx-auto max-w-md px-4">
      <button
        onClick={onBack}
        disabled={pending}
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Resumo do pedido */}
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Resumo do agendamento
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{serviceNome}</p>
          <p className="text-xs text-slate-500">
            com {professionalNome} · {dataLabel}
          </p>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Total</span>
            <span className="text-2xl font-bold text-slate-900">{brl(valor)}</span>
          </div>
        </div>

        {/* Métodos */}
        <div className="p-4">
          <p className="mb-2 text-sm font-semibold text-slate-700">Como você quer pagar?</p>
          <div className="space-y-2">
            {disponiveis.map((m) => {
              const isCash = !m.online;
              const thisPending = isCash ? cashPending : onlinePending;
              return (
                <button
                  key={m.value}
                  disabled={pending}
                  onClick={() =>
                    isCash ? onPickCash() : onPickOnline(m.value as "credito" | "debito" | "pix")
                  }
                  className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left transition hover:border-teal-400 hover:bg-teal-50/40 disabled:opacity-50"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-700">
                    <m.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{m.label}</p>
                    <p className="text-xs text-slate-500">
                      {isCash ? "Pague no consultório" : "Pagamento online seguro"}
                    </p>
                  </div>
                  {thisPending ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-teal-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selo de confiança Mercado Pago */}
        <div className="flex flex-col items-center gap-1.5 border-t border-slate-100 bg-slate-50 px-5 py-4 text-center">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <ShieldCheck className="h-4 w-4 text-[#009ee3]" />
            Pagamento processado com segurança pelo <MercadoPagoBadge />
          </div>
          <p className="flex items-center gap-1 text-[11px] text-slate-400">
            <Lock className="h-3 w-3" />
            Seus dados de pagamento nunca passam pelo CuidandoVC
          </p>
        </div>
      </div>
    </div>
  );
}

export type { MetodoPagamento };
