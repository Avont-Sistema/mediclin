import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useId, useEffect, useRef } from "react";
import { Stethoscope, ChevronRight, Check, Loader2, AlertCircle } from "lucide-react";
import { createProfessional, checkSlugAvailability, slugify } from "../lib/onboarding";
import { buildPublicUrl } from "../lib/subdomain";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "MediClin — Configure seu perfil" }] }),
  component: OnboardingPage,
});

// ─── Steps ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

// ─── Component ────────────────────────────────────────────────────────────────

function OnboardingPage() {
  const navigate = useNavigate();
  const formId = useId();

  const [step, setStep] = useState<Step>(1);
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [registro, setRegistro] = useState("");
  const [uf, setUf] = useState("");
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slugDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Step 1: basic info ──────────────────────────────────────────────────────

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !especialidade.trim() || !registro.trim()) return;
    // Pre-fill slug from name
    const suggested = slugify(nome);
    if (!slug) setSlug(suggested);
    setStep(2);
  }

  // ── Step 2: choose slug ─────────────────────────────────────────────────────

  function handleSlugChange(value: string) {
    const clean = slugify(value);
    setSlug(clean);

    // Clear previous debounce
    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);

    if (clean.length < 3) {
      setSlugStatus("idle");
      return;
    }

    // Debounce availability check by 500ms
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

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    if (slugStatus !== "available") return;
    setStep(3);
  }

  // ── Step 3: confirm & submit ────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await createProfessional({
        data: {
          nomeCompleto: nome,
          especialidade,
          registro,
          uf: uf || undefined,
          slug,
        },
      });
      await navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar perfil.");
      setSubmitting(false);
    }
  }

  const publicUrl = buildPublicUrl(slug);
  const step1Complete = nome.trim() && especialidade.trim() && registro.trim();
  const step2Complete = slugStatus === "available";

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
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center justify-between mb-2">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`grid size-8 place-items-center rounded-full text-sm font-bold transition-colors ${
                  step > s
                    ? "bg-teal-600 text-white"
                    : step === s
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-400"
                }`}
              >
                {step > s ? <Check className="size-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 w-24 transition-colors ${step > s ? "bg-teal-600" : "bg-slate-200"}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>Perfil</span>
          <span className="ml-14">Seu link</span>
          <span>Confirmar</span>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
        {/* ── Step 1 ── */}
        {step === 1 && (
          <form id={`${formId}-1`} onSubmit={handleStep1} className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Bem-vindo ao MediClin!</h1>
              <p className="mt-1 text-sm text-slate-500">
                Vamos configurar seu perfil profissional em menos de 2 minutos.
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

            <button
              type="submit"
              disabled={!step1Complete}
              className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo <ChevronRight className="size-4" />
            </button>
          </form>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <form id={`${formId}-2`} onSubmit={handleStep2} className="space-y-5">
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
                onClick={() => setStep(1)}
                className="inline-flex items-center justify-center gap-2 flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={!step2Complete}
                className="inline-flex items-center justify-center gap-2 flex-1 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo <ChevronRight className="size-4" />
              </button>
            </div>
          </form>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Tudo pronto! Confirme seus dados</h1>
              <p className="mt-1 text-sm text-slate-500">
                Você poderá editar tudo isso depois em Configurações.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-sm">
              <SummaryRow label="Nome" value={nome} />
              <SummaryRow label="Especialidade" value={especialidade} />
              <SummaryRow label="Registro" value={registro} />
              {uf && <SummaryRow label="UF" value={uf} />}
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
                onClick={() => setStep(2)}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 flex-1 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Stethoscope className="size-4" /> Criar perfil
                  </>
                )}
              </button>
            </div>
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
