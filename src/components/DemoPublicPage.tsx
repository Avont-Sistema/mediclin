import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  GraduationCap,
  MessageCircle,
  MapPin,
  Award,
  Instagram,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  CheckCircle2,
  Star,
  Video,
} from "lucide-react";
import {
  addDays,
  format,
  startOfWeek,
  isSameDay,
  isWeekend,
  isBefore,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Dados fictícios ──────────────────────────────────────────────────────────

const PROFESSIONAL = {
  nome: "Dra. Ana Beatriz Santos",
  especialidade: "Psicologia Clínica",
  registro: "CRP 06/123456",
  uf: "SP",
  bio: "Especialista em saúde mental com foco em ansiedade, depressão e desenvolvimento pessoal. Atendimento presencial e online.",
  headline: "Cuidado especializado para a sua saúde mental.",
  initials: "AB",
};

type Modalidade = "Presencial" | "Teleconsulta" | "Ambos";

type Service = {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  duracaoMinutos: number;
  modalidade: Modalidade;
};

const SERVICES: Service[] = [
  {
    id: "s1",
    nome: "Consulta Inicial",
    descricao: "Primeira sessão de avaliação e definição do plano terapêutico personalizado.",
    preco: 180,
    duracaoMinutos: 60,
    modalidade: "Ambos",
  },
  {
    id: "s2",
    nome: "Sessão de Psicoterapia",
    descricao: "Sessão individual de psicoterapia cognitivo-comportamental.",
    preco: 150,
    duracaoMinutos: 50,
    modalidade: "Ambos",
  },
  {
    id: "s3",
    nome: "Avaliação Psicológica",
    descricao: "Avaliação completa com laudos e relatórios para fins profissionais ou escolares.",
    preco: 250,
    duracaoMinutos: 90,
    modalidade: "Presencial",
  },
];

const INFO_CARDS = [
  { icon: GraduationCap, title: "Especialização", value: "Psicologia Clínica" },
  { icon: Award, title: "Registro", value: "CRP 06/123456" },
  { icon: Star, title: "Avaliação", value: "4,9 ⭐ (127 avaliações)" },
  { icon: MapPin, title: "Consultório", value: "Jardins, São Paulo — SP" },
  { icon: MessageCircle, title: "Atendimento", value: "Presencial e Online" },
  { icon: Instagram, title: "Instagram", value: "@dra.anabeatriz" },
];

const TIME_SLOTS = ["09:00", "09:50", "11:00", "14:00", "15:00", "16:00"];

// Slots que parecem "ocupados" para dar realismo
const BUSY_SLOTS = new Set(["09:50", "15:00"]);

type Phase = "servicos" | "data" | "hora" | "confirmando";

function formatPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatModalidade(m: Modalidade) {
  if (m === "Ambos") return "Presencial ou Online";
  return m;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function ServiceCard({
  service,
  selected,
  onSelect,
}: {
  service: Service;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
        selected
          ? "border-teal-500 bg-teal-50/60 ring-2 ring-teal-200"
          : "border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 h-5 w-5 rounded-full border-2 grid place-items-center shrink-0 transition-colors ${
            selected ? "border-teal-500 bg-teal-500" : "border-slate-300"
          }`}
        >
          {selected && <Check className="h-3 w-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{service.nome}</p>
            <p className="text-sm font-bold text-teal-700 shrink-0">{formatPreco(service.preco)}</p>
          </div>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{service.descricao}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="h-3 w-3" />
              {service.duracaoMinutos} min
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              {service.modalidade === "Teleconsulta" || service.modalidade === "Ambos" ? (
                <Video className="h-3 w-3" />
              ) : (
                <MapPin className="h-3 w-3" />
              )}
              {formatModalidade(service.modalidade)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function MiniCalendar({
  selectedDate,
  onSelect,
}: {
  selectedDate: Date | null;
  onSelect: (d: Date) => void;
}) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = startOfDay(new Date());

  const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800 capitalize">
          {format(weekStart, "MMMM yyyy", { locale: ptBR })}
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            disabled={isBefore(addDays(weekStart, -1), today)}
            className="h-7 w-7 rounded-lg border border-slate-200 grid place-items-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="h-7 w-7 rounded-lg border border-slate-200 grid place-items-center text-slate-500 hover:bg-slate-50 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dayLabels.map((l) => (
          <div key={l} className="text-[10px] text-center text-slate-400 font-medium pb-1">
            {l}
          </div>
        ))}
        {days.map((day, i) => {
          const isPast = isBefore(startOfDay(day), today);
          const isWe = isWeekend(day);
          const isSel = selectedDate ? isSameDay(day, selectedDate) : false;
          const isToday = isSameDay(day, today);
          const disabled = isPast || isWe;

          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onSelect(day)}
              className={`aspect-square rounded-xl text-xs font-medium transition-all ${
                isSel
                  ? "bg-teal-600 text-white shadow-sm"
                  : isToday
                    ? "bg-teal-50 text-teal-700 border border-teal-300"
                    : disabled
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-slate-700 hover:bg-slate-100"
              } ${isWe && !isPast ? "text-rose-300" : ""}`}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function DemoPublicPage() {
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("servicos");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleConfirm() {
    setConfirming(true);
    setTimeout(() => {
      void navigate({
        to: "/demo-pagamento",
        search: {
          servico: selectedService?.nome ?? "",
          horario: selectedSlot ?? "",
          data: selectedDate ? format(selectedDate, "dd/MM/yyyy") : "",
          preco: String(selectedService?.preco ?? 0),
        },
      });
    }, 800);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header da página pública */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <img src="/logo-icon.png" alt="CuidandoVC" className="h-5 w-5 rounded object-contain" />
            <span className="text-xs text-slate-500 font-medium">CuidandoVC</span>
          </div>
          <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
            Demo
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 grid place-items-center text-white text-2xl font-black shadow-md">
            {PROFESSIONAL.initials}
          </div>
          <h1 className="text-xl font-black text-slate-900">{PROFESSIONAL.nome}</h1>
          <p className="text-sm text-teal-600 font-semibold mt-1">{PROFESSIONAL.especialidade}</p>
          <p className="text-sm font-bold text-slate-700 mt-3 leading-snug">
            {PROFESSIONAL.headline}
          </p>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">{PROFESSIONAL.bio}</p>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {INFO_CARDS.map((card, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
            >
              <div className="h-7 w-7 shrink-0 rounded-lg bg-teal-50 grid place-items-center">
                <card.icon className="h-3.5 w-3.5 text-teal-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 leading-none">{card.title}</p>
                <p className="text-xs font-semibold text-slate-800 leading-tight truncate">
                  {card.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Wizard */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Breadcrumb */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            {(["servicos", "data", "hora"] as Phase[]).map((p, i) => {
              const labels = ["Serviço", "Data", "Horário"];
              const current = phase === p;
              const done =
                (p === "servicos" && (phase === "data" || phase === "hora" || phase === "confirmando")) ||
                (p === "data" && (phase === "hora" || phase === "confirmando"));
              return (
                <div key={p} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
                  <button
                    onClick={() => {
                      if (done) setPhase(p);
                    }}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition ${
                      current
                        ? "bg-teal-600 text-white"
                        : done
                          ? "bg-teal-100 text-teal-700 hover:bg-teal-200"
                          : "text-slate-400"
                    }`}
                  >
                    {done && <CheckCircle2 className="h-3 w-3" />}
                    {labels[i]}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-6">
            {/* Phase: serviços */}
            {phase === "servicos" && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-700 mb-4">
                  Escolha o tipo de atendimento:
                </p>
                {SERVICES.map((s) => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    selected={selectedService?.id === s.id}
                    onSelect={() => setSelectedService(s)}
                  />
                ))}
                <button
                  disabled={!selectedService}
                  onClick={() => setPhase("data")}
                  className="mt-4 w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm flex items-center justify-center gap-2"
                >
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Phase: data */}
            {phase === "data" && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-700">Escolha a data:</p>
                <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />
                <p className="text-[11px] text-slate-400">
                  Fins de semana indisponíveis. Dias em vermelho = sem atendimento.
                </p>
                <button
                  disabled={!selectedDate}
                  onClick={() => setPhase("hora")}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm flex items-center justify-center gap-2"
                >
                  {selectedDate
                    ? `Ver horários — ${format(selectedDate, "dd/MM", { locale: ptBR })}`
                    : "Selecione uma data"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Phase: hora */}
            {phase === "hora" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Escolha o horário:</p>
                  {selectedDate && (
                    <p className="text-xs text-slate-500 capitalize">
                      {format(selectedDate, "EEEE, dd/MM", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const busy = BUSY_SLOTS.has(slot);
                    const sel = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        disabled={busy}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                          busy
                            ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed line-through"
                            : sel
                              ? "border-teal-500 bg-teal-50 text-teal-700 ring-2 ring-teal-200"
                              : "border-slate-200 text-slate-700 hover:border-teal-300 hover:bg-teal-50/40"
                        }`}
                      >
                        {slot}
                        {busy && <span className="block text-[10px] mt-0.5">Ocupado</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Resumo */}
                {selectedSlot && selectedService && selectedDate && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5 text-sm">
                    <p className="font-semibold text-slate-800">Resumo do agendamento</p>
                    <div className="flex justify-between text-slate-600">
                      <span>Serviço</span>
                      <span className="font-medium">{selectedService.nome}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Data</span>
                      <span className="font-medium capitalize">
                        {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Horário</span>
                      <span className="font-medium">{selectedSlot}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Duração</span>
                      <span className="font-medium">{selectedService.duracaoMinutos} min</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                      <span>Total</span>
                      <span className="text-teal-700">{formatPreco(selectedService.preco)}</span>
                    </div>
                  </div>
                )}

                <button
                  disabled={!selectedSlot || confirming}
                  onClick={handleConfirm}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm flex items-center justify-center gap-2"
                >
                  {confirming ? (
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Ir para o pagamento
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
