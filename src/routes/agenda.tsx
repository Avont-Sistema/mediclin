import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/tanstack-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Stethoscope,
  Phone,
} from "lucide-react";
import { z } from "zod";
import { DashboardLayout } from "../components/DashboardLayout";
import { fetchAgendaWeek, updateAppointmentStatus, getMonday, addDays } from "../lib/agenda";
import type { AgendaAppointment } from "../lib/agenda";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda — MediClin" }] }),
  validateSearch: z.object({ week: z.string().optional() }),
  component: AgendaPage,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayMonday(): string {
  return getMonday(new Date());
}

const STATUS_STYLE = {
  aguardando_pagamento: {
    label: "Aguardando pagamento",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  confirmado: {
    label: "Confirmado",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  concluido: {
    label: "Concluído",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  cancelado: {
    label: "Cancelado",
    bg: "bg-rose-50",
    text: "text-rose-600",
    dot: "bg-rose-400",
  },
  no_show: {
    label: "No-show",
    bg: "bg-slate-50",
    text: "text-slate-500",
    dot: "bg-slate-400",
  },
} as const;

type DBStatus = keyof typeof STATUS_STYLE;

function toHHMM(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDayHeader(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" });
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split("T")[0];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AgendaPage() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <AgendaContent />
      </SignedIn>
    </>
  );
}

function AgendaContent() {
  const { week: searchWeek } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [selectedAppt, setSelectedAppt] = useState<AgendaAppointment | null>(null);

  const weekStart = searchWeek ?? todayMonday();

  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["agendaWeek", weekStart],
    queryFn: () => fetchAgendaWeek({ data: { weekStart } }),
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({
      appointmentId,
      status,
    }: {
      appointmentId: string;
      status: "confirmado" | "concluido" | "cancelado" | "no_show";
    }) => updateAppointmentStatus({ data: { appointmentId, status } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["agendaWeek", weekStart] });
      setSelectedAppt(null);
    },
  });

  const goWeek = (delta: number) => {
    const newWeek = addDays(weekStart, delta * 7);
    void navigate({ search: { week: newWeek } });
  };

  // Build 7 day keys
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group appointments by date
  const byDay = new Map<string, AgendaAppointment[]>();
  for (const appt of appointments ?? []) {
    const key = new Date(appt.inicio).toISOString().split("T")[0];
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(appt);
  }

  const weekLabel = (() => {
    const [y, m, d] = weekStart.split("-").map(Number);
    const from = new Date(y, m - 1, d);
    const to = new Date(y, m - 1, d + 6);
    return `${from.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${to.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
  })();

  return (
    <DashboardLayout>
      {/* Topbar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="px-6 py-4 flex items-center gap-4">
          <div className="h-9 w-9 rounded-xl bg-slate-100 grid place-items-center">
            <CalendarDays className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Agenda</h1>
            <p className="text-xs text-slate-500">{weekLabel}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => goWeek(-1)}
              className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => void navigate({ search: { week: todayMonday() } })}
              className="px-3 h-8 text-xs font-medium rounded-lg hover:bg-slate-100 text-slate-600 transition"
            >
              Hoje
            </button>
            <button
              onClick={() => goWeek(1)}
              className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-600"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-4">
        {isLoading ? (
          <div className="text-center py-16 text-sm text-slate-400">Carregando agenda...</div>
        ) : (
          days.map((dayStr) => {
            const dayAppts = byDay.get(dayStr) ?? [];
            const today = isToday(dayStr);
            return (
              <div key={dayStr}>
                <div
                  className={`flex items-center gap-2 mb-2 ${today ? "text-teal-700" : "text-slate-500"}`}
                >
                  <h2
                    className={`text-sm font-semibold capitalize ${today ? "text-teal-700" : "text-slate-700"}`}
                  >
                    {formatDayHeader(dayStr)}
                  </h2>
                  {today && (
                    <span className="text-[10px] font-medium bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">
                      Hoje
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {dayAppts.length > 0 ? `${dayAppts.length} consulta(s)` : "Sem consultas"}
                  </span>
                </div>

                {dayAppts.length === 0 ? (
                  <div
                    className={`rounded-xl border border-dashed py-4 text-center text-xs text-slate-400 ${today ? "border-teal-200 bg-teal-50/30" : "border-slate-200"}`}
                  >
                    Dia livre
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayAppts.map((appt) => {
                      const st = STATUS_STYLE[appt.status as DBStatus] ?? STATUS_STYLE.confirmado;
                      const isSelected = selectedAppt?.id === appt.id;
                      return (
                        <div
                          key={appt.id}
                          className={`rounded-xl border bg-white transition ${
                            isSelected
                              ? "border-teal-300 shadow-md"
                              : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                          }`}
                        >
                          {/* Card header */}
                          <button
                            onClick={() => setSelectedAppt(isSelected ? null : appt)}
                            className="w-full flex items-center gap-4 px-5 py-3 text-left"
                          >
                            <div className="flex flex-col items-center min-w-[48px]">
                              <span className="text-sm font-bold text-slate-900">
                                {toHHMM(new Date(appt.inicio))}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {appt.service.duracaoMinutos} min
                              </span>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 grid place-items-center text-xs font-semibold text-slate-700 shrink-0">
                              {appt.patient.nome
                                .split(" ")
                                .slice(0, 2)
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {appt.patient.nome}
                              </p>
                              <p className="text-xs text-slate-500 truncate">{appt.service.nome}</p>
                            </div>
                            <span
                              className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                              {st.label}
                            </span>
                          </button>

                          {/* Expanded detail */}
                          {isSelected && (
                            <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-slate-600">
                                  <User className="h-4 w-4 text-slate-400" />
                                  {appt.patient.nome}
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Phone className="h-4 w-4 text-slate-400" />
                                  {appt.patient.telefone}
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Stethoscope className="h-4 w-4 text-slate-400" />
                                  {appt.service.nome}
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Clock className="h-4 w-4 text-slate-400" />
                                  {toHHMM(new Date(appt.inicio))} – {toHHMM(new Date(appt.fim))}
                                </div>
                              </div>

                              {/* Action buttons */}
                              {appt.status !== "concluido" &&
                                appt.status !== "cancelado" &&
                                appt.status !== "no_show" && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      disabled={statusMutation.isPending}
                                      onClick={() =>
                                        statusMutation.mutate({
                                          appointmentId: appt.id,
                                          status: "concluido",
                                        })
                                      }
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Concluir
                                    </button>
                                    <button
                                      disabled={statusMutation.isPending}
                                      onClick={() =>
                                        statusMutation.mutate({
                                          appointmentId: appt.id,
                                          status: "no_show",
                                        })
                                      }
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-60 transition"
                                    >
                                      <AlertTriangle className="h-3.5 w-3.5" />
                                      No-show
                                    </button>
                                    <button
                                      disabled={statusMutation.isPending}
                                      onClick={() =>
                                        statusMutation.mutate({
                                          appointmentId: appt.id,
                                          status: "cancelado",
                                        })
                                      }
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60 transition"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      Cancelar
                                    </button>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
