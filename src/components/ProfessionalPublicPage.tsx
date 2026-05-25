import { useState, useEffect } from "react";
import {
  MapPin,
  MessageCircle,
  Phone,
  Mail,
  Instagram,
  Award,
  GraduationCap,
  Sparkles,
  Stethoscope,
  Check,
  ChevronRight,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { BookingWizard } from "./BookingWizard";
import type { InferSelectModel } from "drizzle-orm";
import type { professionals, services, professionalCards } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProfessionalCard = InferSelectModel<typeof professionalCards>;
export type ProfessionalService = InferSelectModel<typeof services>;
export type ProfessionalPublic = InferSelectModel<typeof professionals> & {
  services: ProfessionalService[];
  cards: ProfessionalCard[];
};

interface Props {
  professional: ProfessionalPublic;
  homeUrl?: string;
}

// Mapa estático de classes Tailwind por cor primária — necessário porque o Tailwind
// faz tree-shaking de classes que não aparecem como strings literais no código.
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
  rose: {
    text: "text-rose-600",
    bgGradient: "from-rose-500 to-rose-700",
    bgSoft: "bg-rose-50",
    badge: "bg-rose-600",
  },
  indigo: {
    text: "text-indigo-600",
    bgGradient: "from-indigo-500 to-indigo-700",
    bgSoft: "bg-indigo-50",
    badge: "bg-indigo-600",
  },
  amber: {
    text: "text-amber-600",
    bgGradient: "from-amber-500 to-amber-700",
    bgSoft: "bg-amber-50",
    badge: "bg-amber-600",
  },
} as const;

type ColorKey = keyof typeof COLOR_MAP;

function getColors(cor: string | null): (typeof COLOR_MAP)[ColorKey] {
  return COLOR_MAP[(cor ?? "teal") as ColorKey] ?? COLOR_MAP.teal;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(v: string | number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/**
 * Renderiza a headline destacando a palavra-chave (headlineDestaque) na cor primária.
 * Ex: headline="Cuidando a Saúde com Odontologia!" + destaque="Odontologia"
 *     → "Cuidando a Saúde com <span>Odontologia</span>!"
 */
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

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfessionalPublicPage({ professional, homeUrl = "/" }: Props) {
  const [selectedService, setSelectedService] = useState<ProfessionalService | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("booking") === "success") {
      setBookingSuccess(true);
      window.history.replaceState({}, "", homeUrl);
    }
  }, [homeUrl]);

  const colors = getColors(professional.corPrimaria);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <main className="mx-auto max-w-md px-4 pt-6">
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

        {/* ── Profile Header Card ─────────────────────────────────────────── */}
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 mb-4 text-center">
          {/* Foto circular grande */}
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

          {/* Nome + Especialidade */}
          <h1 className="text-base font-semibold text-slate-900">
            {professional.nomeCompleto}
          </h1>
          <p className={`text-sm ${colors.text} mt-0.5`}>{professional.especialidade}</p>

          {/* Headline (frase de impacto) */}
          {professional.headline && (
            <h2 className="mt-5 text-2xl font-extrabold leading-tight text-slate-900 tracking-tight">
              {renderHeadline(professional.headline, professional.headlineDestaque, colors.text)}
            </h2>
          )}

          {/* Bio (max 2 linhas) */}
          {professional.bio && (
            <p className="mt-3 text-sm text-slate-500 leading-relaxed line-clamp-2">
              {professional.bio}
            </p>
          )}
        </section>

        {/* ── Cards Grid ──────────────────────────────────────────────────── */}
        {professional.cards.length > 0 && (
          <section className="grid grid-cols-2 gap-3 mb-6">
            {professional.cards.map((card) => (
              <CardItem key={card.id} card={card} colors={colors} />
            ))}
          </section>
        )}

        {/* ── Services ────────────────────────────────────────────────────── */}
        {professional.services.length > 0 && (
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <span
                className={`grid size-7 place-items-center rounded-full ${colors.badge} text-xs font-bold text-white`}
              >
                01
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Escolha a especialidade</h3>
                <p className="text-xs text-slate-500">Comece selecionando o cuidado desejado</p>
              </div>
            </div>

            <div className="space-y-3">
              {professional.services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  colors={colors}
                  onClick={() => setSelectedService(service)}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Booking sheet */}
      <Sheet open={!!selectedService} onOpenChange={(open) => !open && setSelectedService(null)}>
        <SheetContent side="bottom" className="h-[92dvh] rounded-t-2xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left text-base">Agendar consulta</SheetTitle>
          </SheetHeader>
          {selectedService && (
            <BookingWizard
              professionalId={professional.id}
              service={selectedService}
              professionalNome={professional.nomeCompleto}
              mpEnabled={professional.mpAccountAtivo}
              onBack={() => setSelectedService(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Card Item ────────────────────────────────────────────────────────────────

type ColorPalette = (typeof COLOR_MAP)[ColorKey];

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

// ─── Service Card ─────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  colors,
  onClick,
}: {
  service: ProfessionalService;
  colors: ColorPalette;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:shadow-md group"
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-500 shrink-0`}
        >
          <Stethoscope className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm">{service.nome}</p>
          {service.descricao && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{service.descricao}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">
              A partir de{" "}
              <span className={`${colors.text} font-bold text-sm`}>
                {formatCurrency(service.preco)}
              </span>
            </p>
            <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-500" />
          </div>
        </div>
      </div>
    </button>
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
