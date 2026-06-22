import { useState, useEffect } from "react";
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
  CalendarOff,
  X,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

function msgFromError(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  const e = err as Record<string, unknown>;
  if (typeof e.message === "string") return e.message;
  return fallback;
}
import { Calendar as CalendarPicker } from "./ui/calendar";
import {
  fetchAvailableDays,
  fetchAvailableSlots,
  createConsecutiveBookings,
  confirmCashBooking,
  fetchAppointmentsPublic,
  lookupReturningPatient,
} from "../lib/availability";
import { fetchBlockedDates } from "../lib/folga";
import { createMPPreference, createCartMPPreference } from "../lib/mercadopago";
import { PaymentMethodScreen } from "./PaymentMethodScreen";
import type { InferSelectModel } from "drizzle-orm";
import type { professionals, services, professionalCards } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type Service = InferSelectModel<typeof services>;

type SelectedService = { service: Service; member?: ClinicMember };

export type ProfessionalCard = InferSelectModel<typeof professionalCards>;

export type ClinicMember = InferSelectModel<typeof professionals> & {
  services: Service[];
};

export type ProfessionalPublic = InferSelectModel<typeof professionals> & {
  services: Service[];
  cards: ProfessionalCard[];
  members?: ClinicMember[];
  // Modo Free (teste encerrado): página limitada a identidade + cards.
  modoFree?: boolean;
};

interface Props {
  professional: ProfessionalPublic;
  homeUrl?: string;
}

type Phase =
  | { tag: "idle" }
  | { tag: "servicos"; member: ClinicMember }
  | { tag: "data"; services: SelectedService[] }
  | { tag: "hora"; services: SelectedService[]; date: Date }
  | {
      tag: "pagamento";
      services: SelectedService[];
      date: Date;
      slot: string;
      nome: string;
      meetLink?: string | null;
      modalidade?: "presencial" | "online";
      appointmentIds: string[];
      metodos: string[];
    }
  | { tag: "aguardando"; appointmentIds: string[] }
  | {
      tag: "confirmado";
      services: SelectedService[];
      date: Date;
      slot: string;
      nome: string;
      meetLink?: string | null;
      modalidade?: "presencial" | "online";
      via?: "convenio";
      convenioPlano?: string;
    };

// Modalidade efetiva = resolve "ambos" pela escolha do paciente
type Modalidade = "presencial" | "online";
function resolveModalidade(svc: Service, escolha: Modalidade): Modalidade {
  if (svc.modalidade === "online") return "online";
  if (svc.modalidade === "presencial") return "presencial";
  return escolha; // "ambos" → escolha do paciente
}
const MOD_LABEL: Record<string, string> = {
  presencial: "Presencial",
  online: "Atendimento Virtual",
  ambos: "Presencial ou Virtual",
};

// ─── Static Tailwind color map ─────────────────────────────────────────────────

