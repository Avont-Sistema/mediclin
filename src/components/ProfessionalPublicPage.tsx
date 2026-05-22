import { useState } from "react";
import {
  MapPin,
  Clock,
  Video,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  CreditCard,
  Stethoscope,
  Phone,
  Star,
  Shield,
  Wifi,
  ArrowRight,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar as CalendarPicker } from "./ui/calendar";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  fetchAvailableDays,
  fetchAvailableSlots,
  createBooking,
} from "../lib/availability";
import { createMPPreference } from "../lib/mercadopago";
import type { InferSelectModel } from "drizzle-orm";
import type { professionals, services } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type Service = InferSelectModel<typeof services>;
export type ProfessionalPublic = InferSelectModel<typeof professionals> & {
  services: Service[];
};

interface Props {
  professional: ProfessionalPublic;
  homeUrl?: string;
}

type Phase =
  | { tag: "idle" }
  | { tag: "data"; service: Service }
  | { tag: "hora"; service: Service; date: Date }
  | { tag: "paciente"; service: Service; date: Date; slot: string }
  | {
      tag: "confirmado";
      service: Service;
      date: Date;
      slot: string;
      nome: string;
      email: string;
      meetLink?: string | null;
    };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: string | number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function serviceIcon(s: Service) {
  const mod = s.modalidade;
  if (mod === "online") return <Video className="h-5 w-5" />;
  if (mod === "ambos") return <Wifi className="h-5 w-5" />;
  return <Stethoscope className="h-5 w-5" />;
}

