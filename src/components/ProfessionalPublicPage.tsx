import { useState } from "react";
import {
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
  Shield,
  Activity,
  Heart,
  Brain,
  Leaf,
  Thermometer,
  Zap,
  Star,
  Users,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar as CalendarPicker } from "./ui/calendar";
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

export type ClinicMember = InferSelectModel<typeof professionals> & {
  services: Service[];
};

export type ProfessionalPublic = InferSelectModel<typeof professionals> & {
  services: Service[];
  members?: ClinicMember[];
};

interface Props {
  professional: ProfessionalPublic;
  homeUrl?: string;
}

type Phase =
  | { tag: "idle" }
  | { tag: "servicos"; member: ClinicMember }
  | { tag: "data"; service: Service; member?: ClinicMember }
  | { tag: "hora"; service: Service; date: Date; member?: ClinicMember }
  | {
      tag: "confirmado";
      service: Service;
      date: Date;
      slot: string;
      nome: string;
      meetLink?: string | null;
      member?: ClinicMember;
    };

// ─── Icon palette for service cards ──────────────────────────────────────────

const ICON_PALETTE = [
  { Icon: Stethoscope, bg: "#fff7ed", color: "#ea580c" },
  { Icon: Heart, bg: "#fdf2f8", color: "#db2777" },
  { Icon: Activity, bg: "#eff6ff", color: "#2563eb" },
  { Icon: Thermometer, bg: "#fefce8", color: "#d97706" },
  { Icon: Brain, bg: "#f5f3ff", color: "#7c3aed" },
  { Icon: Leaf, bg: "#f0fdf4", color: "#16a34a" },
  { Icon: Zap, bg: "#fff7f0", color: "#f97316" },
  { Icon: Star, bg: "#fefce8", color: "#ca8a04" },
];

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

