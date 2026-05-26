import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/tanstack-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Stethoscope,
  Phone,
  CalendarOff,
  Plus,
  Trash2,
  Search,
  Bell,
  X,
} from "lucide-react";
import { z } from "zod";
import { DashboardLayout } from "../components/DashboardLayout";
import { fetchAgendaWeek, updateAppointmentStatus, getMonday, addDays } from "../lib/agenda";
import type { AgendaAppointment } from "../lib/agenda";
import { listFolgas, removeFolga, type FolgaBlock } from "../lib/folga";
import { ModoFolgaModal } from "../components/ModoFolgaModal";
import { NovoAgendamentoModal } from "../components/NovoAgendamentoModal";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda — MediClin" }] }),
  validateSearch: z.object({ week: z.string().optional() }),
  component: AgendaPage,
});

// ─── Constants ────────────────────────────────────────────────────────────────

/** px height for one hour slot in the time grid */
const HOUR_HEIGHT = 64;
const START_HOUR = 8;   // matches reference (first visible row = 08:00)
const END_HOUR = 19;    // last label = 18:00
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT; // 11 * 64 = 704px
/** CSS grid template shared by header row + time-grid body */
const COL_TEMPLATE = "56px repeat(7, minmax(0, 1fr))";
const DAY_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  aguardando_pagamento: { label: "Aguardando", bg: "#fff7ed", border: "#f59e0b", text: "#b45309", dot: "#f59e0b" },
  confirmado:           { label: "Confirmado",  bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", dot: "#3b82f6" },
  concluido:            { label: "Concluído",   bg: "#f0fdf4", border: "#22c55e", text: "#15803d", dot: "#22c55e" },
  cancelado:            { label: "Cancelado",   bg: "#fff1f2", border: "#f43f5e", text: "#be123c", dot: "#f43f5e" },
  no_show:              { label: "No-show",     bg: "#f8fafc", border: "#94a3b8", text: "#64748b", dot: "#94a3b8" },
} as const;

type DBStatus = keyof typeof STATUS_CFG;
type UpdateStatus = "confirmado" | "concluido" | "cancelado" | "no_show";
type ViewMode = "semana" | "lista";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayMonday() { return getMonday(new Date()); }

function toHHMM(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split("T")[0];
}

function weekRangeLabel(weekStart: string) {
  const [y, m, d] = weekStart.split("-").map(Number);
  const from = new Date(y, m - 1, d);
  const to   = new Date(y, m - 1, d + 6);
  if (from.getMonth() === to.getMonth()) {
    return `Semana de ${from.getDate()} a ${to.getDate()} de ${from.toLocaleDateString("pt-BR", { month: "long" })}`;
  }
  return `Semana de ${from.getDate()} de ${from.toLocaleDateString("pt-BR", { month: "long" })} a ${to.getDate()} de ${to.toLocaleDateString("pt-BR", { month: "long" })}`;
}

