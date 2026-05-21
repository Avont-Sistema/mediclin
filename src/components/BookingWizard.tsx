import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar } from "./ui/calendar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ChevronLeft, Clock, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { fetchAvailableDays, fetchAvailableSlots, createBooking } from "../lib/availability";
import type { InferSelectModel } from "drizzle-orm";
import type { services } from "../db/schema";

type Service = InferSelectModel<typeof services>;

interface BookingWizardProps {
  professionalId: string;
  service: Service;
  professionalNome: string;
  onBack: () => void;
}

type Step = "data" | "hora" | "paciente" | "confirmado";

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function formatCurrency(v: string | number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function BookingWizard({
  professionalId,
  service,
  professionalNome,
  onBack,
}: BookingWizardProps) {
  const [step, setStep] = useState<Step>("data");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const { data: availableDays = [] } = useQuery({
    queryKey: ["availableDays", professionalId],
    queryFn: () => fetchAvailableDays({ data: { professionalId } }),
  });

  const { data: slots = [], isFetching: loadingSlots } = useQuery({
    queryKey: ["slots", professionalId, selectedDate ? toDateStr(selectedDate) : null],
    enabled: !!selectedDate,
    queryFn: () =>
      fetchAvailableSlots({
        data: {
          professionalId,
          dateStr: toDateStr(selectedDate!),
          duracaoMinutos: service.duracaoMinutos,
        },
      }),
  });

  const booking = useMutation({
    mutationFn: () =>
      createBooking({
        data: {
          professionalId,
          serviceId: service.id,
          dateStr: toDateStr(selectedDate!),
          timeSlot: selectedSlot!,
          duracaoMinutos: service.duracaoMinutos,
          patient: { nome, email, telefone },
        },
      }),
    onSuccess: (result) => {
      setAppointmentId(result.appointmentId);
      setStep("confirmado");
    },
  });

  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);

  const isDisabledDay = (day: Date) => {
    if (day < today) return true;
    return !availableDays.includes(day.getDay());
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Resumo do serviço */}
      <div className="rounded-xl bg-teal-50 border border-teal-100 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-teal-500 grid place-items-center shrink-0">
          <Clock className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="font-medium text-slate-900">{service.nome}</div>
          <div className="text-sm text-slate-500 mt-0.5">
            {service.duracaoMinutos} min · {formatCurrency(service.preco)}
          </div>
          {service.descricao && (
            <div className="text-sm text-slate-500 mt-1">{service.descricao}</div>
          )}
        </div>
      </div>

      {/* Step: Escolher data */}
      {step === "data" && (
        <div>
          <h3 className="text-base font-semibold text-slate-900 mb-4">Escolha uma data</h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => {
              setSelectedDate(d);
              setSelectedSlot(null);
            }}
            disabled={isDisabledDay}
            fromDate={today}
            toDate={maxDate}
            className="rounded-xl border border-slate-200 bg-white p-3 w-full"
          />
          <Button
            className="mt-4 w-full bg-teal-600 hover:bg-teal-700"
            disabled={!selectedDate}
            onClick={() => setStep("hora")}
          >
            Continuar
          </Button>
        </div>
      )}

      {/* Step: Escolher horário */}
      {step === "hora" && (
        <div>
          <button
            onClick={() => setStep("data")}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"
          >
            <ChevronLeft className="h-4 w-4" /> {selectedDate && formatDate(selectedDate)}
          </button>
          <h3 className="text-base font-semibold text-slate-900 mb-4">Escolha um horário</h3>
          {loadingSlots ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Nenhum horário disponível neste dia.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2.5 text-sm font-medium rounded-lg border transition ${
                    selectedSlot === slot
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
          <Button
            className="mt-4 w-full bg-teal-600 hover:bg-teal-700"
            disabled={!selectedSlot}
            onClick={() => setStep("paciente")}
          >
            Continuar
          </Button>
        </div>
      )}

      {/* Step: Dados do paciente */}
      {step === "paciente" && (
        <div>
          <button
            onClick={() => setStep("hora")}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            {selectedDate && formatDate(selectedDate)} às {selectedSlot}
          </button>
          <h3 className="text-base font-semibold text-slate-900 mb-4">Seus dados</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Maria Silva"
                className="mt-1"
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
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone / WhatsApp</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="+55 11 99999-9999"
                className="mt-1"
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 space-y-1">
            <div className="font-medium text-slate-800">Resumo</div>
            <div>
              {service.nome} com {professionalNome}
            </div>
            <div>
              {selectedDate && formatDate(selectedDate)} às {selectedSlot}
            </div>
            <div className="font-semibold text-slate-900">{formatCurrency(service.preco)}</div>
          </div>

          {booking.error && (
            <p className="mt-3 text-sm text-rose-600">Erro ao agendar. Tente novamente.</p>
          )}

          <Button
            className="mt-4 w-full bg-teal-600 hover:bg-teal-700"
            disabled={!nome || !email || !telefone || booking.isPending}
            onClick={() => booking.mutate()}
          >
            {booking.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Confirmando...
              </>
            ) : (
              "Confirmar agendamento"
            )}
          </Button>
        </div>
      )}

      {/* Step: Confirmado */}
      {step === "confirmado" && (
        <div className="flex flex-col items-center text-center py-6 gap-4">
          <div className="h-16 w-16 rounded-full bg-teal-50 grid place-items-center">
            <CheckCircle2 className="h-8 w-8 text-teal-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Agendamento confirmado!</h3>
            <p className="text-sm text-slate-500 mt-1">
              Você receberá uma confirmação no e-mail <strong>{email}</strong>.
            </p>
          </div>
          <div className="w-full rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-left text-slate-700 space-y-1">
            <div className="font-medium text-slate-900">{service.nome}</div>
            <div>
              {selectedDate && formatDate(selectedDate)} às {selectedSlot}
            </div>
            <div>{professionalNome}</div>
          </div>
          <button onClick={onBack} className="text-sm text-teal-600 hover:underline">
            Voltar ao perfil
          </button>
        </div>
      )}
    </div>
  );
}