function modalidadeLabel(mod: string) {
  if (mod === "online") return { label: "Telemedicina", cls: "bg-sky-100 text-sky-700 border-sky-200" };
  if (mod === "ambos") return { label: "Presencial + Online", cls: "bg-violet-100 text-violet-700 border-violet-200" };
  return { label: "Presencial", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
}

const STEP_LABELS = ["Serviço", "Data", "Horário", "Dados"];

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProfessionalPublicPage({ professional, homeUrl = "/" }: Props) {
  const [phase, setPhase] = useState<Phase>({ tag: "idle" });
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const brand = professional.corMarca ?? "#0d9488";
  const brandFg = "#ffffff";

  const heroTitle =
    professional.heroTitulo ?? `Agende com ${professional.nomeCompleto}`;
  const heroSubtitle =
    professional.heroSubtitulo ??
    professional.bio ??
    "Escolha o serviço, a data e o horário. Confirmação imediata.";

  // active step index (0-based)
  const stepIndex =
    phase.tag === "idle"
      ? -1
      : phase.tag === "data"
        ? 0
        : phase.tag === "hora"
          ? 1
          : phase.tag === "paciente"
            ? 2
            : 3;

  return (
    <div
      className="min-h-screen bg-[--page-bg]"
      style={
        {
          "--brand": brand,
          "--brand-foreground": brandFg,
          "--page-bg": "oklch(0.985 0.002 90)",
        } as React.CSSProperties
      }
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            {professional.fotoUrl ? (
              <img
                src={professional.fotoUrl}
                alt={professional.nomeCompleto}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-[--brand]/30"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: brand }}
              >
                {professional.nomeCompleto
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")}
              </div>
            )}
            <span className="text-sm font-semibold text-slate-800 hidden sm:block">
              {professional.nomeCompleto}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {professional.telefoneWhatsapp && (
              <a
                href={`https://wa.me/${professional.telefoneWhatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-700 transition"
              >
                <Phone className="h-3 w-3" />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Booking success banner */}
        {bookingSuccess && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Pagamento confirmado!</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Sua consulta foi agendada. Você receberá uma confirmação por e-mail.
              </p>
            </div>
            <button
              onClick={() => setBookingSuccess(false)}
              className="ml-auto text-slate-400 hover:text-slate-600 text-lg"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Hero card */}
            <HeroCard professional={professional} heroTitle={heroTitle} heroSubtitle={heroSubtitle} brand={brand} />

            {/* Step indicator (when booking) */}
            {phase.tag !== "idle" && phase.tag !== "confirmado" && (
              <StepIndicator current={stepIndex} />
            )}

            {/* Services or booking steps */}
            {phase.tag === "idle" && (
              <ServicesSection
                professional={professional}
                onSelect={(svc) => setPhase({ tag: "data", service: svc })}
              />
            )}

            {phase.tag === "data" && (
              <StepDate
                professionalId={professional.id}
                service={phase.service}
                onBack={() => setPhase({ tag: "idle" })}
                onNext={(date) =>
                  setPhase({ tag: "hora", service: phase.service, date })
                }
              />
            )}

            {phase.tag === "hora" && (
              <StepTime
                professionalId={professional.id}
                service={phase.service}
                date={phase.date}
                onBack={() => setPhase({ tag: "data", service: phase.service })}
                onNext={(slot) =>
                  setPhase({
                    tag: "paciente",
                    service: phase.service,
                    date: phase.date,
                    slot,
                  })
                }
              />
            )}

            {phase.tag === "paciente" && (
              <StepPatient
                professional={professional}
                service={phase.service}
                date={phase.date}
                slot={phase.slot}
                onBack={() =>
                  setPhase({
                    tag: "hora",
                    service: phase.service,
                    date: phase.date,
                  })
                }
                onSuccess={({ nome, email, meetLink }) =>
                  setPhase({
                    tag: "confirmado",
                    service: phase.service,
                    date: phase.date,
                    slot: phase.slot,
                    nome,
                    email,
                    meetLink,
                  })
                }
                homeUrl={homeUrl}
              />
            )}

            {phase.tag === "confirmado" && (
              <SuccessScreen
                phase={phase}
                onReset={() => {
                  setPhase({ tag: "idle" });
                  setBookingSuccess(false);
                }}
              />
            )}
          </div>

          {/* ── Right column — sticky summary ───────────────────────────── */}
          <div className="lg:sticky lg:top-20">
            <SummaryPanel phase={phase} professional={professional} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-100 py-8 text-center">
        <p className="text-xs text-slate-400">
          Powered by{" "}
          <a href="/" className="font-semibold text-slate-500 hover:text-slate-800">
            MediClin
          </a>{" "}
          · Agendamento online seguro
        </p>
      </footer>
    </div>
  );
}

// ─── HeroCard ─────────────────────────────────────────────────────────────────

function HeroCard({
  professional,
  heroTitle,
  heroSubtitle,
  brand,
}: {
  professional: ProfessionalPublic;
  heroTitle: string;
  heroSubtitle: string;
  brand: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Cover */}
      {professional.heroImageUrl ? (
        <img
          src={professional.heroImageUrl}
          alt="Capa"
          className="h-32 w-full object-cover"
        />
      ) : (
        <div
          className="h-28"
          style={{
            background: `linear-gradient(135deg, ${brand} 0%, ${brand}99 100%)`,
          }}
        />
      )}

      <div className="px-6 pb-6">
        {/* Avatar */}
        <div className="-mt-10 mb-4">
          {professional.fotoUrl ? (
            <img
              src={professional.fotoUrl}
              alt={professional.nomeCompleto}
              className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-md"
            />
          ) : (
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white text-2xl font-bold text-white shadow-md"
              style={{ background: brand }}
            >
              {professional.nomeCompleto
                .split(" ")
                .slice(0, 2)
                .map((n) => n[0])
                .join("")}
            </div>
          )}
        </div>

        <h1 className="text-xl font-bold text-slate-900">{heroTitle}</h1>
        <p
          className="mt-0.5 text-sm font-semibold"
          style={{ color: brand }}
        >
          {professional.especialidade}
        </p>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {heroSubtitle}
        </p>

        {/* Trust badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            <Shield className="h-3 w-3 text-emerald-600" />
            {professional.registro}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Confirmação em 2 min
          </span>
          {professional.telemedicinaAtivo && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700">
              <Video className="h-3 w-3" />
              Telemedicina
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ServicesSection ──────────────────────────────────────────────────────────

function ServicesSection({
  professional,
  onSelect,
}: {
  professional: ProfessionalPublic;
  onSelect: (s: Service) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: professional.corMarca ?? "#0d9488" }}
        >
          01
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Escolha o serviço</h2>
          <p className="text-xs text-slate-500">Selecione o tipo de atendimento desejado</p>
        </div>
      </div>

      {professional.services.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          Nenhum serviço disponível no momento.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {professional.services.map((svc) => (
            <ServiceCard
              key={svc.id}
              svc={svc}
              brand={professional.corMarca ?? "#0d9488"}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  svc,
  brand,
  onSelect,
}: {
  svc: Service;
  brand: string;
  onSelect: (s: Service) => void;
}) {
  const mod = modalidadeLabel(svc.modalidade);

  return (
    <button
      onClick={() => onSelect(svc)}
      className="group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-[--brand]/40 hover:shadow-lg hover:shadow-[--brand]/5"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white transition group-hover:scale-105"
          style={{ background: brand }}
        >
          {serviceIcon(svc)}
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${mod.cls}`}
        >
          {mod.label}
        </span>
      </div>

      <p className="font-semibold text-slate-900">{svc.nome}</p>
      {svc.descricao && (
        <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{svc.descricao}</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="h-3 w-3" />
          {svc.duracaoMinutos} min
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">A partir de</span>
          <p className="text-base font-bold text-slate-900">{fmt(svc.preco)}</p>
        </div>
      </div>

      <div
        className="mt-3 flex items-center justify-end gap-1 text-xs font-medium opacity-0 transition group-hover:opacity-100"
        style={{ color: brand }}
      >
        Agendar agora <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}

// ─── StepIndicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 rounded-2xl border border-slate-200 bg-white p-4">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex flex-1 items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                i < current
                  ? "bg-[--brand] text-[--brand-foreground]"
                  : i === current
                    ? "bg-[--brand] text-[--brand-foreground] ring-4 ring-[--brand]/20"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {i < current ? <CheckCircle2 className="h-4 w-4" /> : String(i + 1).padStart(2, "0")}
            </div>
            <span
              className={`hidden text-[10px] font-medium sm:block ${
                i === current ? "text-slate-900" : "text-slate-400"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div
              className={`mx-1 h-px flex-1 transition ${
                i < current ? "bg-[--brand]" : "bg-slate-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── StepDate ─────────────────────────────────────────────────────────────────

function StepDate({
  professionalId,
  service,
  onBack,
  onNext,
}: {
  professionalId: string;
  service: Service;
  onBack: () => void;
  onNext: (date: Date) => void;
}) {
  const [selected, setSelected] = useState<Date | undefined>();

  const { data: availableDays = [] } = useQuery({
    queryKey: ["availableDays", professionalId],
    queryFn: () => fetchAvailableDays({ data: { professionalId } }),
  });

  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);

  const isDisabled = (day: Date) =>
    day < today || !availableDays.includes(day.getDay());

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ChevronLeft className="h-4 w-4" /> Voltar aos serviços
      </button>

      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-[--brand]" />
        <h2 className="text-base font-semibold text-slate-900">Escolha uma data</h2>
      </div>

      <CalendarPicker
        mode="single"
        selected={selected}
        onSelect={setSelected}
        disabled={isDisabled}
        fromDate={today}
        toDate={maxDate}
        className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 w-full"
      />

      <button
        disabled={!selected}
        onClick={() => selected && onNext(selected)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-[--brand-foreground] transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: selected ? "var(--brand)" : undefined, backgroundColor: !selected ? "#e2e8f0" : undefined }}
      >
        Continuar <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── StepTime ─────────────────────────────────────────────────────────────────

function StepTime({
  professionalId,
  service,
  date,
  onBack,
  onNext,
}: {
  professionalId: string;
  service: Service;
  date: Date;
  onBack: () => void;
  onNext: (slot: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const { data: slots = [], isFetching } = useQuery({
    queryKey: ["slots", professionalId, toDateStr(date)],
    queryFn: () =>
      fetchAvailableSlots({
        data: {
          professionalId,
          dateStr: toDateStr(date),
          duracaoMinutos: service.duracaoMinutos,
        },
      }),
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ChevronLeft className="h-4 w-4" />
        {fmtDate(date)}
      </button>

      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-[--brand]" />
        <h2 className="text-base font-semibold text-slate-900">Escolha o horário</h2>
      </div>

      {isFetching ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[--brand]" />
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          Nenhum horário disponível neste dia.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot) => (
            <button
              key={slot}
              onClick={() => setSelected(slot)}
              className={`rounded-xl border py-2.5 text-sm font-medium transition ${
                selected === slot
                  ? "border-[--brand] bg-[--brand] text-[--brand-foreground]"
                  : "border-slate-200 text-slate-700 hover:border-[--brand]/40 hover:bg-[--brand]/5"
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
      )}

      <button
        disabled={!selected}
        onClick={() => selected && onNext(selected)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: selected ? "var(--brand)" : undefined,
          backgroundColor: !selected ? "#e2e8f0" : undefined,
          color: selected ? "var(--brand-foreground)" : "#94a3b8",
        }}
      >
        Continuar <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── StepPatient ──────────────────────────────────────────────────────────────

function StepPatient({
  professional,
  service,
  date,
  slot,
  onBack,
  onSuccess,
  homeUrl,
}: {
  professional: ProfessionalPublic;
  service: Service;
  date: Date;
  slot: string;
  onBack: () => void;
  onSuccess: (data: { nome: string; email: string; meetLink?: string | null }) => void;
  homeUrl: string;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const mpMutation = useMutation({
    mutationFn: (appointmentId: string) =>
      createMPPreference({ data: { appointmentId } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  const booking = useMutation({
    mutationFn: () =>
      createBooking({
        data: {
          professionalId: professional.id,
          serviceId: service.id,
          dateStr: toDateStr(date),
          timeSlot: slot,
          duracaoMinutos: service.duracaoMinutos,
          patient: { nome, email, telefone },
        },
      }),
    onSuccess: (result) => {
      if (professional.mpAccountAtivo) {
        mpMutation.mutate(result.appointmentId);
      } else {
        const meetLink =
          service.modalidade === "online" || service.modalidade === "ambos"
            ? professional.meetLink
            : null;
        onSuccess({ nome, email, meetLink });
      }
    },
  });

  const isPending = booking.isPending || mpMutation.isPending;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ChevronLeft className="h-4 w-4" />
        {fmtDate(date)} às {slot}
      </button>

      <div className="mb-5 flex items-center gap-2">
        <Star className="h-5 w-5 text-[--brand]" />
        <h2 className="text-base font-semibold text-slate-900">Seus dados</h2>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="nome">Nome completo</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Maria da Silva"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="maria@email.com"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="telefone">Telefone / WhatsApp</Label>
          <Input
            id="telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="+55 11 99999-9999"
            className="mt-1.5"
          />
        </div>
      </div>

      {(booking.error || mpMutation.error) && (
        <p className="mt-3 text-sm text-rose-600">
          {mpMutation.error
            ? "Pagamento indisponível. Tente novamente."
            : "Erro ao agendar. Tente novamente."}
        </p>
      )}

      {professional.mpAccountAtivo && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <CreditCard className="h-3.5 w-3.5" />
          Você será redirecionado para o Mercado Pago.
        </p>
      )}

      <button
        disabled={!nome || !email || !telefone || isPending}
        onClick={() => booking.mutate()}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background:
            nome && email && telefone && !isPending ? "var(--brand)" : undefined,
          backgroundColor:
            !nome || !email || !telefone || isPending ? "#e2e8f0" : undefined,
          color:
            nome && email && telefone && !isPending
              ? "var(--brand-foreground)"
              : "#94a3b8",
        }}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Aguarde...
          </>
        ) : professional.mpAccountAtivo ? (
          <>
            <CreditCard className="h-4 w-4" /> Ir para pagamento
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" /> Confirmar agendamento
          </>
        )}
      </button>
    </div>
  );
}

// ─── SuccessScreen ────────────────────────────────────────────────────────────

function SuccessScreen({
  phase,
  onReset,
}: {
  phase: Extract<Phase, { tag: "confirmado" }>;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Agendamento confirmado!</h2>
      <p className="mt-2 text-sm text-slate-500">
        Uma confirmação foi enviada para <strong>{phase.email}</strong>.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left space-y-2 text-sm text-slate-700">
        <div className="font-semibold text-slate-900">{phase.service.nome}</div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <Calendar className="h-3.5 w-3.5" />
          {fmtDate(phase.date)} às {phase.slot}
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <Clock className="h-3.5 w-3.5" />
          {phase.service.duracaoMinutos} min · {fmt(phase.service.preco)}
        </div>
      </div>

      {phase.meetLink && (
        <a
          href={phase.meetLink}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition"
        >
          <Video className="h-4 w-4" /> Entrar na consulta online (Google Meet)
        </a>
      )}

      <button
        onClick={onReset}
        className="mt-6 text-sm text-slate-500 hover:text-slate-800 underline"
      >
        Agendar outro serviço
      </button>
    </div>
  );
}

// ─── SummaryPanel ─────────────────────────────────────────────────────────────

function SummaryPanel({
  phase,
  professional,
}: {
  phase: Phase;
  professional: ProfessionalPublic;
}) {
  const brand = professional.corMarca ?? "#0d9488";

  const service = phase.tag !== "idle" ? phase.service : null;
  const date = (phase.tag === "hora" || phase.tag === "paciente" || phase.tag === "confirmado") ? phase.date : null;
  const slot = (phase.tag === "paciente" || phase.tag === "confirmado") ? phase.slot : null;

  return (
    <div
      className="rounded-2xl text-white overflow-hidden shadow-lg"
      style={{ background: `linear-gradient(145deg, ${brand} 0%, ${brand}cc 100%)` }}
    >
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
          SUA RESERVA
        </p>
        <h3 className="mt-1 text-lg font-bold">Resumo do agendamento</h3>
      </div>

      <div className="bg-white/10 backdrop-blur-sm px-5 py-4 space-y-3">
        <SummaryRow
          label="Especialidade"
          value={service ? professional.especialidade : undefined}
        />
        <SummaryRow label="Serviço" value={service?.nome} />
        <SummaryRow label="Profissional" value={professional.nomeCompleto} />
        <SummaryRow
          label="Data e hora"
          value={date && slot ? `${date.toLocaleDateString("pt-BR")} às ${slot}` : undefined}
        />

        <div className="pt-2 border-t border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
              VALOR TOTAL
            </span>
            {service ? (
              <span className="text-xl font-bold">{fmt(service.preco)}</span>
            ) : (
              <span className="text-sm opacity-40">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Patient form preview (step 3) */}
      {phase.tag === "paciente" && (
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
            NOME COMPLETO
          </p>
          <input
            readOnly
            placeholder="Como está no RG"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none"
          />
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mt-2">
            E-MAIL
          </p>
          <input
            readOnly
            placeholder="para confirmação"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none"
          />
        </div>
      )}

      {/* Trust signals */}
      <div className="px-5 pb-5">
        <div className="space-y-2 pt-2">
          {[
            { icon: Shield, text: "Pagamento 100% seguro" },
            { icon: CheckCircle2, text: "Confirmação imediata" },
            { icon: Star, text: "Médico certificado" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-xs opacity-70">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs opacity-60">{label}</span>
      {value ? (
        <span className="text-xs font-semibold text-right max-w-[55%]">{value}</span>
      ) : (
        <span className="text-xs opacity-30">—</span>
      )}
    </div>
  );
}

// ─── Not-found ────────────────────────────────────────────────────────────────

export function ProfessionalNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-100">
          <Stethoscope className="h-8 w-8 text-slate-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Profissional não encontrado</h1>
        <p className="mt-2 text-sm text-slate-500">
          O link que você acessou não corresponde a nenhum profissional cadastrado.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Ir para o início
        </a>
      </div>
    </div>
  );
}
