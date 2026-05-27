import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/tanstack-start";
import {
  LifeBuoy,
  BookOpen,
  MessageCircle,
  Mail,
  ExternalLink,
  User,
  Briefcase,
  CalendarDays,
  Share2,
  Bell,
  LayoutDashboard,
  Link as LinkIcon,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { buildPublicUrl } from "../lib/subdomain";
import { fetchCurrentProfessional } from "../lib/auth";

export const Route = createFileRoute("/suporte")({
  head: () => ({ meta: [{ title: "Suporte — MediClin" }] }),
  loader: () => fetchCurrentProfessional(),
  component: SuportePage,
});

// ─── Conteúdo ─────────────────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    icon: User,
    color: "bg-teal-100 text-teal-700",
    title: "Configure seu Perfil",
    desc: "Preencha nome, especialidade, CRM, foto e bio. Defina também o seu slug — ele vira o endereço público da sua página.",
    tip: "Configurações → Aba Perfil",
  },
  {
    icon: Briefcase,
    color: "bg-violet-100 text-violet-700",
    title: "Cadastre seus Serviços",
    desc: "Adicione as consultas que você oferece com nome, preço e duração. Você pode ativar ou desativar serviços a qualquer momento.",
    tip: "Configurações → Aba Perfil → Serviços",
  },
  {
    icon: CalendarDays,
    color: "bg-sky-100 text-sky-700",
    title: "Configure sua Disponibilidade",
    desc: "Na Agenda, defina os dias da semana e horários em que você atende. Os pacientes só vão enxergar os slots que você liberar.",
    tip: "Menu → Agenda → Disponibilidade",
  },
  {
    icon: Share2,
    color: "bg-amber-100 text-amber-700",
    title: "Compartilhe seu Link",
    desc: "Coloque seu link público na bio do Instagram ou envie pelo WhatsApp. Os pacientes acessam, escolhem serviço, horário e pagam — tudo no celular.",
    tip: "Configurações → Ver perfil público",
  },
  {
    icon: Bell,
    color: "bg-rose-100 text-rose-700",
    title: "Acompanhe os Agendamentos",
    desc: "No Dashboard você vê os agendamentos do dia e as métricas do mês. Na Agenda você gerencia, confirma e cancela consultas.",
    tip: "Menu → Dashboard / Agenda",
  },
];

const FAQ = [
  {
    q: "Como o paciente paga a consulta?",
    a: "O paciente paga diretamente pela sua página pública via Mercado Pago. O valor cai na sua conta automaticamente, com desconto da taxa da plataforma.",
  },
  {
    q: "Preciso criar uma conta separada para o Mercado Pago?",
    a: "Sim. No Dashboard, clique em 'Conectar Mercado Pago' e siga o onboarding. Você só precisa fazer isso uma vez.",
  },
  {
    q: "Posso ter mais de um profissional na mesma conta?",
    a: "Sim, com o plano Clínica. Cada profissional ganha página, agenda e serviços independentes, tudo gerenciado por uma única conta.",
  },
  {
    q: "Como o paciente recebe a confirmação?",
    a: "Assim que o agendamento é criado, o paciente recebe um e-mail de confirmação com os dados da consulta.",
  },
  {
    q: "Posso bloquear dias de folga?",
    a: "Sim. Na Agenda, clique no botão 'Modo Folga' para bloquear dias específicos com uma mensagem personalizada para os pacientes.",
  },
  {
    q: "O MediClin funciona no celular?",
    a: "Sim. Tanto o painel do médico quanto a página pública do paciente são totalmente responsivos e otimizados para mobile.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

function SuportePage() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <SuporteContent />
      </SignedIn>
    </>
  );
}

function SuporteContent() {
  const professional = Route.useLoaderData();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const slug = professional?.slug ?? "";
  const publicUrl = buildPublicUrl(slug);

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      {/* Topbar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="px-6 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-100 grid place-items-center">
            <LifeBuoy className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Suporte</h1>
            <p className="text-xs text-slate-500">Tutorial, perguntas frequentes e contato</p>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-3xl space-y-6">

        {/* ── Seu link público ── */}
        {slug && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
            <div className="flex items-center gap-2 mb-1">
              <LinkIcon className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-teal-900">Seu link público</h3>
            </div>
            <p className="text-xs text-teal-700 mb-3">
              Este é o link que você coloca na bio do Instagram para seus pacientes agendarem.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="flex-1 min-w-0 truncate rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs text-teal-800 font-mono">
                {publicUrl}
              </code>
              <button
                onClick={copyLink}
                className="shrink-0 flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
                {copied ? "Copiado!" : "Copiar"}
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-teal-200 bg-white hover:bg-teal-50 px-3 py-2 text-xs font-medium text-teal-700 transition"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir
              </a>
            </div>
          </div>
        )}

        {/* ── Tutorial ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-5">
            <BookOpen className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-800">Como usar o MediClin</h3>
          </div>
          <ol className="space-y-0">
            {TUTORIAL_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isLast = i === TUTORIAL_STEPS.length - 1;
              return (
                <li key={i} className="flex gap-4">
                  {/* Connector */}
                  <div className="flex flex-col items-center">
                    <div className={`h-9 w-9 shrink-0 rounded-xl grid place-items-center ${step.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-slate-100 my-1" />}
                  </div>
                  {/* Content */}
                  <div className={`flex-1 ${isLast ? "pb-0" : "pb-5"}`}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold text-slate-400">0{i + 1}</span>
                      <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.desc}</p>
                    <span className="inline-block mt-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      {step.tip}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* ── FAQ ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <LayoutDashboard className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-800">Perguntas frequentes</h3>
          </div>
          <div className="space-y-1">
            {FAQ.map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-100 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
                >
                  <span className="text-sm font-medium text-slate-800">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-3 pt-2 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/60">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Contato ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-1">
            <LifeBuoy className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-800">Fale com a equipe</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Respondemos em até 24h em dias úteis. Prefira o WhatsApp para respostas mais rápidas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="https://wa.me/5511999999999?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20MediClin"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-4 py-3.5 transition group"
            >
              <div className="h-9 w-9 shrink-0 rounded-xl bg-emerald-500 grid place-items-center">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900">WhatsApp</p>
                <p className="text-xs text-emerald-700">Suporte via mensagem</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-emerald-500 ml-auto opacity-0 group-hover:opacity-100 transition" />
            </a>
            <a
              href="mailto:suporte@cuidandovc.com.br"
              className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 px-4 py-3.5 transition group"
            >
              <div className="h-9 w-9 shrink-0 rounded-xl bg-sky-500 grid place-items-center">
                <Mail className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-sky-900">E-mail</p>
                <p className="text-xs text-sky-700">suporte@cuidandovc.com.br</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-sky-500 ml-auto opacity-0 group-hover:opacity-100 transition" />
            </a>
          </div>
          <p className="mt-5 text-center text-[11px] text-slate-400">
            MediClin · versão 1.0 · Desenvolvido por{" "}
            <a
              href="https://avontsistemas.com.br"
              target="_blank"
              rel="noreferrer"
              className="text-teal-600 hover:underline"
            >
              Avont Sistemas
            </a>
          </p>
        </div>

      </div>
    </DashboardLayout>
  );
}
