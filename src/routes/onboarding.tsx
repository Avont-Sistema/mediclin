import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useId, useRef } from "react";
import {
  Stethoscope,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  MessageCircle,
  Phone,
  UserCheck,
  BookOpen,
  ArrowRight,
  Grid3x3,
  Heart,
  MessageSquare,
  Send,
  Bookmark,
} from "lucide-react";
import { createProfessional, checkSlugAvailability, slugify } from "../lib/onboarding";
import { buildPublicUrl } from "../lib/subdomain";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "MediClin — Configure seu perfil" }] }),
  component: OnboardingPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;
type AgendaAtual = "whatsapp" | "telefone" | "secretaria" | "papel";

// ─── Pain mirror data ─────────────────────────────────────────────────────────

const AGENDA_OPTIONS: {
  value: AgendaAtual;
  icon: React.ReactNode;
  label: string;
  desc: string;
}[] = [
  {
    value: "whatsapp",
    icon: <MessageCircle className="h-6 w-6" />,
    label: "WhatsApp",
    desc: "Respondo mensagens manualmente",
  },
  {
    value: "telefone",
    icon: <Phone className="h-6 w-6" />,
    label: "Telefone",
    desc: "Paciente liga ou eu ligo",
  },
  {
    value: "secretaria",
    icon: <UserCheck className="h-6 w-6" />,
    label: "Secretária",
    desc: "Alguém cuida da agenda por mim",
  },
  {
    value: "papel",
    icon: <BookOpen className="h-6 w-6" />,
    label: "Agenda de papel",
    desc: "Caderno ou planilha",
  },
];

type PainData = {
  emoji: string;
  pains: { stat: string; desc: string }[];
  gain: string;
};

const PAIN_MAP: Record<AgendaAtual, PainData> = {
  whatsapp: {
    emoji: "📱",
    pains: [
      {
        stat: "~45 min/dia",
        desc: "respondendo mensagens de agendamento que poderiam ser automáticas",
      },
      {
        stat: "20% de no-show",
        desc: "porque paciente confirma no WhatsApp mas não aparece — sem cobrança antecipada",
      },
      {
        stat: "R$ 0 adiantado",
        desc: "cada consulta é um risco financeiro até o paciente chegar",
      },
    ],
    gain: "Com MediClin, agendamento e pagamento acontecem enquanto você dorme. Zero mensagens.",
  },
  telefone: {
    emoji: "📞",
    pains: [
      {
        stat: "60% das ligações",
        desc: "de pacientes caem na caixa postal fora do horário comercial — e eles não ligam de volta",
      },
      {
        stat: "Sem agenda 24h",
        desc: "quem quer agendar às 22h depois de ver seu post no Instagram não consegue",
      },
      {
        stat: "Sem histórico",
        desc: "você depende da memória ou de anotações para saber o que foi combinado",
      },
    ],
    gain: "Com MediClin, seu consultório aceita agendamentos 24h por dia — mesmo quando você está em consulta.",
  },
  secretaria: {
    emoji: "👩‍💼",
    pains: [
      {
        stat: "Custo fixo",
        desc: "você paga o mesmo todo mês, mesmo em semanas com agenda vazia",
      },
      {
        stat: "Erro humano",
        desc: "mal-entendidos entre secretária e paciente geram conflitos de horário e confusão",
      },
      {
        stat: "Gargalo de horário",
        desc: "paciente só consegue agendar quando a secretária está disponível",
      },
    ],
    gain: "Com MediClin, sua equipe foca no atendimento presencial — o agendamento e cobrança se cuidam sozinhos.",
  },
  papel: {
    emoji: "📋",
    pains: [
      {
        stat: "Zero backup",
        desc: "agenda perdida ou molhada = caos na semana inteira, sem histórico para recuperar",
      },
      {
        stat: "Sem acesso remoto",
        desc: "impossível saber ou alterar sua disponibilidade sem estar fisicamente no consultório",
      },
      {
        stat: "Invisível online",
        desc: "paciente que te encontra no Instagram não consegue agendar na hora — e vai para o concorrente",
      },
    ],
    gain: "Com MediClin, sua agenda fica na nuvem: acessível de qualquer lugar, com pagamento integrado.",
  },
};

// ─── Progress labels ──────────────────────────────────────────────────────────

const STEP_LABELS: { num: Step; label: string }[] = [
  { num: 1, label: "Situação" },
  { num: 2, label: "Perfil" },
  { num: 3, label: "Link" },
  { num: 4, label: "Confirmar" },
];

// ─── Component ────────────────────────────────────────────────────────────────

