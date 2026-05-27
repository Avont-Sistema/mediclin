import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, CalendarDays, Clock, User, Phone, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { listServices } from "../lib/services";
import { createManualBooking } from "../lib/agenda";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatPrice(price: string | number): string {
  return Number(price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── NovoAgendamentoModal ─────────────────────────────────────────────────────

export function NovoAgendamentoModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();

  // Form state
  const [serviceId, setServiceId] = useState("");
  const [dateStr, setDateStr] = useState(todayStr());
  const [timeSlot, setTimeSlot] = useState("");
  const [patientNome, setPatientNome] = useState("");
  const [patientTelefone, setPatientTelefone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [step, setStep] = useState<"form" | "success">("form");
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setServiceId("");
      setDateStr(todayStr());
      setTimeSlot("");
      setPatientNome("");
      setPatientTelefone("");
      setPatientEmail("");
      setStep("form");
      setCreatedId(null);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => listServices(),
    enabled: open,
  });

  const selectedService = services.find((s) => s.id === serviceId);

  const mutation = useMutation({
    mutationFn: () =>
      createManualBooking({
        data: {
          serviceId,
          dateStr,
          timeSlot,
          patientNome: patientNome.trim(),
          patientTelefone: patientTelefone.trim(),
          patientEmail: patientEmail.trim() || "",
        },
      }),
    onSuccess: ({ appointmentId }) => {
      setCreatedId(appointmentId);
      setStep("success");
      // Invalidate agenda and dashboard queries so they refresh
      void queryClient.invalidateQueries({ queryKey: ["agendaWeek"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
    },
  });

  const isValid =
    serviceId.length > 0 &&
    dateStr.length > 0 &&
    timeSlot.length > 0 &&
    patientNome.trim().length >= 2 &&
    patientTelefone.trim().length >= 8;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Novo agendamento</h2>
              <p className="text-xs text-slate-500 mt-0.5">Agende manualmente para um paciente</p>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {step === "success" ? (
            <SuccessView
              patientNome={patientNome}
              dateStr={dateStr}
              timeSlot={timeSlot}
              service={selectedService}
              onClose={onClose}
              onNew={() => setStep("form")}
            />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isValid) mutation.mutate();
              }}
            >
              <div className="px-6 py-5 space-y-5">
                {/* Serviço */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Serviço *
                  </label>
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  >
                    <option value="">Selecione um serviço…</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} — {formatPrice(s.preco)} · {s.duracaoMinutos}min
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data + Hora */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      <CalendarDays className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                      Data *
                    </label>
                    <input
                      type="date"
                      value={dateStr}
                      min={todayStr()}
                      onChange={(e) => setDateStr(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                      Horário *
                    </label>
                    <input
                      type="time"
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
                    />
                  </div>
                </div>

                {/* Divisor */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                    Paciente
                  </span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* Nome */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    <User className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                    Nome completo *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: João da Silva"
                    value={patientNome}
                    onChange={(e) => setPatientNome(e.target.value)}
                    required
                    minLength={2}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  />
                </div>

                {/* Telefone + Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      <Phone className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                      WhatsApp / Telefone *
                    </label>
                    <input
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={patientTelefone}
                      onChange={(e) => setPatientTelefone(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      <Mail className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                      E-mail <span className="font-normal text-slate-400">(opcional)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="paciente@email.com"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
                    />
                  </div>
                </div>

                {/* Error */}
                {mutation.isError && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                    {mutation.error instanceof Error
                      ? mutation.error.message
                      : "Ocorreu um erro. Tente novamente."}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">Campos marcados com * são obrigatórios</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-200 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!isValid || mutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Agendando…
                      </>
                    ) : (
                      "Confirmar agendamento"
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

// ─── SuccessView ──────────────────────────────────────────────────────────────

function SuccessView({
  patientNome,
  dateStr,
  timeSlot,
  service,
  onClose,
  onNew,
}: {
  patientNome: string;
  dateStr: string;
  timeSlot: string;
  service: { nome: string; preco: string | number; duracaoMinutos: number } | undefined;
  onClose: () => void;
  onNew: () => void;
}) {
  return (
    <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
      <div className="h-16 w-16 rounded-full bg-emerald-100 grid place-items-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900">Agendamento confirmado!</h3>
        <p className="text-sm text-slate-500 mt-1">
          Consulta criada com sucesso para{" "}
          <span className="font-medium text-slate-700">{patientNome}</span>.
        </p>
      </div>

      {service && (
        <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-left space-y-2 text-sm">
          <Row label="Serviço" value={service.nome} />
          <Row label="Data" value={formatDateBR(dateStr)} />
          <Row label="Horário" value={timeSlot} />
          <Row label="Duração" value={`${service.duracaoMinutos} min`} />
          <Row label="Valor" value={formatPrice(service.preco)} />
        </div>
      )}

      <div className="flex items-center gap-3 mt-2 w-full">
        <button
          onClick={onNew}
          className="flex-1 py-2.5 text-sm font-medium text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-100 transition"
        >
          + Novo agendamento
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 transition shadow-sm"
        >
          Concluir
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
