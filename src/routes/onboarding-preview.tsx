/**
 * DEV ONLY — Preview do onboarding sem auth e sem banco.
 * Todos os campos pré-preenchidos; submit mostra tela de sucesso fake.
 * Acessível em /onboarding-preview
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useId } from "react";
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
  Eye,
} from "lucide-react";
import { buildPublicUrl } from "../lib/subdomain";

export const Route = createFileRoute("/onboarding-preview")({
  head: () => ({ meta: [{ title: "Preview — Onboarding MediClin" }] }),
  component: OnboardingPreviewPage,
});

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO = {
  nome: "Dr. João Silva",
  especialidade: "Cardiologista",
  registro: "CRM 123456",
  uf: "SP",
  slug: "dr-joao-silva",
};

// ─── Types (espelho de onboarding.tsx) ───────────────────────────────────────

type Step = 1 | 2 | 3;
type AgendaAtual = "whatsapp" | "telefone" | "secretaria" | "papel";

const AGENDA_OPTIONS: { value: AgendaAtual; icon: React.ReactNode; label: string; desc: string }[] = [
  { value: "whatsapp",  icon: <MessageCircle className="h-6 w-6" />, label: "WhatsApp",       desc: "Respondo mensagens manualmente" },
  { value: "telefone",  icon: <Phone         className="h-6 w-6" />, label: "Telefone",        desc: "Paciente liga ou eu ligo" },
  { value: "secretaria",icon: <UserCheck     className="h-6 w-6" />, label: "Secretária",      desc: "Alguém cuida da agenda por mim" },
  { value: "papel",     icon: <BookOpen      className="h-6 w-6" />, label: "Agenda de papel", desc: "Caderno ou planilha" },
];

type PainData = { emoji: string; pains: { stat: string; desc: string }[]; gain: string };

const PAIN_MAP: Record<AgendaAtual, PainData> = {
  whatsapp: {
    emoji: "📱",
    pains: [
      { stat: "~45 min/dia",    desc: "respondendo mensagens de agendamento que poderiam ser automáticas" },
      { stat: "20% de no-show", desc: "porque paciente confirma no WhatsApp mas não aparece — sem cobrança antecipada" },
      { stat: "R$ 0 adiantado", desc: "cada consulta é um risco financeiro até o paciente chegar" },
    ],
    gain: "Com MediClin, agendamento e pagamento acontecem enquanto você dorme. Zero mensagens.",
  },
  telefone: {
    emoji: "📞",
    pains: [
      { stat: "60% das ligações",  desc: "de pacientes caem na caixa postal fora do horário comercial — e eles não ligam de volta" },
      { stat: "Sem agenda 24h",    desc: "quem quer agendar às 22h depois de ver seu post no Instagram não consegue" },
      { stat: "Sem histórico",     desc: "você depende da memória ou de anotações para saber o que foi combinado" },
    ],
    gain: "Com MediClin, seu consultório aceita agendamentos 24h por dia — mesmo quando você está em consulta.",
  },
  secretaria: {
    emoji: "👩‍💼",
    pains: [
      { stat: "Custo fixo",        desc: "você paga o mesmo todo mês, mesmo em semanas com agenda vazia" },
      { stat: "Erro humano",       desc: "mal-entendidos entre secretária e paciente geram conflitos de horário e confusão" },
      { stat: "Gargalo de horário",desc: "paciente só consegue agendar quando a secretária está disponível" },
    ],
    gain: "Com MediClin, sua equipe foca no atendimento presencial — o agendamento e cobrança se cuidam sozinhos.",
  },
  papel: {
    emoji: "📋",
    pains: [
      { stat: "Zero backup",       desc: "agenda perdida ou molhada = caos na semana inteira, sem histórico para recuperar" },
      { stat: "Sem acesso remoto", desc: "impossível saber ou alterar sua disponibilidade sem estar fisicamente no consultório" },
      { stat: "Invisível online",  desc: "paciente que te encontra no Instagram não consegue agendar na hora — e vai para o concorrente" },
    ],
    gain: "Com MediClin, sua agenda fica na nuvem: acessível de qualquer lugar, com pagamento integrado.",
  },
};

const STEP_LABELS: { num: Step; label: string }[] = [
  { num: 1, label: "Situação" },
  { num: 2, label: "Perfil" },
  { num: 3, label: "Link" },
];

// ─── Preview page ─────────────────────────────────────────────────────────────

function OnboardingPreviewPage() {
  const formId = useId();
  const [step, setStep] = useState<Step>(1);
  const [done, setDone] = useState(false);

  // Step 1 — pré-selecionado
  const [agendaAtual, setAgendaAtual] = useState<AgendaAtual>("whatsapp");

  // Step 2 — pré-preenchido
  const [nome, setNome] = useState(DEMO.nome);
  const [especialidade, setEspecialidade] = useState(DEMO.especialidade);
  const [registro, setRegistro] = useState(DEMO.registro);
  const [uf, setUf] = useState(DEMO.uf);

  // Step 3 — pré-preenchido + disponível sem checar banco
  const [slug, setSlug] = useState(DEMO.slug);

  const publicUrl = buildPublicUrl(slug);
  const pain = PAIN_MAP[agendaAtual];

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 gap-6">
        <div className="w-full max-w-lg rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Perfil criado!</h1>
          <p className="text-sm text-slate-500">
            (Preview — nenhum dado foi salvo no banco)
          </p>
          <p className="font-mono text-sm text-teal-700 bg-white border border-teal-200 rounded-xl px-4 py-2 break-all">
            {publicUrl}
          </p>
          <button
            onClick={() => { setStep(1); setDone(false); }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Reiniciar preview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">

      {/* Badge */}
      <div className="mb-4 flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
        <Eye className="size-3.5" /> Preview interno — sem auth, sem banco
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/30">
          <div className="size-3.5 rounded-sm rotate-45 bg-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-800">MediClin</span>
      </div>

      {/* Jump buttons */}
      <div className="flex gap-2 mb-6">
        {STEP_LABELS.map((s) => (
          <button
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              step === s.num
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s.num}. {s.label}
          </button>
        ))}
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
                <div className={`h-0.5 w-16 sm:w-24 mx-1 mb-5 transition-colors ${step > s.num ? "bg-teal-500" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-sm p-8">

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Como você agenda consultas hoje?</h1>
              <p className="mt-1 text-sm text-slate-500">Seja honesto — vamos mostrar o que está custando para você.</p>
            </div>

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
                    <span className={selected ? "text-rose-600" : "text-slate-500"}>{opt.icon}</span>
                    <div>
                      <p className={`text-sm font-bold ${selected ? "text-rose-700" : "text-slate-800"}`}>{opt.label}</p>
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

            {pain && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-sm font-semibold text-rose-800 flex items-center gap-2">
                  <span className="text-base">{pain.emoji}</span>
                  O que o <span className="font-bold">{AGENDA_OPTIONS.find((o) => o.value === agendaAtual)?.label}</span> está custando para você:
                </p>
                <ul className="space-y-3">
                  {pain.pains.map((p, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-200 text-rose-700 text-[10px] font-bold">!</span>
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
              onClick={() => setStep(2)}
              className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800"
            >
              Quero resolver isso <ArrowRight className="size-4" />
            </button>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <form id={`${formId}-2`} onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Suas informações profissionais</h1>
              <p className="mt-1 text-sm text-slate-500">Exibidas no seu perfil público para os pacientes.</p>
            </div>

            <Field label="Nome completo" required>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20" required />
            </Field>

            <Field label="Especialidade" required>
              <input type="text" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20" required />
            </Field>

            <Field label="Registro profissional (CRM / CRO / outro)" required>
              <input type="text" value={registro} onChange={(e) => setRegistro(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20" required />
            </Field>

            <Field label="Estado (UF)">
              <select value={uf} onChange={(e) => setUf(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20">
                <option value="">Selecione o estado...</option>
                {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50">
                Voltar
              </button>
              <button type="submit"
                className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800">
                Próximo <ChevronRight className="size-4" />
              </button>
            </div>
          </form>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <form id={`${formId}-3`} onSubmit={(e) => { e.preventDefault(); setDone(true); }} className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Escolha seu endereço</h1>
              <p className="mt-1 text-sm text-slate-500">Seus pacientes acessarão sua página por esse link.</p>
            </div>

            <Field label="Endereço personalizado" required>
              <div className="relative">
                <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20" required />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="size-4 text-emerald-600" />
                </span>
              </div>
            </Field>

            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Seu link público</p>
              <p className="text-sm font-mono text-slate-700 break-all">{publicUrl}</p>
            </div>

            <p className="text-xs text-emerald-600 flex items-center gap-1.5">
              <Check className="size-3.5" /> Disponível!
            </p>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50">
                Voltar
              </button>
              <button type="submit"
                className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-teal-700">
                <Stethoscope className="size-4" /> Criar meu perfil
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