function OnboardingPage() {
  const navigate = useNavigate();
  const formId = useId();

  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [agendaAtual, setAgendaAtual] = useState<AgendaAtual | null>(null);

  // Step 2
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [registro, setRegistro] = useState("");
  const [uf, setUf] = useState("");

  // Step 3
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const slugDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Step 4
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicUrl = buildPublicUrl(slug);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleStep1() {
    if (!agendaAtual) return;
    setStep(2);
  }

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !especialidade.trim() || !registro.trim()) return;
    if (!slug) setSlug(slugify(nome));
    setStep(3);
  }

  function handleSlugChange(value: string) {
    const clean = slugify(value);
    setSlug(clean);
    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    if (clean.length < 3) { setSlugStatus("idle"); return; }
    setSlugStatus("checking");
    slugDebounceRef.current = setTimeout(async () => {
      try {
        const { available } = await checkSlugAvailability({ data: { slug: clean } });
        setSlugStatus(available ? "available" : "taken");
      } catch { setSlugStatus("idle"); }
    }, 500);
  }

  function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    if (slugStatus !== "available") return;
    setStep(4);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await createProfessional({
        data: { nomeCompleto: nome, especialidade, registro, uf: uf || undefined, slug },
      });
      await navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar perfil.");
      setSubmitting(false);
    }
  }

  const pain = agendaAtual ? PAIN_MAP[agendaAtual] : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/30">
          <div className="size-3.5 rounded-sm rotate-45 bg-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-800">MediClin</span>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between">
          {STEP_LABELS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`grid size-8 place-items-center rounded-full text-sm font-bold transition-colors ${
                    step > s.num
                      ? "bg-teal-600 text-white"
                      : step === s.num
                        ? "bg-slate-900 text-white"
                        : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {step > s.num ? <Check className="size-4" /> : s.num}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 font-medium">{s.label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`h-0.5 w-16 sm:w-24 mx-1 mb-5 transition-colors ${
                    step > s.num ? "bg-teal-500" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-sm p-8">

        {/* ── Step 1: Pain mirror ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Como você agenda consultas hoje?</h1>
              <p className="mt-1 text-sm text-slate-500">
                Seja honesto — vamos mostrar o que está custando para você.
              </p>
            </div>

            {/* Options grid */}
            <div className="grid grid-cols-2 gap-3">
              {AGENDA_OPTIONS.map((opt) => {
                const selected = agendaAtual === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setAgendaAtual(opt.value)}
                    className={`relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all ${
                      selected
                        ? "border-rose-400 bg-rose-50 shadow-sm shadow-rose-100"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`${selected ? "text-rose-600" : "text-slate-500"}`}>
                      {opt.icon}
                    </span>
                    <div>
                      <p className={`text-sm font-bold ${selected ? "text-rose-700" : "text-slate-800"}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{opt.desc}</p>
                    </div>
                    {selected && (
                      <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pain message — appears after selection */}
            {pain && agendaAtual && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-sm font-semibold text-rose-800 flex items-center gap-2">
                  <span className="text-base">{pain.emoji}</span>
                  O que o{" "}
                  <span className="font-bold">
                    {AGENDA_OPTIONS.find((o) => o.value === agendaAtual)?.label}
                  </span>{" "}
                  está custando para você:
                </p>

                <ul className="space-y-3">
                  {pain.pains.map((p, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-200 text-rose-700 text-[10px] font-bold">
                        !
                      </span>
                      <div>
                        <span className="text-sm font-bold text-rose-700">{p.stat} </span>
                        <span className="text-sm text-rose-600">{p.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-rose-200 pt-4">
                  <p className="text-sm text-teal-700 font-semibold flex items-start gap-2">
                    <span className="text-base">✅</span>
                    {pain.gain}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleStep1}
              disabled={!agendaAtual}
              className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {agendaAtual ? (
                <>Quero resolver isso <ArrowRight className="size-4" /></>
              ) : (
                "Selecione uma opção"
              )}
            </button>
          </div>
        )}

        {/* ── Step 2: Profile ── */}
        {step === 2 && (
          <form id={`${formId}-2`} onSubmit={handleStep2} className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Suas informações profissionais</h1>
              <p className="mt-1 text-sm text-slate-500">
                Exibidas no seu perfil público para os pacientes.
              </p>
            </div>

            <Field label="Nome completo" required>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Dr. João Silva"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                required
              />
            </Field>

            <Field label="Especialidade" required>
              <input
                type="text"
                value={especialidade}
                onChange={(e) => setEspecialidade(e.target.value)}
                placeholder="Clínica Geral, Cardiologia, Odontologia…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                required
              />
            </Field>

            <Field label="Registro profissional (CRM / CRO / outro)" required>
              <input
                type="text"
                value={registro}
                onChange={(e) => setRegistro(e.target.value)}
                placeholder="CRM 123456-SP"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                required
              />
            </Field>

            <Field label="Estado (UF)">
              <select
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">Selecione o estado...</option>
                {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={!nome.trim() || !especialidade.trim() || !registro.trim()}
                className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo <ChevronRight className="size-4" />
              </button>
            </div>
          </form>
        )}

        {/* ── Step 3: Slug ── */}
        {step === 3 && (
          <form id={`${formId}-3`} onSubmit={handleStep3} className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Escolha seu endereço</h1>
              <p className="mt-1 text-sm text-slate-500">
                Seus pacientes acessarão sua página por esse link.
              </p>
            </div>

            <Field label="Endereço personalizado" required>
              <div className="relative">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="dr-joao-silva"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugStatus === "checking" && <Loader2 className="size-4 text-slate-400 animate-spin" />}
                  {slugStatus === "available" && <Check className="size-4 text-emerald-600" />}
                  {slugStatus === "taken" && <AlertCircle className="size-4 text-rose-500" />}
                </span>
              </div>
            </Field>

            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Seu link público</p>
              <p className="text-sm font-mono text-slate-700 break-all">{publicUrl}</p>
            </div>

            {slugStatus === "taken" && (
              <p className="text-xs text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="size-3.5" /> Esse endereço já está em uso. Tente outro.
              </p>
            )}
            {slugStatus === "available" && (
              <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                <Check className="size-3.5" /> Disponível!
              </p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50">
                Voltar
              </button>
              <button type="submit" disabled={slugStatus !== "available"}
                className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed">
                Próximo <ChevronRight className="size-4" />
              </button>
            </div>
          </form>
        )}

        {/* ── Step 4: Instagram simulator + confirm ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">É isso que vai aparecer na sua bio</h1>
              <p className="mt-1 text-sm text-slate-500">
                Clique no link para ver como seus pacientes vão agendar.
              </p>
            </div>

            <InstagramSimulator
              nome={nome}
              especialidade={especialidade}
              slug={slug}
              uf={uf}
            />

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-center gap-2.5 text-sm text-rose-700">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(3)} disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50">
                Voltar
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <><Stethoscope className="size-4" /> Quero isso! Criar meu perfil</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        14 dias gratuitos · Sem dados bancários agora · Cancele quando quiser
      </p>
    </div>
  );
}

// ─── Instagram Simulator ─────────────────────────────────────────────────────

function InstagramSimulator({
  nome,
  especialidade,
  slug,
  uf,
}: {
  nome: string;
  especialidade: string;
  slug: string;
  uf?: string;
}) {
  const [showBooking, setShowBooking] = useState(false);

  const initials = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

  const igUsername = slug || "seu-perfil";
  const publicUrl = buildPublicUrl(slug);

  // Fake grid images — gradient placeholders with different hues
  const gridColors = [
    "from-teal-200 to-emerald-300",
    "from-sky-200 to-blue-300",
    "from-violet-200 to-purple-300",
    "from-teal-100 to-cyan-200",
    "from-emerald-200 to-teal-300",
    "from-blue-200 to-indigo-300",
    "from-cyan-200 to-teal-200",
    "from-purple-200 to-violet-300",
    "from-indigo-200 to-blue-300",
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phone frame */}
      <div className="relative w-[230px] rounded-[2.2rem] border-[5px] border-slate-800 bg-white shadow-2xl shadow-slate-400/30 overflow-hidden select-none">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-800 rounded-b-2xl z-10" />

        {/* Status bar */}
        <div className="bg-white pt-6 px-5 pb-1 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-900">9:41</span>
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5 items-end h-3">
              {[2, 3, 4, 3].map((h, i) => (
                <div key={i} className="w-0.5 bg-slate-900 rounded-sm" style={{ height: `${h * 3}px` }} />
              ))}
            </div>
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-slate-900"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 0 0-6 0zm-4-4 2 2a7.074 7.074 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
            <div className="w-5 h-2.5 rounded-sm border border-slate-900 relative">
              <div className="absolute inset-[2px] right-[3px] bg-slate-900 rounded-sm" />
              <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[3px] h-1.5 bg-slate-900 rounded-r-sm" />
            </div>
          </div>
        </div>

        {!showBooking ? (
          /* ── Instagram profile view ── */
          <div className="bg-white">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
              <span className="text-[11px] font-black text-slate-900 tracking-tight">{igUsername}</span>
              <div className="flex items-center gap-2 text-slate-800">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </div>
            </div>

            {/* Profile section */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-3 mb-3">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-14 w-14 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                    <div className="h-full w-full rounded-full bg-teal-600 flex items-center justify-center text-white font-black text-base">
                      {initials}
                    </div>
                  </div>
                </div>
                {/* Stats */}
                <div className="flex gap-2 flex-1 justify-around text-center">
                  {[["12", "posts"], ["1.4k", "seguid."], ["312", "seguindo"]].map(([n, l]) => (
                    <div key={l}>
                      <p className="text-[11px] font-black text-slate-900">{n}</p>
                      <p className="text-[9px] text-slate-500">{l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bio text */}
              <div className="mb-2 space-y-0.5">
                <p className="text-[11px] font-black text-slate-900 leading-tight">{nome || "Seu Nome"}</p>
                <p className="text-[10px] text-slate-600">
                  🩺 {especialidade || "Especialidade"}{uf ? ` · ${uf}` : ""}
                </p>
                <p className="text-[10px] text-slate-600">Agende sua consulta online 👇</p>
              </div>

              {/* Link in bio — the money button */}
              <button
                onClick={() => setShowBooking(true)}
                className="w-full text-left bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all rounded-lg px-2.5 py-1.5 mb-2 group"
              >
                <span className="text-[10px] font-bold text-blue-600 group-hover:underline break-all">
                  🔗 {publicUrl}
                </span>
              </button>

              {/* Action buttons */}
              <div className="flex gap-1.5">
                <button className="flex-1 bg-slate-100 rounded-lg py-1 text-[10px] font-bold text-slate-800">
                  Seguir
                </button>
                <button className="flex-1 bg-slate-100 rounded-lg py-1 text-[10px] font-bold text-slate-800">
                  Mensagem
                </button>
                <button className="bg-slate-100 rounded-lg px-2 py-1">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none stroke-2 text-slate-800"><path d="M6 9l6 6 6-6"/></svg>
                </button>
              </div>
            </div>

            {/* Grid tabs */}
            <div className="flex border-t border-slate-200 mb-0.5">
              <button className="flex-1 flex items-center justify-center py-2 border-b-2 border-slate-900">
                <Grid3x3 className="w-3.5 h-3.5 text-slate-900" />
              </button>
            </div>

            {/* Photo grid */}
            <div className="grid grid-cols-3 gap-[1.5px]">
              {gridColors.map((cls, i) => (
                <div key={i} className={`aspect-square bg-gradient-to-br ${cls}`} />
              ))}
            </div>
          </div>
        ) : (
          /* ── Booking page view ── */
          <div className="bg-slate-50 min-h-[380px]">
            {/* Back bar */}
            <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2">
              <button
                onClick={() => setShowBooking(false)}
                className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5"
              >
                ‹ Instagram
              </button>
              <div className="flex-1 bg-slate-100 rounded-full px-2 py-0.5 text-center">
                <span className="text-[9px] text-slate-500 truncate">{publicUrl}</span>
              </div>
            </div>

            {/* Doctor hero */}
            <div className="bg-teal-600 px-4 py-4">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-sm shrink-0">
                  {initials}
                </div>
                <div>
                  <p className="text-xs font-black text-white leading-tight">{nome || "Seu Nome"}</p>
                  <p className="text-[10px] text-white/80">{especialidade || "Especialidade"}{uf ? ` · ${uf}` : ""}</p>
                </div>
              </div>
              <p className="text-[10px] text-white/70 mt-2">Agende sua consulta online</p>
            </div>

            {/* Services */}
            <div className="px-3 pt-3 space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Serviços</p>
              {[
                { nome: "Consulta", dur: "30 min", preco: "R$ 250" },
                { nome: "Retorno", dur: "20 min", preco: "R$ 150" },
              ].map((svc, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-2.5 flex items-center justify-between ${
                    i === 0 ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div>
                    <p className={`text-[11px] font-bold ${i === 0 ? "text-teal-800" : "text-slate-800"}`}>{svc.nome}</p>
                    <p className={`text-[9px] ${i === 0 ? "text-teal-600" : "text-slate-500"}`}>{svc.dur}</p>
                  </div>
                  <span className={`text-[10px] font-bold ${i === 0 ? "text-teal-700" : "text-slate-700"}`}>{svc.preco}</span>
                </div>
              ))}

              <button className="w-full bg-teal-600 text-white text-[11px] font-bold py-2 rounded-xl mt-1">
                Agendar agora →
              </button>

              <p className="text-center text-[9px] text-slate-400 pt-1">
                Pagamento seguro · Confirmação imediata
              </p>
            </div>
          </div>
        )}

        {/* Home indicator */}
        <div className="bg-white flex justify-center pb-2 pt-1">
          <div className="w-16 h-1 bg-slate-800 rounded-full" />
        </div>
      </div>

      {/* Caption below phone */}
      <div className="text-center transition-all duration-300">
        {showBooking ? (
          <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5 justify-center">
            <Check className="size-4" /> É exatamente isso que seu paciente vê!
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            👆 Toque no link para ver sua página de agendamento
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`text-right text-slate-900 font-medium break-all ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}