function monthYearLabel(weekStart: string) {
  const [y, m, d] = weekStart.split("-").map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDayHeader(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AgendaPage() {
  return (
    <>
      <SignedOut><RedirectToSignIn /></SignedOut>
      <SignedIn><AgendaContent /></SignedIn>
    </>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────

function AgendaContent() {
  const { week: searchWeek } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [selectedAppt, setSelectedAppt] = useState<AgendaAppointment | null>(null);
  const [showFolga, setShowFolga] = useState(false);
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [view, setView] = useState<ViewMode>("semana");
  const [searchQuery, setSearchQuery] = useState("");

  const weekStart = searchWeek ?? todayMonday();
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["agendaWeek", weekStart],
    queryFn: () => fetchAgendaWeek({ data: { weekStart } }),
    staleTime: 30_000,
  });

  const { data: folgas = [] } = useQuery({
    queryKey: ["folgas"],
    queryFn: () => listFolgas(),
  });

  const blockedByDate = useMemo(() => {
    const map = new Map<string, FolgaBlock>();
    for (const f of folgas) {
      map.set(new Date(f.inicio).toISOString().split("T")[0], f);
    }
    return map;
  }, [folgas]);

  const removeFolgaMutation = useMutation({
    mutationFn: (blockId: string) => removeFolga({ data: { blockId } }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["folgas"] }); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ appointmentId, status }: { appointmentId: string; status: UpdateStatus }) =>
      updateAppointmentStatus({ data: { appointmentId, status } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["agendaWeek", weekStart] });
      setSelectedAppt(null);
    },
  });

  const goWeek = (delta: number) =>
    void navigate({ search: { week: addDays(weekStart, delta * 7) } });

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const byDay = useMemo(() => {
    const map = new Map<string, AgendaAppointment[]>();
    for (const appt of (appointments ?? [])) {
      const key = new Date(appt.inicio).toISOString().split("T")[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(appt);
    }
    return map;
  }, [appointments]);

  const filteredByDay = useMemo(() => {
    if (!searchQuery.trim()) return byDay;
    const q = searchQuery.toLowerCase();
    const out = new Map<string, AgendaAppointment[]>();
    for (const [day, appts] of byDay) {
      const m = appts.filter(a =>
        a.patient.nome.toLowerCase().includes(q) || a.service.nome.toLowerCase().includes(q)
      );
      if (m.length) out.set(day, m);
    }
    return out;
  }, [byDay, searchQuery]);

  const isPending = statusMutation.isPending || removeFolgaMutation.isPending;

  // shared toolbar props
  const toolbarProps = {
    weekStart,
    view,
    onPrev: () => goWeek(-1),
    onNext: () => goWeek(1),
    onToday: () => void navigate({ search: { week: todayMonday() } }),
    onViewChange: setView,
  };

  return (
    <DashboardLayout>
      {/* ── Sticky header: title · search · actions ──────────────────────── */}
      <header className="sticky top-14 lg:top-0 z-20 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3 px-4 lg:px-6 py-3">
          <div className="shrink-0">
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Agenda</h1>
            <p className="text-xs text-slate-500 hidden sm:block">{weekRangeLabel(weekStart)}</p>
          </div>

          <div className="flex-1 max-w-md mx-2 lg:mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar paciente, prontuário, exame..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-100 text-sm text-slate-700 placeholder:text-slate-400 border-0 outline-none focus:ring-2 focus:ring-teal-300 transition"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setShowFolga(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 text-xs font-semibold rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
            >
              <CalendarOff className="h-3.5 w-3.5" />
              Folga
            </button>
            <button className="relative h-9 w-9 grid place-items-center rounded-xl hover:bg-slate-100 text-slate-600 transition">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
            <button
              onClick={() => setShowNewAppt(true)}
              className="inline-flex items-center gap-1.5 px-3 lg:px-4 h-9 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo agendamento</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <div className="p-4 lg:p-6">
        {isLoading ? (
          <div className="text-center py-16 text-sm text-slate-400">Carregando agenda...</div>
        ) : view === "semana" ? (
          /* ── White card: toolbar + grid ─────────────────────────────── */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* toolbar inside the card */}
            <CalendarToolbar {...toolbarProps} />

            {/* Day header row */}
            <div className="border-b border-slate-200" style={{ display: "grid", gridTemplateColumns: COL_TEMPLATE }}>
              {/* HORA label */}
              <div className="h-[52px] border-r border-slate-100 flex items-end pb-2 px-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">HORA</span>
              </div>
              {/* Day columns */}
              {days.map(day => {
                const [y, m, d] = day.split("-").map(Number);
                const date = new Date(y, m - 1, d);
                const today = isToday(day);
                const folga = blockedByDate.get(day);
                return (
                  <div
                    key={day}
                    className={`h-[52px] border-r border-slate-100 last:border-r-0 flex flex-col items-center justify-center gap-0.5 ${folga ? "bg-rose-50/40" : ""}`}
                  >
                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${today ? "text-teal-600" : "text-slate-400"}`}>
                      {DAY_SHORT[date.getDay()]}
                    </span>
                    {today ? (
                      <span className="h-7 w-7 rounded-full bg-teal-500 flex items-center justify-center text-sm font-bold text-white leading-none">
                        {d}
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-slate-800 leading-none">{d}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time grid — flex para containing block confiável */}
            <div className="overflow-x-auto">
              <div className="flex min-w-[600px]" style={{ height: TOTAL_HEIGHT }}>
                {/* Hour labels — 56px fixo alinhado com o CSS Grid do header */}
                <div className="shrink-0 border-r border-slate-100 relative select-none" style={{ width: 56 }}>
                  {HOURS.map(hour => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 flex items-center justify-center"
                      style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    >
                      <span className="text-[11px] text-slate-400 tabular-nums leading-none">
                        {String(hour).padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {days.map(day => {
                  const appts = (filteredByDay.get(day) ?? []).sort(
                    (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
                  );
                  const folga = blockedByDate.get(day);
                  const today = isToday(day);

                  return (
                    <div
                      key={day}
                      className={`relative border-r border-slate-100 last:border-r-0 ${today ? "bg-teal-50/20" : ""}`}
                      style={{ flex: "1 1 0", minWidth: 0 }}
                    >
                      {/* Horizontal hour lines */}
                      {HOURS.map(hour => (
                        <div
                          key={hour}
                          className="absolute inset-x-0 border-b border-slate-100"
                          style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                        />
                      ))}

                      {/* Folga overlay */}
                      {folga && (
                        <div className="absolute inset-0 bg-rose-50/60 z-[2] flex flex-col items-center pt-6 gap-2 pointer-events-none">
                          <CalendarOff className="h-5 w-5 text-rose-300" />
                          <p className="text-[11px] font-medium text-rose-400">Folga</p>
                          {folga.motivo && (
                            <p className="text-[10px] text-rose-300 px-1 truncate max-w-[80px]">"{folga.motivo}"</p>
                          )}
                          <button
                            disabled={isPending}
                            onClick={() => removeFolgaMutation.mutate(folga.id)}
                            className="pointer-events-auto h-6 w-6 grid place-items-center rounded-full bg-rose-100 hover:bg-rose-200 text-rose-500 transition disabled:opacity-40"
                            title="Remover folga"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      {/* Appointment blocks — wrapper div absoluto + button w-full */}
                      {appts.map(appt => {
                        const start = new Date(appt.inicio);
                        const startMins = start.getHours() * 60 + start.getMinutes();
                        const topPx   = (startMins - START_HOUR * 60) * (HOUR_HEIGHT / 60);
                        const heightPx = Math.max(appt.service.duracaoMinutos * (HOUR_HEIGHT / 60), 26);
                        if (topPx < 0 || topPx >= TOTAL_HEIGHT) return null;
                        const cfg = STATUS_CFG[appt.status as DBStatus] ?? STATUS_CFG.confirmado;
                        const isSel = selectedAppt?.id === appt.id;
                        const actualHeight = Math.min(heightPx - 2, TOTAL_HEIGHT - topPx - 2);
                        return (
                          <div
                            key={appt.id}
                            style={{
                              position: "absolute",
                              top: topPx + 1,
                              left: 0,
                              right: 0,
                              width: "auto",
                              height: actualHeight,
                              zIndex: isSel ? 5 : 2,
                              padding: "0 1px",
                            }}
                          >
                            <button
                              onClick={() => setSelectedAppt(isSel ? null : appt)}
                              className="block w-full h-full rounded overflow-hidden text-left transition-all focus:outline-none hover:brightness-95 hover:shadow-md"
                              style={{
                                backgroundColor: cfg.bg,
                                borderLeft: `3px solid ${cfg.border}`,
                                outline: isSel ? `2px solid ${cfg.border}` : "none",
                                outlineOffset: 1,
                              }}
                            >
                              <div className="px-1.5 py-0.5 h-full overflow-hidden">
                                <p
                                  className="text-[11px] font-semibold leading-tight truncate"
                                  style={{
                                    color: cfg.text,
                                    textDecoration: appt.status === "cancelado" ? "line-through" : "none",
                                  }}
                                >
                                  {appt.patient.nome.split(" ")[0]} · {appt.service.nome}
                                </p>
                                {heightPx > 44 && (
                                  <p className="text-[10px] leading-tight opacity-70" style={{ color: cfg.text }}>
                                    {toHHMM(start)}
                                  </p>
                                )}
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ── Lista view ──────────────────────────────────────────────── */
          <>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 overflow-hidden">
              <CalendarToolbar {...toolbarProps} />
            </div>
            <ListView
              days={days}
              byDay={filteredByDay}
              blockedByDate={blockedByDate}
              selectedAppt={selectedAppt}
              onSelectAppt={setSelectedAppt}
              onUpdateStatus={(id, s) => statusMutation.mutate({ appointmentId: id, status: s })}
              onRemoveFolga={id => removeFolgaMutation.mutate(id)}
              isPending={isPending}
            />
          </>
        )}
      </div>

      {/* Appointment detail modal */}
      {selectedAppt && view === "semana" && (
        <ApptModal
          appt={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onUpdateStatus={(id, s) => statusMutation.mutate({ appointmentId: id, status: s })}
          isPending={isPending}
        />
      )}

      <ModoFolgaModal open={showFolga} onClose={() => setShowFolga(false)} />
      <NovoAgendamentoModal open={showNewAppt} onClose={() => setShowNewAppt(false)} />
    </DashboardLayout>
  );
}

// ─── CalendarToolbar ──────────────────────────────────────────────────────────

function CalendarToolbar({
  weekStart,
  view,
  onPrev,
  onNext,
  onToday,
  onViewChange,
}: {
  weekStart: string;
  view: ViewMode;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
      {/* Week navigation */}
      <button onClick={onPrev} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-600">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button onClick={onNext} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-600">
        <ChevronRight className="h-4 w-4" />
      </button>
      <span className="text-sm font-semibold text-slate-800 min-w-[110px]">
        {monthYearLabel(weekStart)}
      </span>
      <button
        onClick={onToday}
        className="px-3 h-8 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
      >
        Hoje
      </button>

      <div className="ml-auto flex items-center gap-3">
        {/* View switcher */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
          {(["Dia", "Semana", "Mês", "Lista"] as const).map(label => {
            const active =
              (label === "Semana" && view === "semana") ||
              (label === "Lista"  && view === "lista");
            return (
              <button
                key={label}
                onClick={() => {
                  if (label === "Semana") onViewChange("semana");
                  else if (label === "Lista") onViewChange("lista");
                }}
                className={`px-3 h-8 border-r last:border-r-0 border-slate-200 transition ${active ? "bg-slate-900 text-white" : "hover:bg-slate-50 text-slate-600"}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Status legend */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500">
          {(Object.entries(STATUS_CFG) as [DBStatus, (typeof STATUS_CFG)[DBStatus]][])
            .filter(([k]) => k !== "no_show")
            .map(([, cfg]) => (
              <span key={cfg.label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: cfg.dot }} />
                {cfg.label}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

// ─── ApptModal ────────────────────────────────────────────────────────────────

function ApptModal({
  appt,
  onClose,
  onUpdateStatus,
  isPending,
}: {
  appt: AgendaAppointment;
  onClose: () => void;
  onUpdateStatus: (appointmentId: string, status: UpdateStatus) => void;
  isPending: boolean;
}) {
  const cfg = STATUS_CFG[appt.status as DBStatus] ?? STATUS_CFG.confirmado;
  const initials = appt.patient.nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 grid place-items-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{appt.patient.nome}</p>
            <p className="text-xs text-slate-500 truncate">{appt.service.nome}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 text-slate-400 transition shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ background: cfg.bg, color: cfg.text }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
          {cfg.label}
        </span>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-xs truncate">{appt.patient.telefone}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-xs">{toHHMM(new Date(appt.inicio))} – {toHHMM(new Date(appt.fim))}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 col-span-2">
            <Stethoscope className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-xs truncate">{appt.service.nome} · {appt.service.duracaoMinutos} min</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 col-span-2">
            <User className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-xs truncate">{appt.patient.nome}</span>
          </div>
        </div>

        {appt.status !== "concluido" && appt.status !== "cancelado" && appt.status !== "no_show" && (
          <div className="flex gap-2 pt-1">
            <button disabled={isPending} onClick={() => onUpdateStatus(appt.id, "concluido")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition">
              <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
            </button>
            <button disabled={isPending} onClick={() => onUpdateStatus(appt.id, "no_show")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-60 transition">
              <AlertTriangle className="h-3.5 w-3.5" /> No-show
            </button>
            <button disabled={isPending} onClick={() => onUpdateStatus(appt.id, "cancelado")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60 transition">
              <XCircle className="h-3.5 w-3.5" /> Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ListView ─────────────────────────────────────────────────────────────────

function ListView({
  days,
  byDay,
  blockedByDate,
  selectedAppt,
  onSelectAppt,
  onUpdateStatus,
  onRemoveFolga,
  isPending,
}: {
  days: string[];
  byDay: Map<string, AgendaAppointment[]>;
  blockedByDate: Map<string, FolgaBlock>;
  selectedAppt: AgendaAppointment | null;
  onSelectAppt: (appt: AgendaAppointment | null) => void;
  onUpdateStatus: (appointmentId: string, status: UpdateStatus) => void;
  onRemoveFolga: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      {days.map(dayStr => {
        const dayAppts = byDay.get(dayStr) ?? [];
        const today = isToday(dayStr);
        const folga = blockedByDate.get(dayStr) ?? null;
        return (
          <div key={dayStr} className={today ? "rounded-2xl border border-teal-200 bg-teal-50/50 px-4 pb-4 pt-3 shadow-sm" : ""}>
            <div className="flex items-center gap-2 mb-2">
              <h2 className={`text-sm font-semibold capitalize ${today ? "text-teal-700" : "text-slate-700"}`}>
                {formatDayHeader(dayStr)}
              </h2>
              {today && (
                <span className="inline-flex items-center text-[11px] font-bold bg-teal-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                  Hoje
                </span>
              )}
              {folga ? (
                <span className="text-[10px] font-medium bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <CalendarOff className="h-2.5 w-2.5" /> Folga
                </span>
              ) : (
                <span className="text-xs text-slate-400">
                  {dayAppts.length > 0 ? `${dayAppts.length} consulta(s)` : "Sem consultas"}
                </span>
              )}
            </div>

            {folga ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-rose-100 grid place-items-center shrink-0">
                  <CalendarOff className="h-5 w-5 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-rose-700">Folga configurada</p>
                  {folga.motivo
                    ? <p className="text-xs text-rose-500 mt-0.5 truncate">"{folga.motivo}"</p>
                    : <p className="text-xs text-rose-400 mt-0.5">Sem mensagem personalizada</p>}
                </div>
                <button disabled={isPending} onClick={() => onRemoveFolga(folga.id)}
                  className="h-8 w-8 grid place-items-center rounded-lg hover:bg-rose-200 text-rose-400 hover:text-rose-700 transition disabled:opacity-50 shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : dayAppts.length === 0 ? (
              <div className={`rounded-xl border border-dashed py-4 text-center text-xs text-slate-400 ${today ? "border-teal-200 bg-teal-50/30" : "border-slate-200"}`}>
                Dia livre
              </div>
            ) : (
              <div className="space-y-2">
                {dayAppts.map(appt => {
                  const cfg = STATUS_CFG[appt.status as DBStatus] ?? STATUS_CFG.confirmado;
                  const isSel = selectedAppt?.id === appt.id;
                  return (
                    <div key={appt.id} className={`rounded-xl border bg-white transition ${isSel ? "border-teal-400 shadow-md ring-1 ring-teal-200" : today ? "border-teal-100 hover:border-teal-300 hover:shadow-sm" : "border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}>
                      <button onClick={() => onSelectAppt(isSel ? null : appt)} className="w-full flex items-center gap-4 px-5 py-3 text-left">
                        <div className="flex flex-col items-center min-w-[48px]">
                          <span className="text-sm font-bold text-slate-900">{toHHMM(new Date(appt.inicio))}</span>
                          <span className="text-[10px] text-slate-400">{appt.service.duracaoMinutos} min</span>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 grid place-items-center text-xs font-semibold text-slate-700 shrink-0">
                          {appt.patient.nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{appt.patient.nome}</p>
                          <p className="text-xs text-slate-500 truncate">{appt.service.nome}</p>
                        </div>
                        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.text }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
                          {cfg.label}
                        </span>
                      </button>
                      {isSel && (
                        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-slate-600"><User className="h-4 w-4 text-slate-400" />{appt.patient.nome}</div>
                            <div className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4 text-slate-400" />{appt.patient.telefone}</div>
                            <div className="flex items-center gap-2 text-slate-600"><Stethoscope className="h-4 w-4 text-slate-400" />{appt.service.nome}</div>
                            <div className="flex items-center gap-2 text-slate-600"><Clock className="h-4 w-4 text-slate-400" />{toHHMM(new Date(appt.inicio))} – {toHHMM(new Date(appt.fim))}</div>
                          </div>
                          {appt.status !== "concluido" && appt.status !== "cancelado" && appt.status !== "no_show" && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <button disabled={isPending} onClick={() => onUpdateStatus(appt.id, "concluido")} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition"><CheckCircle2 className="h-3.5 w-3.5" />Concluir</button>
                              <button disabled={isPending} onClick={() => onUpdateStatus(appt.id, "no_show")} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-60 transition"><AlertTriangle className="h-3.5 w-3.5" />No-show</button>
                              <button disabled={isPending} onClick={() => onUpdateStatus(appt.id, "cancelado")} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60 transition"><XCircle className="h-3.5 w-3.5" />Cancelar</button>
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
      })}
    </div>
  );
}