/** Splits title so the last word can be highlighted in brand color */
function splitTitle(title: string): { start: string; highlight: string } {
  const words = title.trim().split(/\s+/);
  if (words.length <= 1) return { start: "", highlight: title };
  const highlight = words.pop()!;
  return { start: words.join(" ") + " ", highlight };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProfessionalPublicPage({ professional, homeUrl = "/" }: Props) {
  const brand = professional.corMarca ?? "#0d9488";
  const textColor = professional.corTexto ?? "#0f172a";

  // Booking state
  const [phase, setPhase] = useState<Phase>({ tag: "idle" });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Patient data — always visible in summary panel
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const isClinic =
    professional.plano === "clinic" && (professional.members?.length ?? 0) > 0;

  // Booking mutation
  const mpMutation = useMutation({
    mutationFn: (appointmentId: string) =>
      createMPPreference({ data: { appointmentId } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  const bookingMutation = useMutation({
    mutationFn: () => {
      if (phase.tag !== "hora" || !selectedSlot) throw new Error("Dados incompletos");
      // For clinic members, book under the member's professionalId
      const targetId = phase.member?.id ?? professional.id;
      return createBooking({
        data: {
          professionalId: targetId,
          serviceId: phase.service.id,
          dateStr: toDateStr(phase.date),
          timeSlot: selectedSlot,
          duracaoMinutos: phase.service.duracaoMinutos,
          patient: { nome, email, telefone },
        },
      });
    },
    onSuccess: (result) => {
      if (phase.tag !== "hora" || !selectedSlot) return;
      if (professional.mpAccountAtivo) {
        mpMutation.mutate(result.appointmentId);
      } else {
        const meetLink =
          phase.service.modalidade === "online" || phase.service.modalidade === "ambos"
            ? (phase.member?.meetLink ?? professional.meetLink)
            : null;
        setPhase({
          tag: "confirmado",
          service: phase.service,
          date: phase.date,
          slot: selectedSlot,
          nome,
          meetLink,
          member: phase.member,
        });
      }
    },
  });

  const canConfirm =
    phase.tag === "hora" &&
    !!selectedSlot &&
    nome.trim().length >= 2 &&
    email.trim().includes("@") &&
    telefone.trim().length >= 8;

  const isConfirming = bookingMutation.isPending || mpMutation.isPending;

  const handleConfirm = () => {
    if (canConfirm && !isConfirming) bookingMutation.mutate();
  };

  const handleReset = () => {
    setPhase({ tag: "idle" });
    setSelectedSlot(null);
    setNome("");
    setEmail("");
    setTelefone("");
    bookingMutation.reset();
    mpMutation.reset();
  };

  return (
    <div
      className="min-h-screen bg-white"
      style={
        {
          "--brand": brand,
          "--text": textColor,
          "--brand-foreground": "#ffffff",
        } as React.CSSProperties
      }
    >
      {/* ── Minimal sticky header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-2.5">
            {professional.fotoUrl ? (
              <img
                src={professional.fotoUrl}
                alt={professional.nomeCompleto}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-[--brand]/20"
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
            <span
              className="text-sm font-semibold hidden sm:block"
              style={{ color: textColor }}
            >
              {professional.nomeCompleto}
            </span>
          </div>

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
      </header>

      {/* ── Hero section: 2 cols ──────────────────────────────────────── */}
      <HeroSection professional={professional} brand={brand} textColor={textColor} />

      {/* ── Booking section ───────────────────────────────────────────── */}
      <section id="booking" className="mx-auto max-w-6xl px-4 lg:px-8 pb-20">

        {/* ── Success screen (full width, both individual & clinic) ────── */}
        {phase.tag === "confirmado" && (
          <SuccessScreen
            phase={phase}
            professional={professional}
            onReset={handleReset}
            brand={brand}
          />
        )}

        {/* ── Clinic: step 1 — choose professional (full-width grid) ───── */}
        {isClinic && phase.tag === "idle" && (
          <ClinicTeamSection
            professional={professional}
            brand={brand}
            textColor={textColor}
            onSelect={(member) => setPhase({ tag: "servicos", member })}
          />
        )}

        {/* ── All other phases: 2-col grid (content + summary panel) ───── */}
        {phase.tag !== "confirmado" && !(isClinic && phase.tag === "idle") && (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
            {/* LEFT column */}
            <div>
              {/* Clinic: step 2 — choose service for selected member */}
              {isClinic && phase.tag === "servicos" && (
                <ClinicMemberServicesSection
                  member={phase.member}
                  brand={brand}
                  textColor={textColor}
                  onBack={() => setPhase({ tag: "idle" })}
                  onSelect={(svc) => {
                    setSelectedSlot(null);
                    setPhase({ tag: "data", service: svc, member: phase.member });
                  }}
                />
              )}

              {/* Individual: step 1 — choose service */}
              {!isClinic && phase.tag === "idle" && (
                <ServicesSection
                  professional={professional}
                  brand={brand}
                  textColor={textColor}
                  onSelect={(svc) => {
                    setSelectedSlot(null);
                    setPhase({ tag: "data", service: svc });
                  }}
                />
              )}

              {/* Step: data — date picker (individual & clinic share this) */}
              {phase.tag === "data" && (
                <StepDate
                  professionalId={phase.member?.id ?? professional.id}
                  service={phase.service}
                  brand={brand}
                  onBack={() =>
                    isClinic && phase.member
                      ? setPhase({ tag: "servicos", member: phase.member })
                      : setPhase({ tag: "idle" })
                  }
                  onNext={(date) =>
                    setPhase({ tag: "hora", service: phase.service, date, member: phase.member })
                  }
                />
              )}

              {/* Step: hora — time slots (individual & clinic share this) */}
              {phase.tag === "hora" && (
                <StepTime
                  professionalId={phase.member?.id ?? professional.id}
                  service={phase.service}
                  date={phase.date}
                  selectedSlot={selectedSlot}
                  brand={brand}
                  onBack={() =>
                    setPhase({ tag: "data", service: phase.service, member: phase.member })
                  }
                  onSelectSlot={(slot) => setSelectedSlot(slot)}
                />
              )}
            </div>

            {/* RIGHT column — dark summary panel, sticky */}
            <div className="lg:sticky lg:top-20">
              <SummaryPanel
                phase={phase}
                selectedSlot={selectedSlot}
                professional={professional}
                member={
                  phase.tag === "servicos"
                    ? phase.member
                    : phase.tag === "data" || phase.tag === "hora"
                      ? phase.member
                      : undefined
                }
                brand={brand}
                nome={nome}
                setNome={setNome}
                email={email}
                setEmail={setEmail}
                telefone={telefone}
                setTelefone={setTelefone}
                canConfirm={canConfirm}
                isConfirming={isConfirming}
                onConfirm={handleConfirm}
                error={
                  bookingMutation.error instanceof Error
                    ? bookingMutation.error.message
                    : undefined
                }
              />
            </div>
          </div>
        )}
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-8 text-center">
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

// ─── HeroSection ──────────────────────────────────────────────────────────────

function HeroSection({
  professional,
  brand,
  textColor,
}: {
  professional: ProfessionalPublic;
  brand: string;
  textColor: string;
}) {
  const rawTitle =
    professional.heroTitulo ??
    `Cuidado de saúde com ${professional.especialidade}.`;
  const { start, highlight } = splitTitle(rawTitle);
  const subtitle =
    professional.heroSubtitulo ??
    professional.bio ??
    "Agende consultas presenciais ou telemedicina com especialistas renomados. Confirmação imediata.";

  return (
    <section className="pt-12 pb-16 px-4 lg:px-8 bg-white">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* ── Left: text ───────────────────────────────────────────────── */}
        <div>
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-medium text-slate-600 mb-6">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: brand }}
            />
            Confirmação em 2 minutos · Sem fila de espera
          </div>

          {/* Heading */}
          <h1
            className="text-4xl sm:text-5xl lg:text-[3.25rem] font-black leading-[1.1] tracking-tight mb-5"
            style={{ color: textColor }}
          >
            {start}
            <span style={{ color: brand }}>{highlight}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-500 text-[15px] leading-relaxed mb-8 max-w-md">
            {subtitle}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-10">
            <a
              href="#booking"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90"
              style={{ background: textColor }}
            >
              Ver horários hoje <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#servicos"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Nossos serviços
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-3">
            <TrustBadge
              icon={Shield}
              title="Médico certificado"
              desc={`Verificação ${professional.registro}`}
              brand={brand}
            />
            <TrustBadge
              icon={Clock}
              title="Confirmação em 2 min"
              desc="Sem fila de espera"
              brand={brand}
            />
            {professional.telemedicinaAtivo && (
              <TrustBadge
                icon={Video}
                title="Telemedicina"
                desc="Atendimento online seguro"
                brand={brand}
              />
            )}
          </div>
        </div>

        {/* ── Right: image or blank box ─────────────────────────────── */}
        <div className="relative">
          {professional.heroImageUrl ? (
            <img
              src={professional.heroImageUrl}
              alt="Imagem do consultório"
              className="w-full h-72 sm:h-80 lg:h-96 rounded-3xl object-cover shadow-xl"
            />
          ) : (
            /* Blank placeholder — doctor uploads via dashboard */
            <div className="w-full h-72 sm:h-80 lg:h-96 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
              <div className="text-center">
                <div
                  className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-3 shadow-md"
                  style={{ background: brand }}
                >
                  {professional.nomeCompleto
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </div>
                <p className="text-sm font-semibold text-slate-500">
                  {professional.nomeCompleto}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{professional.especialidade}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TrustBadge({
  icon: Icon,
  title,
  desc,
  brand,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  brand: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
      <Icon className="h-4 w-4 shrink-0" style={{ color: brand }} />
      <div>
        <p className="text-xs font-semibold text-slate-800">{title}</p>
        <p className="text-[11px] text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

// ─── ServicesSection ──────────────────────────────────────────────────────────

function ServicesSection({
  professional,
  brand,
  textColor,
  onSelect,
}: {
  professional: ProfessionalPublic;
  brand: string;
  textColor: string;
  onSelect: (s: Service) => void;
}) {
  return (
    <div id="servicos">
      {/* Step header */}
      <div className="flex items-start gap-3 mb-6">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white shadow-sm"
          style={{ background: brand }}
        >
          01
        </span>
        <div>
          <h2 className="text-base font-bold" style={{ color: textColor }}>
            Escolha a especialidade
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Comece selecionando o cuidado desejado
          </p>
        </div>
      </div>

      {professional.services.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          Nenhum serviço disponível no momento.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {professional.services.map((svc, idx) => (
            <ServiceCard
              key={svc.id}
              svc={svc}
              idx={idx}
              brand={brand}
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
  idx,
  brand,
  onSelect,
}: {
  svc: Service;
  idx: number;
  brand: string;
  onSelect: (s: Service) => void;
}) {
  const palette = ICON_PALETTE[idx % ICON_PALETTE.length];
  const { Icon, bg, color } = palette;

  return (
    <button
      onClick={() => onSelect(svc)}
      className="group flex flex-col text-left bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-lg hover:border-[--brand]/30 transition-all duration-200"
    >
      {/* Icon */}
      <div
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition group-hover:scale-105"
        style={{ background: bg }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>

      {/* Name */}
      <p className="text-sm font-bold text-slate-900 leading-snug">{svc.nome}</p>

      {/* Description (in brand color like reference) */}
      {svc.descricao && (
        <p className="mt-0.5 text-xs leading-snug" style={{ color: brand }}>
          {svc.descricao}
        </p>
      )}

      {/* Separator + price */}
      <div className="mt-auto pt-3 mt-3 border-t border-slate-100 flex items-end justify-between gap-1">
        <span className="text-[11px] text-slate-400">A partir de</span>
        <span className="text-sm font-black text-slate-900">{fmt(svc.preco)}</span>
      </div>
    </button>
  );
}

// ─── StepDate ─────────────────────────────────────────────────────────────────

function StepDate({
  professionalId,
  service,
  brand,
  onBack,
  onNext,
}: {
  professionalId: string;
  service: Service;
  brand: string;
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
    <div>
      {/* Step header */}
      <div className="flex items-start gap-3 mb-6">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white shadow-sm"
          style={{ background: brand }}
        >
          02
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900">Escolha a data</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Serviço:{" "}
            <strong className="text-slate-600">{service.nome}</strong>
          </p>
        </div>
      </div>

      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 transition"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar aos serviços
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <CalendarPicker
          mode="single"
          selected={selected}
          onSelect={setSelected}
          disabled={isDisabled}
          fromDate={today}
          toDate={maxDate}
          className="w-full"
        />

        <button
          disabled={!selected}
          onClick={() => selected && onNext(selected)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-40"
          style={{ background: selected ? brand : "#94a3b8" }}
        >
          Continuar <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── StepTime ─────────────────────────────────────────────────────────────────

function StepTime({
  professionalId,
  service,
  date,
  selectedSlot,
  brand,
  onBack,
  onSelectSlot,
}: {
  professionalId: string;
  service: Service;
  date: Date;
  selectedSlot: string | null;
  brand: string;
  onBack: () => void;
  onSelectSlot: (slot: string) => void;
}) {
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
    <div>
      {/* Step header */}
      <div className="flex items-start gap-3 mb-6">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white shadow-sm"
          style={{ background: brand }}
        >
          03
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900">Escolha o horário</h2>
          <p className="text-xs text-slate-400 mt-0.5">{fmtDate(date)}</p>
        </div>
      </div>

      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 transition"
      >
        <ChevronLeft className="h-4 w-4" />
        Mudar data
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        {isFetching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : slots.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhum horário disponível neste dia.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => onSelectSlot(slot)}
                  className="rounded-xl border py-2.5 text-sm font-semibold transition"
                  style={
                    selectedSlot === slot
                      ? { background: brand, borderColor: brand, color: "#fff" }
                      : { borderColor: "#e2e8f0", color: "#334155" }
                  }
                >
                  {slot}
                </button>
              ))}
            </div>
            {selectedSlot && (
              <p className="mt-4 text-center text-xs text-slate-500">
                Horário <strong>{selectedSlot}</strong> selecionado. Preencha seus dados ao lado para confirmar.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── SummaryPanel (dark, always visible) ─────────────────────────────────────

function SummaryPanel({
  phase,
  selectedSlot,
  professional,
  member,
  brand,
  nome,
  setNome,
  email,
  setEmail,
  telefone,
  setTelefone,
  canConfirm,
  isConfirming,
  onConfirm,
  error,
}: {
  phase: Phase;
  selectedSlot: string | null;
  professional: ProfessionalPublic;
  member?: ClinicMember;
  brand: string;
  nome: string;
  setNome: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  telefone: string;
  setTelefone: (v: string) => void;
  canConfirm: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  error?: string;
}) {
  // Dark panel background: strong dark tinted with brand color
  const panelBg = `color-mix(in srgb, ${brand} 12%, #0a1420 88%)`;

  // For clinic members: service comes from data/hora phases; for servicos phase no service yet
  const service =
    phase.tag === "data" || phase.tag === "hora" || phase.tag === "confirmado"
      ? phase.service
      : null;
  const date =
    phase.tag === "hora" || phase.tag === "confirmado" ? phase.date : null;
  const slot =
    phase.tag === "hora"
      ? selectedSlot
      : phase.tag === "confirmado"
        ? phase.slot
        : null;

  // Which professional name to display
  const profName = member?.nomeCompleto ?? professional.nomeCompleto;

  return (
    <div
      className="rounded-2xl overflow-hidden text-white shadow-xl"
      style={{ background: panelBg }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-50 mb-1">
          SUA RESERVA
        </p>
        <h3 className="text-lg font-bold leading-snug">Resumo do agendamento</h3>
      </div>

      {/* Booking rows */}
      <div className="px-6 pb-4 space-y-3">
        <SummaryRow label="Especialidade" value={service ? (member?.especialidade ?? professional.especialidade) : undefined} />
        <SummaryRow label="Serviço" value={service?.nome} />
        <SummaryRow label="Profissional" value={profName} />
        <SummaryRow
          label="Data e hora"
          value={
            date && slot
              ? `${date.toLocaleDateString("pt-BR")} · ${slot}`
              : date
                ? date.toLocaleDateString("pt-BR")
                : undefined
          }
        />
      </div>

      {/* Valor total */}
      <div className="mx-5 rounded-xl px-4 py-3 mb-5" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: brand }}
          >
            VALOR TOTAL
          </span>
          {service ? (
            <span className="text-xl font-black">{fmt(service.preco)}</span>
          ) : (
            <span className="font-bold text-sm opacity-30">——</span>
          )}
        </div>
      </div>

      {/* Patient fields */}
      <div className="px-5 space-y-3 pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5">
            NOME COMPLETO
          </p>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como está no RG"
            className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5">
            CELULAR / WHATSAPP
          </p>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5">
            E-MAIL
          </p>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="para confirmação"
            type="email"
            className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="mx-5 mb-3 rounded-lg bg-rose-500/20 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}

      {/* CTA */}
      <div className="px-5 pb-6">
        <button
          disabled={!canConfirm || isConfirming}
          onClick={onConfirm}
          className="w-full rounded-xl py-3.5 text-sm font-bold transition-all"
          style={{
            background: canConfirm ? brand : "rgba(255,255,255,0.12)",
            color: canConfirm ? "#fff" : "rgba(255,255,255,0.4)",
            cursor: canConfirm ? "pointer" : "not-allowed",
          }}
        >
          {isConfirming ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Confirmando...
            </span>
          ) : professional.mpAccountAtivo ? (
            <span className="flex items-center justify-center gap-2">
              <CreditCard className="h-4 w-4" /> Ir para pagamento →
            </span>
          ) : (
            "Confirmar agendamento →"
          )}
        </button>

        {!canConfirm && phase.tag !== "idle" && (
          <p className="mt-2 text-center text-[11px] opacity-40">
            {!service
              ? "Selecione um serviço"
              : !selectedSlot
                ? "Selecione data e horário"
                : "Preencha nome, telefone e e-mail"}
          </p>
        )}

        {/* Trust micro-signals */}
        <div className="mt-4 flex items-center justify-center gap-4 opacity-40">
          <span className="flex items-center gap-1 text-[10px]">
            <Shield className="h-3 w-3" /> Pagamento seguro
          </span>
          <span className="flex items-center gap-1 text-[10px]">
            <CheckCircle2 className="h-3 w-3" /> Confirmação imediata
          </span>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs opacity-50 shrink-0">{label}</span>
      {value ? (
        <span className="text-xs font-semibold text-right max-w-[60%] leading-snug">{value}</span>
      ) : (
        <span className="text-xs opacity-20 font-bold">——</span>
      )}
    </div>
  );
}

// ─── WhatsApp confirmation helper ─────────────────────────────────────────────

function buildWhatsAppUrl(
  professional: ProfessionalPublic,
  phase: Extract<Phase, { tag: "confirmado" }>,
): string | null {
  // Use the clinic member's WhatsApp if available, otherwise the clinic/professional's
  const rawPhone = phase.member?.telefoneWhatsapp ?? professional.telefoneWhatsapp;
  const phone = rawPhone?.replace(/\D/g, "");
  if (!phone) return null;

  const recipientName = phase.member?.nomeCompleto ?? professional.nomeCompleto;
  const dateStr = fmtDate(phase.date);
  const msg = [
    `Olá, ${recipientName}! 👋`,
    ``,
    `Gostaria de *confirmar* meu agendamento:`,
    ``,
    `📋 *Serviço:* ${phase.service.nome}`,
    `👤 *Paciente:* ${phase.nome}`,
    `📅 *Data:* ${dateStr}`,
    `⏰ *Horário:* ${phase.slot}`,
    `⏱️ *Duração:* ${phase.service.duracaoMinutos} min`,
    `💰 *Valor:* ${fmt(phase.service.preco)}`,
    ``,
    `Agendado via MediClin 🩺`,
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

// ─── SuccessScreen ────────────────────────────────────────────────────────────

function SuccessScreen({
  phase,
  professional,
  onReset,
  brand,
}: {
  phase: Extract<Phase, { tag: "confirmado" }>;
  professional: ProfessionalPublic;
  onReset: () => void;
  brand: string;
}) {
  const whatsappUrl = buildWhatsAppUrl(professional, phase);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
      {/* Icon */}
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>

      <h2 className="text-xl font-black text-slate-900">Agendamento confirmado!</h2>
      <p className="mt-2 text-sm text-slate-500">
        Olá, <strong>{phase.nome}</strong>! Sua consulta foi agendada com sucesso.
      </p>

      {/* Booking summary card */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left space-y-3">
        <p className="font-bold text-sm text-slate-900">{phase.service.nome}</p>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {fmtDate(phase.date)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {phase.slot} · {phase.service.duracaoMinutos} min
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="h-3.5 w-3.5 shrink-0 text-slate-400 flex items-center justify-center font-bold text-[10px]">R$</span>
            {fmt(phase.service.preco)}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-col gap-3">
        {/* WhatsApp confirmation button */}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-90"
            style={{ background: "#25d366" }}
          >
            <MessageCircle className="h-4 w-4" />
            Confirmar no WhatsApp
          </a>
        )}

        {/* Google Meet link (telemedicine) */}
        {phase.meetLink && (
          <a
            href={phase.meetLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition"
          >
            <Video className="h-4 w-4" />
            Entrar na consulta (Google Meet)
          </a>
        )}

        {/* Book again */}
        <button
          onClick={onReset}
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          Agendar outro serviço
        </button>
      </div>
    </div>
  );
}

// ─── ClinicTeamSection ────────────────────────────────────────────────────────

function ClinicTeamSection({
  professional,
  brand,
  textColor,
  onSelect,
}: {
  professional: ProfessionalPublic;
  brand: string;
  textColor: string;
  onSelect: (member: ClinicMember) => void;
}) {
  const members = professional.members ?? [];

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white shadow-sm"
          style={{ background: brand }}
        >
          01
        </span>
        <div>
          <h2 className="text-base font-bold" style={{ color: textColor }}>
            Escolha o profissional
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Selecione o especialista desejado
          </p>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          Nenhum profissional disponível no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member, idx) => {
            const activeServices = member.services.filter((s) => s.ativo);
            const minPrice =
              activeServices.length > 0
                ? Math.min(...activeServices.map((s) => Number(s.preco)))
                : null;
            const palette = ICON_PALETTE[idx % ICON_PALETTE.length];

            return (
              <button
                key={member.id}
                onClick={() => onSelect(member)}
                className="group flex flex-col text-left bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-lg hover:border-[--brand]/30 transition-all duration-200 w-full"
                style={{ "--brand": brand } as React.CSSProperties}
              >
                {member.fotoUrl ? (
                  <img
                    src={member.fotoUrl}
                    alt={member.nomeCompleto}
                    className="h-14 w-14 rounded-xl object-cover mb-3 ring-2 ring-slate-100"
                  />
                ) : (
                  <div
                    className="h-14 w-14 rounded-xl mb-3 flex items-center justify-center"
                    style={{ background: palette.bg }}
                  >
                    <palette.Icon className="h-6 w-6" style={{ color: palette.color }} />
                  </div>
                )}

                <p className="font-bold text-slate-900 text-sm">{member.nomeCompleto}</p>
                <p className="text-xs mt-0.5" style={{ color: member.corMarca ?? brand }}>
                  {member.especialidade}
                </p>

                {member.bio && (
                  <p className="mt-1.5 text-[11px] text-slate-400 line-clamp-2 leading-snug">
                    {member.bio}
                  </p>
                )}

                <div className="mt-auto pt-3 border-t border-slate-100 flex items-end justify-between gap-1 mt-3">
                  <span className="text-[11px] text-slate-400">
                    {activeServices.length} serviço{activeServices.length !== 1 ? "s" : ""}
                  </span>
                  {minPrice !== null && (
                    <span className="text-sm font-black text-slate-900">
                      a partir de {fmt(minPrice)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ClinicMemberServicesSection ──────────────────────────────────────────────

function ClinicMemberServicesSection({
  member,
  brand,
  textColor,
  onBack,
  onSelect,
}: {
  member: ClinicMember;
  brand: string;
  textColor: string;
  onBack: () => void;
  onSelect: (svc: Service) => void;
}) {
  const activeServices = member.services.filter((s) => s.ativo);
  const memberBrand = member.corMarca ?? brand;

  return (
    <div>
      {/* Back to team */}
      <button
        onClick={onBack}
        className="mb-5 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 transition"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar aos profissionais
      </button>

      {/* Member mini-profile */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
        {member.fotoUrl ? (
          <img
            src={member.fotoUrl}
            alt={member.nomeCompleto}
            className="h-14 w-14 rounded-xl object-cover ring-2 ring-white shadow-sm shrink-0"
          />
        ) : (
          <div
            className="h-14 w-14 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-sm"
            style={{ background: memberBrand }}
          >
            {member.nomeCompleto
              .split(" ")
              .slice(0, 2)
              .map((n) => n[0])
              .join("")}
          </div>
        )}
        <div>
          <p className="font-bold text-slate-900">{member.nomeCompleto}</p>
          <p className="text-xs mt-0.5" style={{ color: memberBrand }}>
            {member.especialidade}
          </p>
          {member.bio && (
            <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">
              {member.bio}
            </p>
          )}
        </div>
      </div>

      {/* Step header */}
      <div className="flex items-start gap-3 mb-6">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white shadow-sm"
          style={{ background: brand }}
        >
          02
        </span>
        <div>
          <h2 className="text-base font-bold" style={{ color: textColor }}>
            Escolha a especialidade
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Selecione o serviço desejado
          </p>
        </div>
      </div>

      {activeServices.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          Nenhum serviço disponível no momento.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {activeServices.map((svc, idx) => (
            <ServiceCard
              key={svc.id}
              svc={svc}
              idx={idx}
              brand={memberBrand}
              onSelect={onSelect}
            />
          ))}
        </div>
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
