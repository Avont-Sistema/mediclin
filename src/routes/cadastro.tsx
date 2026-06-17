import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { UserPlus, ArrowRight, Heart, Shield, Zap, Loader2 } from "lucide-react";
import { resolveAffiliateCode, trackAffiliateClick, type AffiliateCodeInfo } from "../lib/affiliates";

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Crie sua conta — CuidandoVC" }] }),
  component: CadastroPage,
  validateSearch: z.object({ ref: z.string().optional() }),
});

const BENEFICIOS = [
  { icon: Zap, text: "Agenda online 24h com pagamento na hora" },
  { icon: Heart, text: "Link da bio do Instagram direto para o agendamento" },
  { icon: Shield, text: "Sem taxas escondidas — apenas split no pagamento" },
];

function CadastroPage() {
  const { ref } = Route.useSearch();
  const navigate = useNavigate();
  const [codeInfo, setCodeInfo] = useState<AffiliateCodeInfo | null>(null);
  const [loading, setLoading] = useState(!!ref);

  useEffect(() => {
    if (!ref) return;

    (async () => {
      try {
        // Registra o clique e valida o código
        const [info] = await Promise.all([
          resolveAffiliateCode({ data: { codigo: ref } }),
          trackAffiliateClick({ data: { codigo: ref } }),
        ]);
        setCodeInfo(info);

        // Persiste para ser consumido no onboarding
        if (info) localStorage.setItem("affiliate_ref", ref.toUpperCase());
      } catch {
        // código inválido — sem problema, fluxo segue normal
      } finally {
        setLoading(false);
      }
    })();
  }, [ref]);

  function handleCTA() {
    navigate({ to: "/onboarding" });
  }

  const beneficioCodigo = (() => {
    if (!codeInfo) return null;
    const parts: string[] = [];
    if (codeInfo.tipoDesconto === "percentual" && codeInfo.valorDesconto)
      parts.push(`${codeInfo.valorDesconto}% de desconto`);
    else if (codeInfo.tipoDesconto === "valor_fixo" && codeInfo.valorDesconto)
      parts.push(`R$ ${codeInfo.valorDesconto} de desconto`);
    if (codeInfo.diasFree > 0) parts.push(`${codeInfo.diasFree} dias gratuitos extras`);
    return parts.join(" + ") || null;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-slate-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <img src="/logo-icon.png" alt="CuidandoVC" className="size-10 rounded-xl object-contain shadow" />
        <span className="text-2xl font-bold tracking-tight text-slate-800">CuidandoVC</span>
      </div>

      <div className="w-full max-w-md">
        {/* Banner do afiliado */}
        {loading ? (
          <div className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-teal-50 border border-teal-100 px-4 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
            <span className="text-sm text-teal-700">Verificando convite…</span>
          </div>
        ) : codeInfo ? (
          <div className="mb-6 rounded-xl bg-teal-50 border border-teal-200 px-4 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 mb-0.5">
              Convite de
            </p>
            <p className="text-base font-bold text-teal-800">{codeInfo.nome}</p>
            {beneficioCodigo && (
              <p className="mt-1 text-sm text-teal-700">
                🎁 {beneficioCodigo}
              </p>
            )}
          </div>
        ) : ref ? (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-center">
            <p className="text-sm text-amber-700">Código de convite inválido ou expirado.</p>
          </div>
        ) : null}

        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">
            Leve sua clínica para o digital
          </h1>
          <p className="mt-3 text-slate-500 leading-relaxed">
            Médicos e dentistas que usam o CuidandoVC recebem agendamentos e pagamentos direto pelo
            link da bio do Instagram — sem WhatsApp, sem planilha.
          </p>
        </div>

        {/* Benefícios */}
        <ul className="mb-8 space-y-3">
          {BENEFICIOS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-slate-700">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-100">
                <Icon className="h-4 w-4 text-teal-600" />
              </span>
              {text}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={handleCTA}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-teal-200 transition hover:bg-teal-500 active:scale-[0.98]"
        >
          <UserPlus className="h-5 w-5" />
          Criar minha conta grátis
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="mt-4 text-center text-xs text-slate-400">
          Já tem conta?{" "}
          <Link to="/sign-in" className="text-teal-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
