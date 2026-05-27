import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/tanstack-start";
import {
  LifeBuoy,
  BookOpen,
  MessageCircle,
  Mail,
  ExternalLink,
  Link as LinkIcon,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Settings,
  CalendarDays,
  LayoutDashboard,
  Stethoscope,
  Clock,
  Share2,
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { buildPublicUrl } from "../lib/subdomain";
import { fetchCurrentProfessional } from "../lib/auth";

export const Route = createFileRoute("/suporte")({
  head: () => ({ meta: [{ title: "Suporte — MediClin" }] }),
  loader: () => fetchCurrentProfessional(),
  component: SuportePage,
});

// ─── Tutorial phases ──────────────────────────────────────────────────────────

const TUTORIAL_PHASES = [
  {
    id: "perfil",
    num: "01",
    title: "Configure seu Perfil",
    desc: "Preencha nome, especialidade, CRM, foto e bio. Defina também o seu slug — ele vira o endereço público da sua página.",
    tip: "Configurações → Aba Perfil",
    badge: "bg-teal-100 text-teal-700",
    dot: "bg-teal-500",
  },
  {
    id: "servicos",
    num: "02",
    title: "Cadastre seus Serviços",
    desc: "Adicione as consultas que você oferece com nome, preço e duração. Você pode ativar ou desativar serviços a qualquer momento.",
    tip: "Configurações → Aba Perfil → Serviços",
    badge: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500",
  },
  {
    id: "agenda",
    num: "03",
    title: "Configure sua Disponibilidade",
    desc: "Na Agenda, defina os dias da semana e horários em que você atende. Os pacientes só vão enxergar os slots que você liberar.",
    tip: "Menu → Agenda → Disponibilidade",
    badge: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500",
  },
  {
    id: "link",
    num: "04",
    title: "Compartilhe seu Link",
    desc: "Coloque seu link público na bio do Instagram ou envie pelo WhatsApp. Os pacientes acessam, escolhem serviço, horário e pagam.",
    tip: "Configurações → Ver perfil público",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  {
    id: "agendamento",
    num: "05",
    title: "Acompanhe os Agendamentos",
    desc: "No Dashboard você vê os agendamentos do dia e as métricas do mês. Na Agenda você gerencia, confirma e cancela consultas.",
    tip: "Menu → Dashboard / Agenda",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
  },
] as const;

// ─── FAQ ──────────────────────────────────────────────────────────────────────

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

        {/* ── Tutorial animado ── */}
        <PhoneTutorial />

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
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
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

// ─── Animated phone tutorial ──────────────────────────────────────────────────

function PhoneTutorial() {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(true);

  const phase = TUTORIAL_PHASES[idx];

  // Auto-advance every 3.5 s
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % TUTORIAL_PHASES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [playing]);

  // Quick fade-out → fade-in on every phase change
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 180);
    return () => clearTimeout(t);
  }, [idx]);

  const goPrev = () => {
    setPlaying(false);
    setIdx((i) => (i - 1 + TUTORIAL_PHASES.length) % TUTORIAL_PHASES.length);
  };

  const goNext = () => {
    setPlaying(false);
    setIdx((i) => (i + 1) % TUTORIAL_PHASES.length);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-5">
        <BookOpen className="h-4 w-4 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-800">Como usar o MediClin</h3>
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-7">
        {/* ── Phone mockup ──────────────────────────────────────────────── */}
        <div className="shrink-0 mx-auto sm:mx-0">
          <div className="relative w-[220px]">
            {/* Shell */}
            <div className="relative rounded-[2rem] border-[8px] border-slate-800 bg-slate-800 shadow-2xl overflow-hidden">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-5 bg-slate-800 rounded-b-2xl z-10" />

              {/* Screen */}
              <div className="relative h-[400px] overflow-hidden">
                <div
                  className="absolute inset-0 overflow-y-auto bg-slate-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-6 transition-opacity duration-200"
                  style={{ opacity: visible ? 1 : 0 }}
                >
                  {phase.id === "perfil" && <PerfilPhoneScreen />}
                  {phase.id === "servicos" && <ServicosPhoneScreen />}
                  {phase.id === "agenda" && <AgendaPhoneScreen />}
                  {phase.id === "link" && <LinkPhoneScreen />}
                  {phase.id === "agendamento" && <AgendamentoPhoneScreen />}
                </div>
              </div>

              {/* Home indicator */}
              <div className="bg-slate-800 flex justify-center py-1.5">
                <div className="w-12 h-0.5 bg-white/30 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Step info ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Phase badge */}
          <div
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold mb-3 w-fit ${phase.badge}`}
          >
            {phase.num} / {TUTORIAL_PHASES.length}
          </div>

          {/* Title + description + tip — fade with phone screen */}
          <div className="transition-opacity duration-200" style={{ opacity: visible ? 1 : 0 }}>
            <h4 className="text-base font-bold text-slate-900 mb-2 leading-snug">{phase.title}</h4>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">{phase.desc}</p>
            <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
              {phase.tip}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 mt-8">
            {/* Prev */}
            <button
              onClick={goPrev}
              aria-label="Passo anterior"
              className="size-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-500 transition shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-1.5 flex-1">
              {TUTORIAL_PHASES.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPlaying(false);
                    setIdx(i);
                  }}
                  aria-label={p.title}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === idx ? `w-6 ${p.dot}` : "w-2 bg-slate-200 hover:bg-slate-300"
                  }`}
                />
              ))}
            </div>

            {/* Next */}
            <button
              onClick={goNext}
              aria-label="Próximo passo"
              className="size-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-500 transition shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Play / Pause */}
            <button
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pausar" : "Reproduzir"}
              className="size-8 rounded-full bg-teal-600 hover:bg-teal-700 flex items-center justify-center text-white transition shrink-0"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Individual phone screens ─────────────────────────────────────────────────