const COLOR_MAP = {
  teal: {
    text: "text-teal-600",
    bgGradient: "from-teal-500 to-teal-700",
    bgSoft: "bg-teal-50",
    badge: "bg-teal-600",
  },
  emerald: {
    text: "text-emerald-600",
    bgGradient: "from-emerald-500 to-emerald-700",
    bgSoft: "bg-emerald-50",
    badge: "bg-emerald-600",
  },
  cyan: {
    text: "text-cyan-600",
    bgGradient: "from-cyan-500 to-cyan-700",
    bgSoft: "bg-cyan-50",
    badge: "bg-cyan-600",
  },
  sky: {
    text: "text-sky-600",
    bgGradient: "from-sky-500 to-sky-700",
    bgSoft: "bg-sky-50",
    badge: "bg-sky-600",
  },
  blue: {
    text: "text-blue-600",
    bgGradient: "from-blue-500 to-blue-700",
    bgSoft: "bg-blue-50",
    badge: "bg-blue-600",
  },
  indigo: {
    text: "text-indigo-600",
    bgGradient: "from-indigo-500 to-indigo-700",
    bgSoft: "bg-indigo-50",
    badge: "bg-indigo-600",
  },
  violet: {
    text: "text-violet-600",
    bgGradient: "from-violet-500 to-violet-700",
    bgSoft: "bg-violet-50",
    badge: "bg-violet-600",
  },
  purple: {
    text: "text-purple-600",
    bgGradient: "from-purple-500 to-purple-700",
    bgSoft: "bg-purple-50",
    badge: "bg-purple-600",
  },
  fuchsia: {
    text: "text-fuchsia-600",
    bgGradient: "from-fuchsia-500 to-fuchsia-700",
    bgSoft: "bg-fuchsia-50",
    badge: "bg-fuchsia-600",
  },
  pink: {
    text: "text-pink-600",
    bgGradient: "from-pink-500 to-pink-700",
    bgSoft: "bg-pink-50",
    badge: "bg-pink-600",
  },
  rose: {
    text: "text-rose-600",
    bgGradient: "from-rose-500 to-rose-700",
    bgSoft: "bg-rose-50",
    badge: "bg-rose-600",
  },
  orange: {
    text: "text-orange-600",
    bgGradient: "from-orange-500 to-orange-700",
    bgSoft: "bg-orange-50",
    badge: "bg-orange-600",
  },
  amber: {
    text: "text-amber-600",
    bgGradient: "from-amber-500 to-amber-700",
    bgSoft: "bg-amber-50",
    badge: "bg-amber-600",
  },
  yellow: {
    text: "text-yellow-600",
    bgGradient: "from-yellow-500 to-yellow-700",
    bgSoft: "bg-yellow-50",
    badge: "bg-yellow-600",
  },
  lime: {
    text: "text-lime-600",
    bgGradient: "from-lime-500 to-lime-700",
    bgSoft: "bg-lime-50",
    badge: "bg-lime-600",
  },
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

// ─── Main Page (wrapper) ──────────────────────────────────────────────────────
// Decide entre a página completa (booking) e a versão Free (só identidade+cards).
// O branch fica num wrapper sem hooks para respeitar as regras dos Hooks.

export function ProfessionalPublicPage(props: Props) {
  if (props.professional.modoFree) {
    return <FreePublicPage professional={props.professional} />;
  }
  return <BookingPublicPage {...props} />;
}

function BookingPublicPage({ professional, homeUrl = "/" }: Props) {
  const brand = professional.corMarca ?? "#0d9488";
  const colors = getColors(professional.corPrimaria);

  const [phase, setPhase] = useState<Phase>({ tag: "idle" });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [modalidadeEscolhida, setModalidadeEscolhida] = useState<Modalidade>("presencial");
  const [usaConvenio, setUsaConvenio] = useState(false);
  const [convenioPlano, setConvenioPlano] = useState("");
  const [convenioCarteirinha, setConvenioCarteirinha] = useState("");

  // Serviços selecionados (multi-select na tela de serviços)
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);

  const isClinic = professional.plano === "clinic" && (professional.members?.length ?? 0) > 0;

  // Reconhece paciente recorrente: ao digitar o telefone, se já houver vínculo
  // com este profissional, preenche o nome automaticamente (sem sobrescrever o
  // que o paciente já tiver digitado). Debounce de 600ms.
  useEffect(() => {
    const digits = telefone.replace(/\D/g, "");
    if (digits.length < 10 || nome.trim().length > 0) return;
    const member = "member" in phase ? phase.member : undefined;
    const targetId = member?.id ?? professional.id;
    const handle = setTimeout(() => {
      lookupReturningPatient({ data: { professionalId: targetId, telefone: digits } })
        .then((res) => {
          if (res?.nome) setNome((cur) => (cur.trim().length === 0 ? res.nome : cur));
        })
        .catch(() => {
          /* silencioso — recurso opcional */
        });
    }, 600);
    return () => clearTimeout(handle);
  }, [telefone, nome, phase, professional.id]);

  // Detecta redirect de volta do MP após pagamento e reconstrói a tela correta.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const effectiveStatus = params.get("collection_status") ?? params.get("status");
    const externalRef = params.get("external_reference");
    const bookingParam = params.get("booking");

    function idsFromRef(ref: string): string[] {
      return ref.startsWith("cart:") ? ref.slice(5).split("|").filter(Boolean) : [ref];
    }

    function resolveFromAppts(appts: Awaited<ReturnType<typeof fetchAppointmentsPublic>>) {
      if (!appts || appts.length === 0) return false;
      const first = appts[0];
      const inicio = new Date(first.inicio);
      const slot = `${String(inicio.getHours()).padStart(2, "0")}:${String(inicio.getMinutes()).padStart(2, "0")}`;
      setPhase({
        tag: "confirmado",
        services: appts.map((a) => ({ service: a.service })),
        date: inicio,
        slot,
        nome: first.patient.nome,
        meetLink: first.meetLink ?? null,
        modalidade: (first.modalidade as "presencial" | "online") ?? "presencial",
      });
      sessionStorage.removeItem("mp_pending_ids");
      return true;
    }

    // Limpa a URL para não repetir no refresh
    const cleanUrl = () => window.history.replaceState({}, "", window.location.pathname);

    // Cenário 1: MP aprovou (cartão crédito/débito aprovado na hora)
    if (effectiveStatus === "approved" && externalRef) {
      cleanUrl();
      const ids = idsFromRef(externalRef);
      if (ids.length > 0) {
        fetchAppointmentsPublic({ data: { ids } })
          .then((appts) => {
            if (!resolveFromAppts(appts)) setBookingSuccess(true);
          })
          .catch(() => setBookingSuccess(true));
      }
      return;
    }

    // Cenário 2: MP redirecionou com status pendente (PIX aguardando confirmação)
    if (effectiveStatus === "pending" || bookingParam === "pending") {
      cleanUrl();
      const ids = externalRef
        ? idsFromRef(externalRef)
        : (() => {
            try {
              return JSON.parse(sessionStorage.getItem("mp_pending_ids") ?? "[]") as string[];
            } catch {
              return [] as string[];
            }
          })();
      if (ids.length > 0) {
        setPhase({ tag: "aguardando", appointmentIds: ids });
      }
      return;
    }

    // Cenário 3: Usuário voltou sem params de URL mas tem IDs salvos (fechou MP e voltou)
    const savedIds = sessionStorage.getItem("mp_pending_ids");
    if (savedIds) {
      try {
        const ids = JSON.parse(savedIds) as string[];
        if (ids.length > 0) setPhase({ tag: "aguardando", appointmentIds: ids });
      } catch {
        sessionStorage.removeItem("mp_pending_ids");
      }
    }
  }, []);

  // Polling para confirmar pagamento enquanto está na tela "aguardando"
  useEffect(() => {
    if (phase.tag !== "aguardando") return;
    const ids = phase.appointmentIds;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const appts = await fetchAppointmentsPublic({ data: { ids } });
        if (cancelled || !appts || appts.length === 0) return;
        const allConfirmed = appts.every((a) => a.status === "confirmado");
        if (allConfirmed) {
          sessionStorage.removeItem("mp_pending_ids");
          const first = appts[0];
          const inicio = new Date(first.inicio);
          const slot = `${String(inicio.getHours()).padStart(2, "0")}:${String(inicio.getMinutes()).padStart(2, "0")}`;
          setPhase({
            tag: "confirmado",
            services: appts.map((a) => ({ service: a.service })),
            date: inicio,
            slot,
            nome: first.patient.nome,
            meetLink: first.meetLink ?? null,
            modalidade: (first.modalidade as "presencial" | "online") ?? "presencial",
          });
        }
      } catch {
        // ignora erros de polling
      }
    };

    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.tag]);

  const mpMutation = useMutation({
    mutationFn: (vars: { appointmentId: string; metodo: "credito" | "debito" | "pix" }) =>
      createMPPreference({ data: vars }),
    onSuccess: ({ url }, variables) => {
      sessionStorage.setItem("mp_pending_ids", JSON.stringify([variables.appointmentId]));
      window.location.href = url;
    },
    onError: (err) => {
      toast.error(msgFromError(err, "Erro ao processar pagamento. Tente novamente."));
    },
  });

  const cartMPMutation = useMutation({
    mutationFn: (vars: { appointmentIds: string[]; metodo: "credito" | "debito" | "pix" }) =>
      createCartMPPreference({ data: vars }),
    onSuccess: ({ url }, variables) => {
      sessionStorage.setItem("mp_pending_ids", JSON.stringify(variables.appointmentIds));
      window.location.href = url;
    },
    onError: (err) => {
      toast.error(msgFromError(err, "Erro ao processar pagamento. Tente novamente."));
    },
  });

  const cashMutation = useMutation({
    mutationFn: async (appointmentIds: string[]) => {
      await Promise.all(
        appointmentIds.map((id) => confirmCashBooking({ data: { appointmentId: id } })),
      );
    },
    onSuccess: () => {
      setPhase((p) =>
        p.tag === "pagamento"
          ? {
              tag: "confirmado",
              services: p.services,
              date: p.date,
              slot: p.slot,
              nome: p.nome,
              meetLink: p.meetLink,
              modalidade: p.modalidade,
            }
          : p,
      );
    },
    onError: (err) => {
      toast.error(msgFromError(err, "Erro ao confirmar agendamento. Tente novamente."));
    },
  });

  const bookingMutation = useMutation({
    mutationFn: () => {
      if (phase.tag !== "hora" || !selectedSlot) throw new Error("Dados incompletos");
      const firstMember = phase.services[0]?.member;
      const targetId = firstMember?.id ?? professional.id;
      const firstSvc = phase.services[0].service;
      const modalidade = resolveModalidade(firstSvc, modalidadeEscolhida);
      return createConsecutiveBookings({
        data: {
          professionalId: targetId,
          services: phase.services.map((ss) => ({
            serviceId: ss.service.id,
            duracaoMinutos: ss.service.duracaoMinutos,
          })),
          dateStr: toDateStr(phase.date),
          startTimeSlot: selectedSlot,
          modalidade,
          patient: { nome, email, telefone },
          convenioInfo:
            usaConvenio && convenioPlano.trim()
              ? { planoNome: convenioPlano.trim(), carteirinha: convenioCarteirinha.trim() || undefined }
              : undefined,
        },
      });
    },
    onError: (err) => {
      toast.error(msgFromError(err, "Erro ao criar agendamento. Tente novamente."));
    },
    onSuccess: (result) => {
      if (phase.tag !== "hora" || !selectedSlot) return;
      const firstSvc = phase.services[0].service;
      const firstMember = phase.services[0]?.member;
      const modalidade = resolveModalidade(firstSvc, modalidadeEscolhida);
      const meetLink =
        modalidade === "online" ? (firstMember?.meetLink ?? professional.meetLink) : null;

      if (usaConvenio) {
        setPhase({
          tag: "confirmado",
          services: phase.services,
          date: phase.date,
          slot: selectedSlot,
          nome,
          meetLink,
          modalidade,
          via: "convenio",
          convenioPlano: convenioPlano.trim(),
        });
        return;
      }


      const metodos = (professional.metodosPagamento ?? []).filter(
        (m) => m === "dinheiro" || professional.mpAccountAtivo,
      );
      if (metodos.length > 0) {
        setPhase({
          tag: "pagamento",
          services: phase.services,
          date: phase.date,
          slot: selectedSlot,
          nome,
          meetLink,
          modalidade,
          appointmentIds: result.appointmentIds,
          metodos,
        });
      } else {
        setPhase({
          tag: "confirmado",
          services: phase.services,
          date: phase.date,
          slot: selectedSlot,
          nome,
          meetLink,
          modalidade,
        });
      }
    },
  });

  const canConfirm =
    phase.tag === "hora" &&
    !!selectedSlot &&
    nome.trim().length >= 2 &&
    telefone.trim().length >= 8 &&
    (!usaConvenio || convenioPlano.trim().length >= 2);

  const isConfirming =
    bookingMutation.isPending || mpMutation.isPending || cartMPMutation.isPending;

  const handleConfirm = () => {
    if (canConfirm && !isConfirming) bookingMutation.mutate();
  };

  const handleReset = () => {
    sessionStorage.removeItem("mp_pending_ids");
    setPhase({ tag: "idle" });
    setSelectedSlot(null);
    setNome("");
    setEmail("");
    setTelefone("");
    setModalidadeEscolhida("presencial");
    setUsaConvenio(false);
    setConvenioPlano("");
    setConvenioCarteirinha("");
    setSelectedServices([]);
    bookingMutation.reset();
    mpMutation.reset();
    cashMutation.reset();
    cartMPMutation.reset();
  };

  const handleToggleService = (svc: Service, member?: ClinicMember) => {
    setSelectedServices((prev) => {
      const exists = prev.some((ss) => ss.service.id === svc.id);
      return exists
        ? prev.filter((ss) => ss.service.id !== svc.id)
        : [...prev, { service: svc, member }];
    });
  };

  const handleContinueToDate = () => {
    if (selectedServices.length === 0) return;
    setSelectedSlot(null);
    setModalidadeEscolhida("presencial");
    setPhase({ tag: "data", services: selectedServices });
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
              {renderHeadline(professional.headline, professional.headlineDestaque, colors.text)}
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

      {/* ── Booking Section ──────────────────────────────────────────── */}
      <section id="booking" className="mx-auto max-w-4xl px-4 lg:px-8">
        {phase.tag === "confirmado" && (
          <SuccessScreen
            phase={phase}
            professional={professional}
            onReset={handleReset}
            brand={brand}
          />
        )}

        {phase.tag === "aguardando" && <AguardandoScreen onReset={handleReset} brand={brand} />}

        {phase.tag === "pagamento" &&
          (() => {
            const total = phase.services.reduce((s, ss) => s + Number(ss.service.preco), 0);
            const serviceLabel =
              phase.services.length === 1
                ? phase.services[0].service.nome
                : `${phase.services.length} serviços`;
            const isSingle = phase.appointmentIds.length === 1;
            return (
              <PaymentMethodScreen
                professionalNome={professional.nomeCompleto}
                serviceNome={serviceLabel}
                valor={total}
                dataLabel={`${phase.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })} às ${phase.slot}`}
                metodos={phase.metodos}
                onlinePending={isSingle ? mpMutation.isPending : cartMPMutation.isPending}
                cashPending={cashMutation.isPending}
                onPickOnline={(metodo) =>
                  isSingle
                    ? mpMutation.mutate({ appointmentId: phase.appointmentIds[0], metodo })
                    : cartMPMutation.mutate({ appointmentIds: phase.appointmentIds, metodo })
                }
                onPickCash={() => cashMutation.mutate(phase.appointmentIds)}
                onBack={handleReset}
              />
            );
          })()}

        {isClinic && phase.tag === "idle" && (
          <ClinicTeamSection
            professional={professional}
            brand={brand}
            colors={colors}
            onSelect={(member) => setPhase({ tag: "servicos", member })}
          />
        )}

        {phase.tag !== "confirmado" &&
          phase.tag !== "aguardando" &&
          phase.tag !== "pagamento" &&
          !(isClinic && phase.tag === "idle") && (
            <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
              <div>
                {isClinic && phase.tag === "servicos" && (
                  <ClinicMemberServicesSection
                    member={phase.member}
                    brand={brand}
                    colors={colors}
                    onBack={() => setPhase({ tag: "idle" })}
                    onSelect={(svc) => {
                      setSelectedSlot(null);
                      setPhase({ tag: "data", services: [{ service: svc, member: phase.member }] });
                    }}
                  />
                )}

                {!isClinic && phase.tag === "idle" && (
                  <ServicesSection
                    professional={professional}
                    brand={brand}
                    colors={colors}
                    selectedServices={selectedServices}
                    onToggle={(svc) => handleToggleService(svc)}
                    onContinue={handleContinueToDate}
                  />
                )}

                {phase.tag === "data" && (
                  <StepDate
                    professionalId={phase.services[0]?.member?.id ?? professional.id}
                    services={phase.services}
                    brand={brand}
                    onBack={() => setPhase({ tag: "idle" })}
                    onNext={(date) => setPhase({ tag: "hora", services: phase.services, date })}
                  />
                )}

                {phase.tag === "hora" && (
                  <StepTime
                    professionalId={phase.services[0]?.member?.id ?? professional.id}
                    services={phase.services}
                    date={phase.date}
                    selectedSlot={selectedSlot}
                    brand={brand}
                    onBack={() => setPhase({ tag: "data", services: phase.services })}
                    onSelectSlot={(slot) => setSelectedSlot(slot)}
                  />
                )}
              </div>

              <div className="lg:sticky lg:top-6">
                <SummaryPanel
                  phase={phase}
                  selectedSlot={selectedSlot}
                  professional={professional}
                  brand={brand}
                  nome={nome}
                  setNome={setNome}
                  email={email}
                  setEmail={setEmail}
                  telefone={telefone}
                  setTelefone={setTelefone}
                  modalidade={modalidadeEscolhida}
                  setModalidade={setModalidadeEscolhida}
                  usaConvenio={usaConvenio}
                  setUsaConvenio={setUsaConvenio}
                  convenioPlano={convenioPlano}
                  setConvenioPlano={setConvenioPlano}
                  convenioCarteirinha={convenioCarteirinha}
                  setConvenioCarteirinha={setConvenioCarteirinha}
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
            CuidandoVC
          </a>{" "}
          · Agendamento online seguro
        </p>
      </footer>
    </div>
  );
}

// ─── Free Public Page ─────────────────────────────────────────────────────────
// Modo Free (teste encerrado): só identidade do médico + cards de contato.
// Sem serviços, agenda, pagamento ou checkout. Logo CUIDANDOVC grande no rodapé.

function FreePublicPage({ professional }: { professional: ProfessionalPublic }) {
  const colors = getColors(professional.corPrimaria);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="mx-auto max-w-md px-4 pt-8">
        {/* Profile card */}
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 mb-4 text-center">
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

          <h1 className="text-base font-semibold text-slate-900">{professional.nomeCompleto}</h1>
          <p className={`text-sm ${colors.text} mt-0.5`}>{professional.especialidade}</p>

          {professional.headline && (
            <h2 className="mt-5 text-2xl font-extrabold leading-tight text-slate-900 tracking-tight">
              {renderHeadline(professional.headline, professional.headlineDestaque, colors.text)}
            </h2>
          )}

          {professional.bio && (
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">{professional.bio}</p>
          )}
        </section>

        {/* Cards grid (contato, localização, redes) */}
        {professional.cards.length > 0 && (
          <section className="grid grid-cols-2 gap-3 mb-10">
            {professional.cards.map((card) => (
              <CardItem key={card.id} card={card} colors={colors} />
            ))}
          </section>
        )}

        {/* Logo CUIDANDOVC grande */}
        <div className="mt-12 flex flex-col items-center gap-2">
          <a href="/" className="flex items-center gap-2 opacity-90 transition hover:opacity-100">
            <img src="/logo-icon.png" alt="CuidandoVC" className="h-9 w-9 object-contain" />
            <span className="text-2xl font-extrabold tracking-tight text-slate-800">
              CuidandoVC
            </span>
          </a>
          <p className="text-xs text-slate-400">Crie sua página de agendamentos grátis</p>
        </div>
      </div>
    </div>
  );
}

