import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useId, useRef, useEffect } from "react";
import { useSignIn, useUser, useAuth } from "@clerk/tanstack-start";
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
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  createProfessional,
  checkSlugAvailability,
  slugify,
  checkOnboardingStatus,
} from "../lib/onboarding";
import { registerAffiliateConversion } from "../lib/affiliates";
import { buildPublicUrl } from "../lib/subdomain";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "CuidandoVC — Configure seu perfil" }] }),
  component: OnboardingPage,
});

// ─── Page wrapper ──────────────────────────────────────────────────────────────
// O wizard começa pela "Situação" (visível para todos). O login só aparece
// DEPOIS que o cliente responde a primeira etapa.

function OnboardingPage() {
  return <OnboardingWizard />;
}

// Tela de login (Google) exibida após a etapa de Situação, junto dos dados a preencher
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

function OnboardingAuth({ onVoltar }: { onVoltar: () => void }) {
  const { isLoaded, signIn } = useSignIn();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    if (!isLoaded || !signIn) return;
    setError(null);
    setLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/onboarding",
      });
    } catch {
      setError("Não foi possível conectar com o Google. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-6">
        <img src="/logo-icon.png" alt="CuidandoVC" className="size-9 rounded-xl object-contain" />
        <span className="text-xl font-bold tracking-tight text-slate-800">CuidandoVC</span>
      </div>

      <div className="w-full max-w-md text-center mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-100">
          <Check className="size-3.5" /> Situação registrada
        </span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Falta pouco! Crie sua conta</h1>
        <p className="mt-2 text-sm text-slate-500">
          Entre com sua conta Google para continuar e montar seu perfil. Sem senhas — rápido e
          seguro.
        </p>
      </div>

      {/* Botão Google customizado — sem UI do Clerk */}
      <div className="w-full max-w-md">
        <button
          onClick={handleGoogle}
          disabled={loading || !isLoaded}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> Conectando...
            </>
          ) : (
            <>
              <GoogleIcon /> Continuar com Google
            </>
          )}
        </button>
        {error && <p className="mt-3 text-center text-sm text-rose-600">{error}</p>}
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-400">
        <ShieldCheck className="size-3.5" />
        Autenticação via Google — não armazenamos sua senha
      </p>

      <button
        onClick={onVoltar}
        className="mt-4 text-xs font-medium text-slate-500 hover:text-slate-700 transition"
      >
        ← Voltar para a etapa anterior
      </button>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;
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
    gain: "Com CuidandoVC, agendamento e pagamento acontecem enquanto você dorme. Zero mensagens.",
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
    gain: "Com CuidandoVC, seu consultório aceita agendamentos 24h por dia — mesmo quando você está em consulta.",
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
    gain: "Com CuidandoVC, sua equipe foca no atendimento presencial — o agendamento e cobrança se cuidam sozinhos.",
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
    gain: "Com CuidandoVC, sua agenda fica na nuvem: acessível de qualquer lugar, com pagamento integrado.",
  },
};

// ─── Progress labels ──────────────────────────────────────────────────────────

const STEP_LABELS: { num: Step; label: string }[] = [
  { num: 1, label: "Situação" },
  { num: 2, label: "Perfil" },
  { num: 3, label: "Link" },
];

// ─── Component ────────────────────────────────────────────────────────────────

