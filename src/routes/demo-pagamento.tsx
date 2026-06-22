import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  QrCode,
  CreditCard,
  Banknote,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  CalendarCheck,
  Clock,
  MapPin,
} from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  servico: z.string().default(""),
  horario: z.string().default(""),
  data: z.string().default(""),
  preco: z.string().default("0"),
});

export const Route = createFileRoute("/demo-pagamento")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Pagamento — Dra. Ana Beatriz Santos" }],
  }),
  component: DemoPagamentoPage,
});

type Method = "pix" | "credito" | "debito";

const PAYMENT_METHODS: { id: Method; icon: typeof QrCode; label: string; desc: string }[] = [
  { id: "pix", icon: QrCode, label: "PIX", desc: "Aprovação instantânea" },
  { id: "credito", icon: CreditCard, label: "Cartão de Crédito", desc: "Em até 12x sem juros" },
  { id: "debito", icon: Banknote, label: "Cartão de Débito", desc: "Débito à vista" },
];

function formatPreco(val: string) {
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function DemoPagamentoPage() {
  const { servico, horario, data, preco } = Route.useSearch();
  const navigate = useNavigate();

  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);

  const displayServico = servico || "Sessão de Psicoterapia";
  const displayHorario = horario || "10:00";
  const displayData = data || "23/06/2026";
  const displayPreco = preco || "150";

  function handlePay() {
    if (!selectedMethod) return;
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setSuccess(true);
    }, 1800);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-indigo-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6 text-center">
          {/* Success icon */}
          <div className="flex justify-center">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 grid place-items-center shadow-lg shadow-teal-200">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900">Agendamento confirmado!</h1>
            <p className="text-slate-500">
              Você receberá uma confirmação por e-mail e WhatsApp em instantes.
            </p>
          </div>

          {/* Appointment summary card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-left shadow-sm space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 grid place-items-center text-white font-black text-sm">
                AB
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Dra. Ana Beatriz Santos</p>
                <p className="text-xs text-teal-600">Psicologia Clínica</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2.5 text-slate-700">
                <CalendarCheck className="h-4 w-4 text-teal-600 shrink-0" />
                <span>
                  <span className="font-medium">{displayServico}</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Clock className="h-4 w-4 text-teal-600 shrink-0" />
                <span>
                  {displayData} às {displayHorario}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <MapPin className="h-4 w-4 text-teal-600 shrink-0" />
                <span>Jardins, São Paulo — SP</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between text-sm font-bold text-slate-900">
              <span>Valor pago</span>
              <span className="text-teal-700">{formatPreco(displayPreco)}</span>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-2 space-y-3">
            <p className="text-sm text-slate-600 font-medium">
              Este é o painel que a Dra. Ana Beatriz usa para gerenciar tudo isso:
            </p>
            <button
              onClick={() =>
                void navigate({
                  to: "/demo-dashboard",
                  search: { servico: displayServico, horario: displayHorario, data: displayData },
                })
              }
              className="w-full py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 transition shadow-md flex items-center justify-center gap-2"
            >
              Ver o seu futuro dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="/sign-up"
              className="block text-center text-sm text-slate-500 hover:text-slate-700 transition"
            >
              Quero criar minha conta agora →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <img src="/logo-icon.png" alt="CuidandoVC" className="h-5 w-5 rounded object-contain" />
            <span className="text-xs text-slate-500 font-medium">CuidandoVC</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            Pagamento seguro
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        {/* Resumo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Resumo do agendamento
          </p>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 grid place-items-center text-white font-black text-sm shrink-0">
              AB
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Dra. Ana Beatriz Santos</p>
              <p className="text-xs text-teal-600">Psicologia Clínica · CRP 06/123456</p>
            </div>
          </div>
          <div className="space-y-1.5 text-sm border-t border-slate-100 pt-3">
            <div className="flex justify-between text-slate-600">
              <span>Serviço</span>
              <span className="font-medium">{displayServico}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Data</span>
              <span className="font-medium">{displayData}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Horário</span>
              <span className="font-medium">{displayHorario}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-100">
              <span>Total</span>
              <span className="text-teal-700">{formatPreco(displayPreco)}</span>
            </div>
          </div>
        </div>

        {/* Métodos de pagamento */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-slate-700">Forma de pagamento:</p>
          {PAYMENT_METHODS.map((m) => {
            const sel = selectedMethod === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMethod(m.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  sel
                    ? "border-teal-500 bg-teal-50/60 ring-2 ring-teal-200"
                    : "border-slate-200 hover:border-teal-300"
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${
                    sel ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <m.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{m.label}</p>
                  <p className="text-xs text-slate-500">{m.desc}</p>
                </div>
                {sel && <CheckCircle2 className="h-5 w-5 text-teal-600 ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>

        <button
          disabled={!selectedMethod || paying}
          onClick={handlePay}
          className="w-full py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md flex items-center justify-center gap-2"
        >
          {paying ? (
            <>
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processando...
            </>
          ) : (
            <>
              Confirmar pagamento {selectedMethod ? `· ${formatPreco(displayPreco)}` : ""}
              {!paying && <ArrowRight className="h-4 w-4" />}
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
          Pagamento processado com segurança pelo Mercado Pago
        </div>

        <p className="text-center text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl py-2 px-3">
          Demo: nenhum pagamento real será processado. Escolha qualquer método.
        </p>
      </div>
    </div>
  );
}