// ─── Card Item ─────────────────────────────────────────────────────────────────

function CardItem({ card, colors }: { card: ProfessionalCard; colors: ColorPalette }) {
  const config = getCardConfig(card, colors);

  const content = (
    <div className="flex items-start gap-2.5">
      <div
        className={`grid size-9 place-items-center rounded-xl ${config.iconBg} ${config.iconColor} shrink-0`}
      >
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
      return {
        Icon: GraduationCap,
        iconBg: colors.bgSoft,
        iconColor: colors.text,
        href: undefined,
      };
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
      return {
        Icon: MapPin,
        iconBg: "bg-rose-50",
        iconColor: "text-rose-500",
        href: card.valor ?? undefined,
      };
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
      return {
        Icon: Sparkles,
        iconBg: "bg-slate-50",
        iconColor: "text-slate-400",
        href: undefined,
      };
  }
}

// ─── ServicesSection ──────────────────────────────────────────────────────────

function ServicesSection({
  professional,
  brand,
  colors,
  selectedServices,
  onToggle,
  onContinue,
}: {
  professional: ProfessionalPublic;
  brand: string;
  colors: ColorPalette;
  selectedServices: SelectedService[];
  onToggle: (s: Service) => void;
  onContinue: () => void;
}) {
  const total = selectedServices.reduce((s, ss) => s + Number(ss.service.preco), 0);

  return (
    <div id="servicos">
      <div className="flex items-start gap-3 mb-6">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white shadow-sm ${colors.badge}`}
        >
          01
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900">Escolha os serviços</h2>
          <p className="text-xs text-slate-400 mt-0.5">Selecione um ou mais serviços desejados</p>
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
              isSelected={selectedServices.some((ss) => ss.service.id === svc.id)}
              onSelect={onToggle}
            />
          ))}
        </div>
      )}

      {selectedServices.length > 0 && (
        <div className="mt-4 rounded-2xl bg-slate-900 text-white p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400">
              {selectedServices.length} serviço{selectedServices.length !== 1 ? "s" : ""}{" "}
              selecionado{selectedServices.length !== 1 ? "s" : ""}
            </p>
            <p className="text-lg font-black mt-0.5">{fmt(total)}</p>
          </div>
          <button
            onClick={onContinue}
            className="shrink-0 rounded-xl bg-white text-slate-900 px-4 py-2.5 text-sm font-bold hover:bg-slate-100 transition flex items-center gap-1.5"
          >
            Continuar <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  svc,
  idx,
  brand,
  isSelected = false,
  onSelect,
}: {
  svc: Service;
  idx: number;
  brand: string;
  isSelected?: boolean;
  onSelect: (s: Service) => void;
}) {
  const { Icon, bg, color } = ICON_PALETTE[idx % ICON_PALETTE.length];

  return (
    <button
      onClick={() => onSelect(svc)}
      className="relative group flex flex-col text-left bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-200"
      style={
        isSelected
          ? { border: `2px solid ${brand}`, boxShadow: `0 0 0 3px ${brand}22` }
          : { border: "1px solid #f1f5f9" }
      }
    >
      {isSelected && (
        <div
          className="absolute top-2 right-2 h-5 w-5 rounded-full grid place-items-center"
          style={{ background: brand }}
        >
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
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
      <span className="mt-2 inline-flex w-fit items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
        {svc.modalidade === "online"
          ? "💻 Virtual"
          : svc.modalidade === "ambos"
            ? "🏥 + 💻"
            : "🏥 Presencial"}
      </span>
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
  services,
  brand,
  onBack,
  onNext,
}: {
  professionalId: string;
  services: SelectedService[];
  brand: string;
  onBack: () => void;
  onNext: (date: Date) => void;
}) {
  const [selected, setSelected] = useState<Date | undefined>();

  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);

  const { data: availableDays = [] } = useQuery({
    queryKey: ["availableDays", professionalId],
    queryFn: () => fetchAvailableDays({ data: { professionalId } }),
  });

  const { data: blockedDatesData = [] } = useQuery({
    queryKey: ["blockedDates", professionalId],
    queryFn: () =>
      fetchBlockedDates({
        data: {
          professionalId,
          fromDate: toDateStr(today),
          toDate: toDateStr(maxDate),
        },
      }),
  });

  // Map dateStr → motivo para lookup rápido
  const blockedMap = new Map<string, string | null>(
    blockedDatesData.map((b) => [b.dateStr, b.motivo]),
  );

  // Date[] para o modificador visual do calendário
  const blockedCalendarDates = blockedDatesData.map((b) => {
    const [y, m, d] = b.dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  });

  const selectedDateStr = selected ? toDateStr(selected) : null;
  const isSelectedBlocked = selectedDateStr ? blockedMap.has(selectedDateStr) : false;
  const blockedMotivo = selectedDateStr ? (blockedMap.get(selectedDateStr) ?? null) : null;

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
            {services.length === 1 ? (
              <>
                <strong className="text-slate-600">{services[0].service.nome}</strong>
              </>
            ) : (
              <>{services.length} serviços selecionados</>
            )}
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

      <div className="space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex justify-center py-4 px-2">
            <CalendarPicker
              mode="single"
              selected={selected}
              onSelect={setSelected}
              disabled={isDisabled}
              fromDate={today}
              toDate={maxDate}
              showOutsideDays={false}
              className="[--cell-size:2.25rem]"
              modifiers={{ blocked: blockedCalendarDates }}
              modifiersStyles={{
                blocked: {
                  backgroundColor: "#fff1f2",
                  color: "#e11d48",
                  fontWeight: "700",
                  borderRadius: "6px",
                },
              }}
            />
          </div>
        </div>

        {/* Dia de folga selecionado: exibe mensagem do médico */}
        {isSelectedBlocked ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-rose-100 grid place-items-center shrink-0 mt-0.5">
              <CalendarOff className="h-4 w-4 text-rose-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-700">
                Profissional indisponível nesta data
              </p>
              {blockedMotivo ? (
                <p className="text-xs text-rose-500 mt-1 leading-relaxed">"{blockedMotivo}"</p>
              ) : (
                <p className="text-xs text-rose-400 mt-0.5">
                  Por favor, escolha outra data disponível.
                </p>
              )}
            </div>
          </div>
        ) : (
          <button
            disabled={!selected}
            onClick={() => selected && onNext(selected)}
            className="relative z-10 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-40"
            style={{ background: selected ? brand : "#94a3b8" }}
          >
            Continuar <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── StepTime ─────────────────────────────────────────────────────────────────

function StepTime({
  professionalId,
  services,
  date,
  selectedSlot,
  brand,
  onBack,
  onSelectSlot,
}: {
  professionalId: string;
  services: SelectedService[];
  date: Date;
  selectedSlot: string | null;
  brand: string;
  onBack: () => void;
  onSelectSlot: (slot: string) => void;
}) {
  const totalDuration = services.reduce((s, ss) => s + ss.service.duracaoMinutos, 0);

  const { data: slots = [], isFetching } = useQuery({
    queryKey: ["slots", professionalId, toDateStr(date), totalDuration],
    queryFn: () =>
      fetchAvailableSlots({
        data: { professionalId, dateStr: toDateStr(date), duracaoMinutos: totalDuration },
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
          <p className="text-xs text-slate-400 mt-0.5">
            {fmtDate(date)}
            {services.length > 1 && ` · ${totalDuration} min no total`}
          </p>
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

// ─── PatientFields ────────────────────────────────────────────────────────────
// Celular primeiro → lookup → preenche nome automaticamente se paciente recorrente.

function PatientFields({
  professionalId,
  nome,
  setNome,
  telefone,
  setTelefone,
  email,
  setEmail,
}: {
  professionalId: string;
  nome: string;
  setNome: (v: string) => void;
  telefone: string;
  setTelefone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
}) {
  const [nomeAutoPreenchido, setNomeAutoPreenchido] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    const digits = telefone.replace(/\D/g, "");
    if (digits.length < 8) {
      if (nomeAutoPreenchido) {
        setNome("");
        setNomeAutoPreenchido(false);
      }
      return;
    }
    const timer = setTimeout(async () => {
      setLookingUp(true);
      try {
        const result = await lookupReturningPatient({ data: { professionalId, telefone } });
        if (result) {
          setNome(result.nome);
          setNomeAutoPreenchido(true);
        } else if (nomeAutoPreenchido) {
          setNome("");
          setNomeAutoPreenchido(false);
        }
      } catch {
        // lookup silencioso — não bloqueia o checkout
      } finally {
        setLookingUp(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telefone]);

  return (
    <div className="px-5 space-y-3 pb-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          CELULAR / WHATSAPP
        </p>
        <div className="relative">
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 99999-9999"
            inputMode="tel"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
          />
          {lookingUp && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
          )}
        </div>
      </div>

      {nomeAutoPreenchido && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <p className="text-xs text-emerald-700">
            Olá, <strong>{nome}</strong>! Cadastro encontrado.
          </p>
        </div>
      )}

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          NOME COMPLETO
        </p>
        <input
          value={nome}
          onChange={(e) => { setNomeAutoPreenchido(false); setNome(e.target.value); }}
          placeholder="Como está no RG"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
        />
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          E-MAIL <span className="normal-case font-normal text-slate-300">(opcional)</span>
        </p>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="para envio de confirmação"
          type="email"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
        />
      </div>
    </div>
  );
}

// ─── SummaryPanel ─────────────────────────────────────────────────────────────

function SummaryPanel({
  phase,
  selectedSlot,
  professional,
  brand,
  nome,
  setNome,
  email,
  setEmail,
  telefone,
  setTelefone,
  modalidade,
  setModalidade,
  usaConvenio,
  setUsaConvenio,
  convenioPlano,
  setConvenioPlano,
  convenioCarteirinha,
  setConvenioCarteirinha,
  canConfirm,
  isConfirming,
  onConfirm,
  error,
}: {
  phase: Phase;
  selectedSlot: string | null;
  professional: ProfessionalPublic;
  brand: string;
  nome: string;
  setNome: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  telefone: string;
  setTelefone: (v: string) => void;
  modalidade: Modalidade;
  setModalidade: (v: Modalidade) => void;
  usaConvenio: boolean;
  setUsaConvenio: (v: boolean) => void;
  convenioPlano: string;
  setConvenioPlano: (v: string) => void;
  convenioCarteirinha: string;
  setConvenioCarteirinha: (v: string) => void;
  canConfirm: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  error?: string;
}) {
  const services = phase.tag === "data" || phase.tag === "hora" ? phase.services : [];
  const firstSvc = services[0]?.service ?? null;
  const date = phase.tag === "hora" ? phase.date : null;
  const slot = phase.tag === "hora" ? selectedSlot : null;
  const total = services.reduce((s, ss) => s + Number(ss.service.preco), 0);
  const efetiva = firstSvc ? resolveModalidade(firstSvc, modalidade) : "presencial";
  const virtualInfo = professional.atendimentoVirtualInfo;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
          SUA RESERVA
        </p>
        <h3 className="text-base font-bold text-slate-900">Resumo do agendamento</h3>
      </div>

      <div className="px-6 py-4 space-y-3 border-b border-slate-100">
        <SummaryRow label="Profissional" value={professional.nomeCompleto} />
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

        {/* Lista de serviços selecionados */}
        {services.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-1.5">
              {services.length === 1 ? "Serviço" : `Serviços (${services.length})`}
            </p>
            <ul className="space-y-1">
              {services.map((ss) => (
                <li key={ss.service.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {ss.service.nome}
                  </span>
                  <span className="text-xs text-slate-500 shrink-0">{fmt(ss.service.preco)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Modalidade — seletor quando o primeiro serviço aceita ambos */}
        {firstSvc && firstSvc.modalidade === "ambos" && services.length === 1 && (
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Tipo de atendimento</p>
            <div className="grid grid-cols-2 gap-2">
              {(["presencial", "online"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModalidade(m)}
                  className={`rounded-xl border py-2 text-xs font-semibold transition ${efetiva === m ? "border-transparent text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
                  style={efetiva === m ? { background: brand } : undefined}
                >
                  {m === "presencial" ? "🏥 Presencial" : "💻 Virtual"}
                </button>
              ))}
            </div>
          </div>
        )}
        {firstSvc && firstSvc.modalidade !== "ambos" && services.length === 1 && (
          <SummaryRow label="Atendimento" value={MOD_LABEL[firstSvc.modalidade]} />
        )}
        {firstSvc && efetiva === "online" && virtualInfo && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
            <p className="text-[11px] text-slate-500 leading-relaxed">{virtualInfo}</p>
          </div>
        )}
      </div>

      <div className="mx-5 my-4 rounded-xl px-4 py-3" style={{ backgroundColor: `${brand}18` }}>
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: brand }}
          >
            VALOR TOTAL
          </span>
          {services.length > 0 ? (
            <span className="text-xl font-black text-slate-900">{fmt(total)}</span>
          ) : (
            <span className="text-sm font-bold text-slate-300">——</span>
          )}
        </div>
      </div>

      <PatientFields
        professionalId={professional.id}
        nome={nome}
        setNome={setNome}
        telefone={telefone}
        setTelefone={setTelefone}
        email={email}
        setEmail={setEmail}
      />

      {phase.tag === "hora" && (
        <div className="px-5 pb-4">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={usaConvenio}
              onChange={(e) => setUsaConvenio(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-blue-600"
            />
            <span className="text-xs font-semibold text-slate-700">
              Vou pagar com plano de saúde / convênio
            </span>
          </label>

          {usaConvenio && (
            <div className="mt-3 space-y-2.5 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1.5">
                  NOME DO PLANO *
                </p>
                <input
                  value={convenioPlano}
                  onChange={(e) => setConvenioPlano(e.target.value)}
                  placeholder="Ex: Unimed, Bradesco Saúde, Amil..."
                  className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1.5">
                  Nº DA CARTEIRINHA{" "}
                  <span className="normal-case font-normal text-blue-400">(opcional)</span>
                </p>
                <input
                  value={convenioCarteirinha}
                  onChange={(e) => setConvenioCarteirinha(e.target.value)}
                  placeholder="Número impresso na carteirinha"
                  className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
              <p className="text-[11px] text-blue-600 leading-snug">
                O profissional verificará sua cobertura e confirmará o atendimento na consulta.
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mx-5 mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
          {error}
        </p>
      )}

      <div className="px-5 pb-6 space-y-2">
        <button
          disabled={!canConfirm || isConfirming}
          onClick={onConfirm}
          className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: brand }}
        >
          {isConfirming ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Confirmando...
            </span>
          ) : usaConvenio ? (
            <span className="flex items-center justify-center gap-2">
              <Shield className="h-4 w-4" /> Confirmar com convênio →
            </span>
          ) : professional.mpAccountAtivo ? (
            <span className="flex items-center justify-center gap-2">
              <CreditCard className="h-4 w-4" /> Ir para pagamento →
            </span>
          ) : (
            "Confirmar agendamento →"
          )}
        </button>

        {!canConfirm && phase.tag === "hora" && (
          <p className="text-center text-[11px] text-slate-400">
            {!selectedSlot ? "Selecione um horário" : "Preencha nome e telefone"}
          </p>
        )}

        <div className="mt-4 flex items-center justify-center gap-4 text-slate-400">
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
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      {value ? (
        <span className="text-xs font-semibold text-slate-900 text-right max-w-[60%] leading-snug">
          {value}
        </span>
      ) : (
        <span className="text-xs font-bold text-slate-200">——</span>
      )}
    </div>
  );
}