function PerfilPhoneScreen() {
  return (
    <div className="px-2.5 pb-4">
      <div className="flex items-center gap-1.5 mb-3 px-0.5">
        <Settings className="h-3 w-3 text-slate-400" />
        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
          Configurações · Perfil
        </span>
      </div>

      {/* Avatar */}
      <div className="flex justify-center mb-3">
        <div className="size-14 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center shadow-md">
          <span className="text-sm font-black text-white">DR</span>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-2">
        <div>
          <p className="text-[8px] text-slate-400 mb-0.5 font-medium">Nome completo</p>
          <div className="rounded-lg border border-teal-300 bg-white px-2 py-1.5 text-[9px] text-slate-800 font-semibold ring-2 ring-teal-100">
            Dr. João Silva
          </div>
        </div>
        <div>
          <p className="text-[8px] text-slate-400 mb-0.5 font-medium">Especialidade</p>
          <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] text-slate-600">
            Cardiologia
          </div>
        </div>
        <div>
          <p className="text-[8px] text-slate-400 mb-0.5 font-medium">Seu link (slug)</p>
          <div className="rounded-lg border border-slate-200 bg-teal-50 px-2 py-1.5 flex items-center gap-1.5">
            <LinkIcon className="h-2.5 w-2.5 text-teal-500 shrink-0" />
            <span className="text-[9px] text-teal-700 font-mono font-bold">dr-joao</span>
          </div>
        </div>
      </div>

      <button className="mt-3 w-full rounded-xl bg-teal-600 py-2 text-[9px] font-bold text-white">
        Salvar perfil ✓
      </button>
    </div>
  );
}

function ServicosPhoneScreen() {
  return (
    <div className="px-2.5 pb-4">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-1.5">
          <Stethoscope className="h-3 w-3 text-slate-400" />
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
            Serviços
          </span>
        </div>
        <div className="rounded-lg bg-teal-50 border border-teal-200 px-1.5 py-0.5 text-[8px] font-bold text-teal-700">
          + Novo
        </div>
      </div>

      {[
        { nome: "Consulta Inicial", preco: "R$ 300", min: "60 min" },
        { nome: "Retorno", preco: "R$ 150", min: "30 min" },
        { nome: "Avaliação Online", preco: "R$ 200", min: "45 min" },
      ].map((s, i) => (
        <div
          key={i}
          className="mb-2 rounded-xl border border-slate-100 bg-white px-2.5 py-2 flex items-center gap-2 shadow-sm"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-slate-900 truncate">{s.nome}</p>
            <p className="text-[8px] text-slate-400 mt-0.5">
              {s.preco} · {s.min}
            </p>
          </div>
          {/* Toggle ON */}
          <div className="relative inline-flex h-3.5 w-6 items-center rounded-full bg-teal-500 shrink-0">
            <span className="inline-block h-2.5 w-2.5 translate-x-3 rounded-full bg-white shadow" />
          </div>
        </div>
      ))}

      <p className="text-[8px] text-slate-400 text-center mt-2">
        Pacientes escolhem o serviço para agendar
      </p>
    </div>
  );
}