function OnboardingWizard() {
  const navigate = useNavigate();
  const formId = useId();
  const { user } = useUser();
  const { isLoaded, isSignedIn } = useAuth();
  const googleEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  const [step, setStep] = useState<Step>(1);
  // Exibe a tela de login (Google) entre a Situação e o Perfil
  const [showAuth, setShowAuth] = useState(false);

  // Step 1
  const [agendaAtual, setAgendaAtual] = useState<AgendaAtual | null>(null);

  // Step 2
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [registro, setRegistro] = useState("");
  const [uf, setUf] = useState("");

  // Pré-preenche o nome com o nome da conta Google (apenas se ainda vazio)
  useEffect(() => {
    if (user?.fullName) setNome((n) => n || (user.fullName ?? ""));
  }, [user?.fullName]);

  // Step 3
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const slugDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicUrl = buildPublicUrl(slug);

  // Ao carregar / logar: retoma a situação salva e decide o passo inicial
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;

    const saved = typeof window !== "undefined" ? sessionStorage.getItem("onb_situacao") : null;
    const restored = (["whatsapp", "telefone", "secretaria", "papel"] as const).find(
      (v) => v === saved,
    );

    checkOnboardingStatus()
      .then(({ hasProfile }) => {
        if (!active) return;
        if (hasProfile) {
          void navigate({ to: "/dashboard" });
          return;
        }
        // Logado, sem perfil: se veio do login após a Situação, retoma no Perfil
        if (restored) {
          setAgendaAtual((cur) => cur ?? restored);
          setStep((s) => (s === 1 ? 2 : s));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, navigate]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleStep1() {
    if (!agendaAtual) return;
    if (isSignedIn) {
      setStep(2);
    } else {
      // Guarda a resposta e pede o login (Google) antes de seguir para o Perfil
      if (typeof window !== "undefined") sessionStorage.setItem("onb_situacao", agendaAtual);
      setShowAuth(true);
    }
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
    if (clean.length < 3) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    slugDebounceRef.current = setTimeout(async () => {
      try {
        const { available } = await checkSlugAvailability({ data: { slug: clean } });
        setSlugStatus(available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 500);
  }

  async function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    if (slugStatus !== "available" || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createProfessional({
        data: { nomeCompleto: nome, especialidade, registro, uf: uf || undefined, slug },
      });

      // Registra conversão de afiliado se o médico veio via link de afiliado
      if (typeof window !== "undefined") {
        const ref = localStorage.getItem("affiliate_ref");
        if (ref) {
          registerAffiliateConversion({ data: { codigo: ref } }).catch(() => {});
          localStorage.removeItem("affiliate_ref");
        }
        sessionStorage.removeItem("onb_situacao");
      }

      await navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar perfil.");
      setSubmitting(false);
    }
  }

  const pain = agendaAtual ? PAIN_MAP[agendaAtual] : null;

  // Após responder a Situação (e estando deslogado), pede o login antes do Perfil
  if (showAuth && !isSignedIn) {
    return <OnboardingAuth onVoltar={() => setShowAuth(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className={`flex items-center gap-2.5 ${step === 1 ? "mb-3" : "mb-8"}`}>
        <img src="/logo-icon.png" alt="CuidandoVC" className="size-9 rounded-xl object-contain" />
        <span className="text-xl font-bold tracking-tight text-slate-800">CuidandoVC</span>
      </div>

      {/* Atalho para quem já tem conta (só na primeira etapa) */}
      {step === 1 && (
        <Link to="/sign-in" className="mb-7 text-sm text-slate-500 hover:text-teal-600 transition">
          Já tem uma conta? <span className="font-semibold text-teal-600">Entrar</span>
        </Link>
      )}

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
                      <p
                        className={`text-sm font-bold ${selected ? "text-rose-700" : "text-slate-800"}`}
                      >
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
                  <span className="text-base">{pain.emoji}</span>O que o{" "}
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
                <>
                  Quero resolver isso <ArrowRight className="size-4" />
                </>
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

            {/* Conta Google conectada (somente leitura) */}
            {googleEmail && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-100">
                  <Mail className="size-4 text-emerald-600" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    Conta Google conectada
                  </p>
                  <p className="truncate text-sm font-medium text-slate-700">{googleEmail}</p>
                </div>
                <Check className="ml-auto size-4 shrink-0 text-emerald-600" />
              </div>
            )}

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
                {[
                  "AC",
                  "AL",
                  "AP",
                  "AM",
                  "BA",
                  "CE",
                  "DF",
                  "ES",
                  "GO",
                  "MA",
                  "MT",
                  "MS",
                  "MG",
                  "PA",
                  "PB",
                  "PR",
                  "PE",
                  "PI",
                  "RJ",
                  "RN",
                  "RS",
                  "RO",
                  "RR",
                  "SC",
                  "SP",
                  "SE",
                  "TO",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
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
                  {slugStatus === "checking" && (
                    <Loader2 className="size-4 text-slate-400 animate-spin" />
                  )}
                  {slugStatus === "available" && <Check className="size-4 text-emerald-600" />}
                  {slugStatus === "taken" && <AlertCircle className="size-4 text-rose-500" />}
                </span>
              </div>
            </Field>

            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Seu link público
              </p>
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

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-center gap-2.5 text-sm text-rose-700">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={submitting}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={slugStatus !== "available" || submitting}
                className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Stethoscope className="size-4" /> Criar meu perfil
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        14 dias gratuitos · Sem dados bancários agora · Cancele quando quiser
      </p>
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