// ─── AguardandoScreen ─────────────────────────────────────────────────────────

function AguardandoScreen({ onReset, brand }: { onReset: () => void; brand: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
      <h2 className="text-xl font-black text-slate-900">Aguardando confirmação</h2>
      <p className="mt-2 text-sm text-slate-500">
        Seu pagamento está sendo processado. Esta página atualiza automaticamente quando confirmado
        — não é necessário fazer nada.
      </p>

      <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 px-5 py-4 text-left">
        <p className="text-xs font-semibold text-amber-800 mb-1">Se pagou via PIX:</p>
        <p className="text-[11px] text-amber-700 leading-snug">
          Após realizar o pagamento no seu banco, a confirmação pode levar alguns segundos. Mantenha
          esta página aberta.
        </p>
      </div>

      <button
        onClick={onReset}
        className="mt-6 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition"
        style={{ borderColor: `${brand}40` }}
      >
        Voltar ao início
      </button>
    </div>
  );
}

// ─── SuccessScreen ────────────────────────────────────────────────────────────

function computeConsecutiveTimes(startSlot: string, services: SelectedService[]): string[] {
  const times: string[] = [];
  let [h, m] = startSlot.split(":").map(Number);
  for (const ss of services) {
    times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    const totalM = h * 60 + m + ss.service.duracaoMinutos;
    h = Math.floor(totalM / 60);
    m = totalM % 60;
  }
  return times;
}

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
  const times = computeConsecutiveTimes(phase.slot, phase.services);
  const total = phase.services.reduce((s, ss) => s + Number(ss.service.preco), 0);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h2 className="text-xl font-black text-slate-900">
        {phase.services.length === 1 ? "Agendamento confirmado!" : "Agendamentos confirmados!"}
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Olá, <strong>{phase.nome}</strong>!{" "}
        {phase.services.length === 1 ? "Sua consulta foi" : "Seus agendamentos foram"} confirmado
        {phase.services.length !== 1 ? "s" : ""} com sucesso.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-600 mb-3">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {fmtDate(phase.date)}
        </div>
        {phase.services.map((ss, idx) => (
          <div
            key={ss.service.id}
            className="flex items-start justify-between gap-3 pb-2 border-b border-slate-100 last:border-0 last:pb-0"
          >
            <div>
              <p className="font-bold text-sm text-slate-900">{ss.service.nome}</p>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                <Clock className="h-3 w-3" />
                {times[idx]} · {ss.service.duracaoMinutos} min
              </div>
            </div>
            <span className="text-sm font-bold text-slate-700 shrink-0">
              {fmt(ss.service.preco)}
            </span>
          </div>
        ))}
        {phase.services.length > 1 && (
          <div className="flex justify-between pt-1">
            <span className="text-xs font-bold text-slate-500">Total</span>
            <span className="text-sm font-black text-slate-900">{fmt(total)}</span>
          </div>
        )}
      </div>

      {phase.via === "convenio" && (
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left">
          <p className="text-xs font-semibold text-blue-800 mb-1">
            🏥 Agendamento via plano de saúde
          </p>
          <p className="text-[11px] text-blue-700 leading-snug">
            Lembre-se de levar sua carteirinha
            {phase.convenioPlano ? ` do ${phase.convenioPlano}` : ""} na consulta. O profissional
            verificará sua cobertura e confirmará o atendimento no dia.
          </p>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-[#25d366]/30 bg-[#f0fdf4] px-4 py-3 text-left">
        <p className="text-xs font-semibold text-emerald-800 mb-1">
          📲 Confirme via WhatsApp e receba o lembrete
        </p>
        <p className="text-[11px] text-emerald-700 mb-3 leading-snug">
          Envie os detalhes do agendamento para o consultório e guarde o comprovante na sua
          conversa.
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
  const rawPhone = professional.telefoneWhatsapp;
  const phone = rawPhone?.replace(/\D/g, "");
  const recipientName = professional.nomeCompleto;
  const times = computeConsecutiveTimes(phase.slot, phase.services);
  const total = phase.services.reduce((s, ss) => s + Number(ss.service.preco), 0);

  const servicelines = phase.services
    .map((ss, idx) => `  • ${ss.service.nome} — ${times[idx]} (${ss.service.duracaoMinutos} min)`)
    .join("\n");

  const msg = [
    `Olá, ${recipientName}! 👋`,
    ``,
    `Gostaria de *confirmar* meu(s) agendamento(s):`,
    ``,
    `👤 *Paciente:* ${phase.nome}`,
    `📅 *Data:* ${fmtDate(phase.date)}`,
    ``,
    `📋 *Serviços:*`,
    servicelines,
    ``,
    ...(phase.via === "convenio" && phase.convenioPlano
      ? [`🏥 *Plano de saúde:* ${phase.convenioPlano}`, ``]
      : [`💰 *Valor total:* ${fmt(total)}`, ``]),
    `Agendado via CuidandoVC 🩺`,
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
