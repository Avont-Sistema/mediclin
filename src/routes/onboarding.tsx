import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useId } from "react";
import {
  Stethoscope,
  Building2,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  Star,
  Zap,
} from "lucide-react";
import { createProfessional, checkSlugAvailability, slugify } from "../lib/onboarding";
import { buildPublicUrl } from "../lib/subdomain";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "MediClin — Bem-vindo!" }] }),
  component: OnboardingPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;
type Tipo = "solo" | "clinica";

// ─── Plan features ────────────────────────────────────────────────────────────

const PLAN_FEATURES: Record<Tipo, string[]> = {
  solo: [
    "1 profissional ativo",
    "Serviços e horários ilimitados",
    "Agendamentos online 24/7",
    "Página pública personalizada",
    "Pagamentos online integrados",
  ],
  clinica: [
    "Múltiplos profissionais na equipe",
    "Um link único da clínica",
    "Serviços independentes por membro",
    "Agendamentos online 24/7",
    "Gestão centralizada da equipe",
  ],
};

const STEP_LABELS: { label: string; num: Step }[] = [
  { label: "Tipo", num: 1 },
  { label: "Perfil", num: 2 },
  { label: "Link", num: 3 },
  { label: "Ativar", num: 4 },
];

// ─── Component ────────────────────────────────────────────────────────────────

function OnboardingPage() {
  const navigate = useNavigate();
  const formId = useId();

  const [step, setStep] = useState<Step>(1);
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [registro, setRegistro] = useState("");
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicUrl = buildPublicUrl(slug);

  // ── Step 1: choose type ──────────────────────────────────────────────────────

  function handleStep1(t: Tipo) {
    setTipo(t);
    setStep(2);
  }

  // ── Step 2: profile info ─────────────────────────────────────────────────────

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !especialidade.trim() || !registro.trim()) return;
    if (!slug) setSlug(slugify(nome));
    setStep(3);
  }

  // ── Step 3: choose slug ──────────────────────────────────────────────────────

  async function handleSlugChange(value: string) {
    const clean = slugify(value);
    setSlug(clean);
    if (clean.length < 3) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    try {
      const { available } = await checkSlugAvailability({ data: { slug: clean } });
      setSlugStatus(available ? "available" : "taken");
    } catch {
      setSlugStatus("idle");
    }
  }

  function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    if (slugStatus !== "available") return;
    setStep(4);
  }

  // ── Step 4: mock activation ──────────────────────────────────────────────────

  async function handleSubmit() {
    if (!tipo) return;
    setSubmitting(true);
    setError(null);
    try {
      await createProfessional({
        data: {
          nomeCompleto: nome,
          especialidade,
          registro,
          slug,
          plano: tipo === "clinica" ? "clinic" : "pro",
        },
      });
      await navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar perfil.");
      setSubmitting(false);
    }
  }

  const isSolo = tipo === "solo";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/20 flex flex-col items-center justify-center px-4 py-12">
      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/30">
          <div className="size-3.5 rounded-sm rotate-45 bg-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-800">MediClin</span>
      </div>

      {/* ── Progress bar ── */}
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

      {/* ── Card ── */}
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-sm p-8">

        {/* ── Step 1: Tipo ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Bem-vindo ao MediClin!</h1>
              <p className="mt-1 text-sm text-slate-500">
                Como você vai usar a plataforma?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Solo */}
              <button
                onClick={() => handleStep1("solo")}
                className="group relative flex flex-col items-start gap-3 rounded-2xl border-2 border-slate-200 bg-white p-5 text-left transition-all hover:border-teal-400 hover:bg-teal-50/30 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100">
                  <Stethoscope className="h-5 w-5 text-teal-700" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Profissional Solo</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Você atende de forma autônoma, com sua própria agenda e link público personalizado.
                  </p>
                </div>
                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700">
                  Plano Pro · R$ 79/mês
                </span>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-hover:text-teal-500 transition" />
              </button>

              {/* Clinic */}
              <button
                onClick={() => handleStep1("clinica")}
                className="group relative flex flex-col items-start gap-3 rounded-2xl border-2 border-slate-200 bg-white p-5 text-left transition-all hover:border-violet-400 hover:bg-violet-50/30 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100">
                  <Building2 className="h-5 w-5 text-violet-700" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Clínica</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Você gerencia uma equipe de profissionais com um único link da clínica.
                  </p>
                </div>
                <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                  Plano Clínica · R$ 149/mês
                </span>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-hover:text-violet-500 transition" />
              </button>
            </div>

            <p className="text-center text-xs text-slate-400">
              14 dias gratuitos · Sem dados bancários agora · Cancele quando quiser
            </p>
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
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* URL preview */}
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

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={slugStatus !== "available"}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo <ChevronRight className="size-4" />
              </button>
            </div>
          </form>
        )}

        {/* ── Step 4: Activate ── */}
        {step === 4 && tipo && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Ative seu plano</h1>
              <p className="mt-1 text-sm text-slate-500">
                Comece seu teste gratuito de 14 dias sem compromisso.
              </p>
            </div>

            {/* Plan card */}
            <div
              className={`rounded-2xl border-2 p-5 ${
                isSolo
                  ? "border-teal-300 bg-teal-50/40"
                  : "border-violet-300 bg-violet-50/40"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-lg text-slate-900">
                    {isSolo ? "Plano Pro" : "Plano Clínica"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isSolo ? "Para profissionais autônomos" : "Para clínicas e equipes"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-2xl font-black ${
                      isSolo ? "text-teal-700" : "text-violet-700"
                    }`}
                  >
                    {isSolo ? "R$ 79" : "R$ 149"}
                  </p>
                  <p className="text-xs text-slate-400">/mês após o teste</p>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {PLAN_FEATURES[tipo].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check
                      className={`h-4 w-4 shrink-0 ${
                        isSolo ? "text-teal-600" : "text-violet-600"
                      }`}
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Trial highlight */}
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 py-3 px-4">
              <Star className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">14 dias totalmente grátis</p>
                <p className="text-xs text-emerald-600">
                  Sem dados bancários agora · Cancele quando quiser
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-sm">
              <SummaryRow label="Nome" value={nome} />
              <SummaryRow label="Especialidade" value={especialidade} />
              <SummaryRow label="Registro" value={registro} />
              <SummaryRow label="Link público" value={publicUrl} mono />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-center gap-2.5 text-sm text-rose-700">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={submitting}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`flex-[2] inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSolo
                    ? "bg-teal-600 hover:bg-teal-700"
                    : "bg-violet-600 hover:bg-violet-700"
                }`}
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="size-4" /> Ativar plano grátis →
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-xs text-slate-400">
              🔒 Sem cobrança durante o período de teste
            </p>
          </div>
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
      <span
        className={`text-right text-slate-900 font-medium break-all ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
