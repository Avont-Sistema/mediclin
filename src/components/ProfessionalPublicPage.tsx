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
  Shield,
  Activity,
  Heart,
  Brain,
  Leaf,
  Thermometer,
  Zap,
  Star,
  MessageCircle,
  MapPin,
  Phone,
  Mail,
  Instagram,
  Award,
  GraduationCap,
  Sparkles,
  Check,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar as CalendarPicker } from "./ui/calendar";
import { fetchAvailableDays, fetchAvailableSlots, createBooking } from "../lib/availability";
import { createMPPreference } from "../lib/mercadopago";
import type { InferSelectModel } from "drizzle-orm";
import type { professionals, services, professionalCards } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type Service = InferSelectModel<typeof services>;

export type ProfessionalCard = InferSelectModel<typeof professionalCards>;

export type ClinicMember = InferSelectModel<typeof professionals> & {
  services: Service[];
};

export type ProfessionalPublic = InferSelectModel<typeof professionals> & {
  services: Service[];
  cards: ProfessionalCard[];
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

// ─── Static Tailwind color map ─────────────────────────────────────────────────

const COLOR_MAP = {
  teal:    { text: "text-teal-600",    bgGradient: "from-teal-500 to-teal-700",    bgSoft: "bg-teal-50",    badge: "bg-teal-600"    },
  emerald: { text: "text-emerald-600", bgGradient: "from-emerald-500 to-emerald-700", bgSoft: "bg-emerald-50", badge: "bg-emerald-600" },
  cyan:    { text: "text-cyan-600",    bgGradient: "from-cyan-500 to-cyan-700",    bgSoft: "bg-cyan-50",    badge: "bg-cyan-600"    },
  sky:     { text: "text-sky-600",     bgGradient: "from-sky-500 to-sky-700",     bgSoft: "bg-sky-50",     badge: "bg-sky-600"     },
  blue:    { text: "text-blue-600",    bgGradient: "from-blue-500 to-blue-700",   bgSoft: "bg-blue-50",    badge: "bg-blue-600"    },
  indigo:  { text: "text-indigo-600",  bgGradient: "from-indigo-500 to-indigo-700", bgSoft: "bg-indigo-50", badge: "bg-indigo-600"  },
  violet:  { text: "text-violet-600",  bgGradient: "from-violet-500 to-violet-700", bgSoft: "bg-violet-50", badge: "bg-violet-600"  },
  purple:  { text: "text-purple-600",  bgGradient: "from-purple-500 to-purple-700", bgSoft: "bg-purple-50", badge: "bg-purple-600"  },
  fuchsia: { text: "text-fuchsia-600", bgGradient: "from-fuchsia-500 to-fuchsia-700", bgSoft: "bg-fuchsia-50", badge: "bg-fuchsia-600" },
  pink:    { text: "text-pink-600",    bgGradient: "from-pink-500 to-pink-700",   bgSoft: "bg-pink-50",    badge: "bg-pink-600"    },
  rose:    { text: "text-rose-600",    bgGradient: "from-rose-500 to-rose-700",   bgSoft: "bg-rose-50",    badge: "bg-rose-600"    },
  orange:  { text: "text-orange-600",  bgGradient: "from-orange-500 to-orange-700", bgSoft: "bg-orange-50", badge: "bg-orange-600"  },
  amber:   { text: "text-amber-600",   bgGradient: "from-amber-500 to-amber-700", bgSoft: "bg-amber-50",   badge: "bg-amber-600"   },
  yellow:  { text: "text-yellow-600",  bgGradient: "from-yellow-500 to-yellow-700", bgSoft: "bg-yellow-50", badge: "bg-yellow-600"  },
  lime:    { text: "text-lime-600",    bgGradient: "from-lime-500 to-lime-700",   bgSoft: "bg-lime-50",    badge: "bg-lime-600"    },
} as const;

type ColorKey = keyof typeof COLOR_MAP;
type ColorPalette = (typeof COLOR_MAP)[ColorKey];

function getColors(cor: string | null): ColorPalette {
  return COLOR_MAP[(cor ?? "teal") as ColorKey] ?? COLOR_MAP.teal;
}

// ─── Icon palette for service cards ───────────────────────────────────────────

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

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function renderHeadline(text: string, highlight: string | null, textClass: string) {
  if (!highlight) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className={textClass}>{text.slice(idx, idx + highlight.length)}</span>
      {text.slice(idx + highlight.length)}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProfessionalPublicPage({ professional, homeUrl = "/" }: Props) {
  const brand = professional.corMarca ?? "#0d9488";
  const colors = getColors(professional.corPrimaria);
  const highlightColors = getColors(professional.corDestaque ?? professional.corPrimaria);

  const [phase, setPhase] = useState<Phase>({ tag: "idle" });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const isClinic =
    professional.plano === "clinic" && (professional.members?.length ?? 0) > 0;

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
    <div className="min-h-screen bg-slate-50 pb-20">

      {/* ── Profile Header ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-md px-4 pt-6">
        {/* Booking success banner */}
        {bookingSuccess && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 grid place-items-center shrink-0">
              <Check className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">Pagamento confirmado!</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Sua consulta foi agendada. Você receberá um e-mail de confirmação.
              </p>
            </div>
            <button
              onClick={() => setBookingSuccess(false)}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Profile card */}
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 mb-4 text-center">
          {/* Circular photo */}
          <div className="mx-auto mb-4">
            {professional.fotoUrl ? (
              <img
                src={professional.fotoUrl}
                alt={professional.nomeCompleto}
                width={120}
                height={120}
                className="mx-auto size-28 rounded-full object-cover ring-4 ring-white shadow-lg"
              />
            ) : (
              <div
                className={`mx-auto size-28 rounded-full bg-gradient-to-br ${colors.bgGradient} ring-4 ring-white shadow-lg grid place-items-center`}
              >
                <span className="text-3xl font-bold text-white">
                  {initials(professional.nomeCompleto)}
                </span>
              </div>
            )}
          </div>

          {/* Name + specialty */}
          <h1 className="text-base font-semibold text-slate-900">{professional.nomeCompleto}</h1>
          <p className={`text-sm ${colors.text} mt-0.5`}>{professional.especialidade}</p>

          {/* Impact headline */}
          {professional.headline && (
            <h2 className="mt-5 text-2xl font-extrabold leading-tight text-slate-900 tracking-tight">
              {renderHeadline(professional.headline, professional.headlineDestaque, highlightColors.text)}
            </h2>
          )}

          {/* Bio */}
          {professional.bio && (
            <p className="mt-3 text-sm text-slate-500 leading-relaxed line-clamp-2">
              {professional.bio}
            </p>
          )}
        </section>

        {/* Cards grid */}
        {professional.cards.length > 0 && (
          <section className="grid grid-cols-2 gap-3 mb-6">
            {professional.cards.map((card) => (
              <CardItem key={card.id} card={card} colors={colors} />
            ))}
          </section>
        )}
      </div>

      {/* ── Booking Section (cascata inline) ───────────────────────────── */}
      <section id="booking" className="mx-auto max-w-4xl px-4 lg:px-8">

        {/* Success screen (full width) */}
        {phase.tag === "confirmado" && (
          <SuccessScreen
            phase={phase}
            professional={professional}
            onReset={handleReset}
            brand={brand}
          />
        )}

        {/* Clinic: step 1 — choose professional */}
        {isClinic && phase.tag === "idle" && (
          <ClinicTeamSection
            professional={professional}
            brand={brand}
            colors={colors}
            onSelect={(member) => setPhase({ tag: "servicos", member })}
          />
        )}

        {/* All phases except confirmado and clinic idle: 2-col grid */}
        {phase.tag !== "confirmado" && !(isClinic && phase.tag === "idle") && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
            {/* LEFT: wizard steps */}
            <div>
              {/* Clinic: step 2 — choose service for member */}
              {isClinic && phase.tag === "servicos" && (
                <ClinicMemberServicesSection
                  member={phase.member}
                  brand={brand}
                  colors={colors}
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
                  colors={colors}
                  onSelect={(svc) => {
                    setSelectedSlot(null);
                    setPhase({ tag: "data", service: svc });
                  }}
                />
              )}

              {/* Step 2: date picker */}
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

              {/* Step 3: time slots */}
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

            {/* RIGHT: sticky dark summary panel */}
            <div className="lg:sticky lg:top-6">
              <SummaryPanel
                phase={phase}
                selectedSlot={selectedSlot}
                professional={professional}
                member={
                  phase.tag === "servicos" || phase.tag === "data" || phase.tag === "hora"
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

// ─── Card Item ─────────────────────────────────────────────────────────────────

function CardItem({ card, colors }: { card: ProfessionalCard; colors: ColorPalette }) {
  const config = getCardConfig(card, colors);

  const content = (
    <div className="flex items-start gap-2.5">
      <div className={`grid size-9 place-items-center rounded-xl ${config.iconBg} ${config.iconColor} shrink-0`}>
        <config.Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-500 leading-tight">{card.titulo}</p>
        {card.subtitulo && (
          <p className="text-sm font-bold text-slate-900 leading-tight mt-0.5 truncate">
            {card.subtitulo}
          </p>
        )}
      </div>
    </div>
  );

  if (config.href) {
    return (
      <a
        href={config.href}
        target="_blank"
        rel="noreferrer"
        className="rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:border-slate-300 hover:shadow-sm"
      >
        {content}
      </a>
    );
  }

  return <div className="rounded-2xl border border-slate-200 bg-white p-3">{content}</div>;
}

function getCardConfig(card: ProfessionalCard, colors: ColorPalette) {
  switch (card.tipo) {
    case "certificacao":
      return { Icon: Award, iconBg: colors.bgSoft, iconColor: colors.text, href: undefined };
    case "qualificacao":
      return { Icon: GraduationCap, iconBg: colors.bgSoft, iconColor: colors.text, href: undefined };
    case "servico_extra":
      return { Icon: Sparkles, iconBg: colors.bgSoft, iconColor: colors.text, href: undefined };
    case "whatsapp":
      return {
        Icon: MessageCircle,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        href: card.valor ? `https://wa.me/${card.valor.replace(/\D/g, "")}` : undefined,
      };
    case "instagram":
      return {
        Icon: Instagram,
        iconBg: "bg-rose-50",
        iconColor: "text-rose-500",
        href: card.valor
          ? card.valor.startsWith("http")
            ? card.valor
            : `https://instagram.com/${card.valor.replace("@", "")}`
          : undefined,
      };
    case "localizacao":
      return { Icon: MapPin, iconBg: "bg-rose-50", iconColor: "text-rose-500", href: card.valor ?? undefined };
    case "telefone":
      return {
        Icon: Phone,
        iconBg: colors.bgSoft,
        iconColor: colors.text,
        href: card.valor ? `tel:${card.valor.replace(/\D/g, "")}` : undefined,
      };
    case "email":
      return {
        Icon: Mail,
        iconBg: colors.bgSoft,
        iconColor: colors.text,
        href: card.valor ? `mailto:${card.valor}` : undefined,
      };
    default:
      return { Icon: Sparkles, iconBg: "bg-slate-50", iconColor: "text-slate-400", href: undefined };
  }
}

// ─── ServicesSection ──────────────────────────────────────────────────────────

function ServicesSection({
  professional,
  brand,
  colors,
  onSelect,
}: {
  professional: ProfessionalPublic;
  brand: string;
  colors: ColorPalette;
  onSelect: (s: Service) => void;
}) {
  return (
    <div id="servicos">
      <div className="flex items-start gap-3 mb-6">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white shadow-sm ${colors.badge}`}
        >
          01
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900">Escolha a especialidade</h2>
          <p className="text-xs text-slate-400 mt-0.5">Comece selecionando o cuidado desejado</p>
        </div>
      </div>

      {professional.services.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          Nenhum serviço disponível no momento.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {professional.services.map((svc, idx) => (
            <ServiceCard key={svc.id} svc={svc} idx={idx} brand={brand} onSelect={onSelect} />
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
  const { Icon, bg, color } = ICON_PALETTE[idx % ICON_PALETTE.length];

  return (
    <button
      onClick={() => onSelect(svc)}
      className="group flex flex-col text-left bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-200"
    >
      <div
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition group-hover:scale-105"
        style={{ background: bg }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <p className="text-sm font-bold text-slate-900 leading-snug">{svc.nome}</p>
      {svc.descricao && (
        <p className="mt-0.5 text-xs leading-snug" style={{ color: brand }}>
          {svc.descricao}
        </p>
      )}
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

  const isDisabled = (day: Date) => day < today || !availableDays.includes(day.getDay());

  return (
    <div>
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
            Serviço: <strong className="text-slate-600">{service.nome}</strong>
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
        data: { professionalId, dateStr: toDateStr(date), duracaoMinutos: service.duracaoMinutos },
      }),
  });

  return (
    <div>
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
                Horário <strong>{selectedSlot}</strong> selecionado. Preencha seus dados ao lado
                para confirmar.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── SummaryPanel ─────────────────────────────────────────────────────────────

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
  const panelBg = `color-mix(in srgb, ${brand} 12%, #0a1420 88%)`;

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

  const profName = member?.nomeCompleto ?? professional.nomeCompleto;

  return (
    <div className="rounded-2xl overflow-hidden text-white shadow-xl" style={{ background: panelBg }}>
      <div className="px-6 pt-6 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-50 mb-1">SUA RESERVA</p>
        <h3 className="text-lg font-bold leading-snug">Resumo do agendamento</h3>
      </div>

      <div className="px-6 pb-4 space-y-3">
        <SummaryRow
          label="Especialidade"
          value={service ? (member?.especialidade ?? professional.especialidade) : undefined}
        />
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

      <div className="mx-5 rounded-xl px-4 py-3 mb-5" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: brand }}>
            VALOR TOTAL
          </span>
          {service ? (
            <span className="text-xl font-black">{fmt(service.preco)}</span>
          ) : (
            <span className="font-bold text-sm opacity-30">——</span>
          )}
        </div>
      </div>

      <div className="px-5 space-y-3 pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5">NOME COMPLETO</p>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como está no RG"
            className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5">CELULAR / WHATSAPP</p>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5">
            E-MAIL <span className="normal-case font-normal opacity-70">(opcional)</span>
          </p>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="para envio de confirmação"
            type="email"
            className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          />
        </div>
      </div>

      {error && (
        <p className="mx-5 mb-3 rounded-lg bg-rose-500/20 px-3 py-2 text-xs text-rose-200">{error}</p>
      )}

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
                : "Preencha nome e telefone"}
          </p>
        )}

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
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h2 className="text-xl font-black text-slate-900">Agendamento confirmado!</h2>
      <p className="mt-2 text-sm text-slate-500">
        Olá, <strong>{phase.nome}</strong>! Sua consulta foi agendada com sucesso.
      </p>

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

      <div className="mt-5 rounded-xl border border-[#25d366]/30 bg-[#f0fdf4] px-4 py-3 text-left">
        <p className="text-xs font-semibold text-emerald-800 mb-1">
          📲 Confirme via WhatsApp e receba o lembrete
        </p>
        <p className="text-[11px] text-emerald-700 mb-3 leading-snug">
          Envie os detalhes do agendamento para o consultório e guarde o comprovante na sua conversa.
        </p>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
          style={{ background: "#25d366" }}
        >
          <MessageCircle className="h-4 w-4" />
          Confirmar no WhatsApp
        </a>
      </div>

      <div className="mt-3 flex flex-col gap-3">
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
  colors,
  onSelect,
}: {
  professional: ProfessionalPublic;
  brand: string;
  colors: ColorPalette;
  onSelect: (member: ClinicMember) => void;
}) {
  const members = professional.members ?? [];

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white shadow-sm ${colors.badge}`}
        >
          01
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900">Escolha o profissional</h2>
          <p className="text-xs text-slate-400 mt-0.5">Selecione o especialista desejado</p>
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
            const { Icon, bg, color } = ICON_PALETTE[idx % ICON_PALETTE.length];

            return (
              <button
                key={member.id}
                onClick={() => onSelect(member)}
                className="group flex flex-col text-left bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-lg transition-all duration-200 w-full"
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
                    style={{ background: bg }}
                  >
                    <Icon className="h-6 w-6" style={{ color }} />
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
  colors,
  onBack,
  onSelect,
}: {
  member: ClinicMember;
  brand: string;
  colors: ColorPalette;
  onBack: () => void;
  onSelect: (svc: Service) => void;
}) {
  const activeServices = member.services.filter((s) => s.ativo);
  const memberBrand = member.corMarca ?? brand;

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-5 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 transition"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar aos profissionais
      </button>

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
            {member.nomeCompleto.split(" ").slice(0, 2).map((n) => n[0]).join("")}
          </div>
        )}
        <div>
          <p className="font-bold text-slate-900">{member.nomeCompleto}</p>
          <p className="text-xs mt-0.5" style={{ color: memberBrand }}>{member.especialidade}</p>
          {member.bio && (
            <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">{member.bio}</p>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 mb-6">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white shadow-sm ${colors.badge}`}
        >
          02
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900">Escolha a especialidade</h2>
          <p className="text-xs text-slate-400 mt-0.5">Selecione o serviço desejado</p>
        </div>
      </div>

      {activeServices.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          Nenhum serviço disponível no momento.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {activeServices.map((svc, idx) => (
            <ServiceCard key={svc.id} svc={svc} idx={idx} brand={memberBrand} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── WhatsApp URL helper ──────────────────────────────────────────────────────

function buildWhatsAppUrl(
  professional: ProfessionalPublic,
  phase: Extract<Phase, { tag: "confirmado" }>,
): string {
  const rawPhone = phase.member?.telefoneWhatsapp ?? professional.telefoneWhatsapp;
  const phone = rawPhone?.replace(/\D/g, "");
  const recipientName = phase.member?.nomeCompleto ?? professional.nomeCompleto;
  const msg = [
    `Olá, ${recipientName}! 👋`,
    ``,
    `Gostaria de *confirmar* meu agendamento:`,
    ``,
    `📋 *Serviço:* ${phase.service.nome}`,
    `👤 *Paciente:* ${phase.nome}`,
    `📅 *Data:* ${fmtDate(phase.date)}`,
    `⏰ *Horário:* ${phase.slot}`,
    `⏱️ *Duração:* ${phase.service.duracaoMinutos} min`,
    `💰 *Valor:* ${fmt(phase.service.preco)}`,
    ``,
    `Agendado via MediClin 🩺`,
  ].join("\n");
  const base = phone ? `https://wa.me/${phone}` : `https://wa.me`;
  return `${base}?text=${encodeURIComponent(msg)}`;
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