function AgendaPhoneScreen() {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const active = [true, true, true, true, true, false, false];

  return (
    <div className="px-2.5 pb-4">
      <div className="flex items-center gap-1.5 mb-3 px-0.5">
        <CalendarDays className="h-3 w-3 text-slate-400" />
        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
          Disponibilidade
        </span>
      </div>

      {/* Days */}
      <div className="mb-3">
        <p className="text-[8px] text-slate-400 mb-1.5 font-medium">Dias de atendimento</p>
        <div className="flex flex-wrap gap-1">
          {days.map((d, i) => (
            <div
              key={d}
              className={`rounded-lg px-1.5 py-1 text-[8px] font-bold ${
                active[i] ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-400"
              }`}
            >
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* Time range */}
      <div className="mb-3">
        <p className="text-[8px] text-slate-400 mb-1.5 font-medium">Horário de atendimento</p>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-teal-300 bg-white px-2.5 py-1.5 text-[9px] font-black text-slate-800 shadow-sm">
            08:00
          </div>
          <div className="flex-1 h-0.5 bg-teal-200 rounded" />
          <div className="rounded-lg border border-teal-300 bg-white px-2.5 py-1.5 text-[9px] font-black text-slate-800 shadow-sm">
            18:00
          </div>
        </div>
      </div>

      {/* Interval chip */}
      <div className="rounded-xl bg-sky-50 border border-sky-100 px-2.5 py-2 flex items-center gap-1.5 mb-3">
        <Clock className="h-2.5 w-2.5 text-sky-500 shrink-0" />
        <p className="text-[8px] text-sky-700 font-semibold">Intervalo: 30 min por consulta</p>
      </div>

      <button className="w-full rounded-xl bg-teal-600 py-2 text-[9px] font-bold text-white">
        Salvar disponibilidade
      </button>
    </div>
  );
}

function LinkPhoneScreen() {
  return (
    <div className="px-2.5 pb-4">
      <div className="flex items-center gap-1.5 mb-3 px-0.5">
        <Share2 className="h-3 w-3 text-slate-400" />
        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
          Link público
        </span>
      </div>

      {/* Link box */}
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-2.5 mb-3">
        <p className="text-[8px] text-teal-600 font-medium mb-1.5">Seu link de agendamento:</p>
        <div className="flex items-center gap-1.5">
          <code className="flex-1 text-[8px] font-mono text-teal-800 truncate font-bold">
            mediclin.com/dr-joao
          </code>
          <div className="shrink-0 rounded-md bg-teal-600 px-1.5 py-0.5 text-[8px] text-white font-bold">
            Copiar
          </div>
        </div>
      </div>

      {/* Instagram bio mockup */}
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <p className="text-[7px] text-slate-400 font-semibold mb-2 uppercase tracking-wide">
          Exemplo: Bio do Instagram
        </p>
        <div className="flex items-center gap-1.5 mb-2">
          {/* Instagram-style avatar ring */}
          <div className="size-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-400 p-0.5 shrink-0">
            <div className="size-full rounded-full bg-white flex items-center justify-center">
              <span className="text-[7px] font-black text-pink-600">DR</span>
            </div>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-900">@drjoaosilva</p>
            <p className="text-[7px] text-slate-500">Cardiologista · São Paulo</p>
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5 flex items-center gap-1">
          <LinkIcon className="h-2.5 w-2.5 text-blue-500 shrink-0" />
          <span className="text-[8px] text-blue-600 font-semibold">mediclin.com/dr-joao</span>
        </div>
        <p className="text-[7px] text-slate-400 mt-1.5 text-center">
          👆 pacientes clicam para agendar
        </p>
      </div>
    </div>
  );
}

function AgendamentoPhoneScreen() {
  return (
    <div className="px-2.5 pb-4">
      <div className="flex items-center gap-1.5 mb-3 px-0.5">
        <LayoutDashboard className="h-3 w-3 text-slate-400" />
        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
          Dashboard · Hoje
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <div className="rounded-xl bg-teal-50 border border-teal-100 p-2 text-center shadow-sm">
          <p className="text-xl font-black text-teal-700 leading-none">3</p>
          <p className="text-[7px] text-teal-600 mt-0.5">consultas hoje</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2 text-center shadow-sm">
          <p className="text-sm font-black text-slate-800 leading-none">R$750</p>
          <p className="text-[7px] text-slate-500 mt-0.5">este mês</p>
        </div>
      </div>

      {/* Appointment list */}
      <p className="text-[8px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
        Próximas consultas
      </p>
      {[
        { time: "14:00", service: "Consulta Inicial", patient: "Maria Rodrigues" },
        { time: "15:30", service: "Retorno", patient: "Carlos Souza" },
        { time: "16:00", service: "Avaliação Online", patient: "Ana Pereira" },
      ].map((a, i) => (
        <div
          key={i}
          className="mb-1.5 rounded-xl border border-slate-100 bg-white px-2 py-1.5 flex items-center gap-2 shadow-sm"
        >
          <div className="text-[9px] font-black text-teal-600 shrink-0 w-8 leading-none">
            {a.time}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-slate-900 truncate leading-none">{a.service}</p>
            <p className="text-[7px] text-slate-400 mt-0.5 truncate">{a.patient}</p>
          </div>
          <div className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
        </div>
      ))}
    </div>
  );
}
