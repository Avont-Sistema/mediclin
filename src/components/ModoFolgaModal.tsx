import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  ChevronLeft,
  ChevronRight,
  CalendarOff,
  Loader2,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { listFolgas, addFolga, removeFolga, type FolgaBlock } from "../lib/folga";

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DOW_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayStr(): string {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

function blockToDateStr(isoStr: string): string {
  const d = new Date(isoStr);
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatLong(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

// ─── ModoFolgaModal ───────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ModoFolgaModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth()); // 0-indexed

  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [mensagem, setMensagem] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data: folgas = [], isLoading } = useQuery({
    queryKey: ["folgas"],
    queryFn: () => listFolgas(),
    enabled: open,
  });

  // Map: dateStr → FolgaBlock
  const blockedMap = useMemo(() => {
    const m = new Map<string, FolgaBlock>();
    for (const f of folgas) m.set(blockToDateStr(f.inicio), f);
    return m;
  }, [folgas]);

  const addMutation = useMutation({
    mutationFn: async () => {
      for (const dateStr of [...selectedDays].sort()) {
        await addFolga({ data: { dateStr, mensagem: mensagem || "" } });
      }
    },
    onSuccess: () => {
      setSelectedDays(new Set());
      setMensagem("");
      void queryClient.invalidateQueries({ queryKey: ["folgas"] });
      void queryClient.invalidateQueries({ queryKey: ["agendaWeek"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (blockId: string) => {
      setRemovingId(blockId);
      return removeFolga({ data: { blockId } });
    },
    onSuccess: () => {
      setRemovingId(null);
      void queryClient.invalidateQueries({ queryKey: ["folgas"] });
      void queryClient.invalidateQueries({ queryKey: ["agendaWeek"] });
    },
    onError: () => setRemovingId(null),
  });

  // ── Calendar grid ─────────────────────────────────────────────────────────

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDow = new Date(calYear, calMonth, 1).getDay(); // 0 = Sunday

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  const toggleDay = (dateStr: string) => {
    if (dateStr < todayStr()) return;
    if (blockedMap.has(dateStr)) return;
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  if (!open) return null;

  const today = todayStr();
  const selectedSorted = [...selectedDays].sort();

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-rose-50 grid place-items-center">
                <CalendarOff className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Modo Folga</h2>
                <p className="text-xs text-slate-400">Selecione os dias que não vai trabalhar</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {/* ── Calendário ────────────────────────────────────────────── */}
            <div className="px-6 pt-5 pb-4">
              {/* Navegação de mês */}
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={prevMonth}
                  className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-bold text-slate-900 capitalize">
                  {MONTHS_PT[calMonth]} {calYear}
                </span>
                <button
                  onClick={nextMonth}
                  className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-600"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Cabeçalho dias da semana */}
              <div className="grid grid-cols-7 mb-1">
                {DOW_PT.map((d) => (
                  <div
                    key={d}
                    className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wide py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Grade de dias */}
              <div className="grid grid-cols-7 gap-1">
                {/* Células vazias para o início do mês */}
                {Array.from({ length: firstDow }, (_, i) => (
                  <div key={`e-${i}`} />
                ))}

                {/* Dias */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dateStr = toDateStr(calYear, calMonth, day);
                  const isPast = dateStr < today;
                  const isToday = dateStr === today;
                  const isBlocked = blockedMap.has(dateStr);
                  const isSelected = selectedDays.has(dateStr);

                  let cls =
                    "relative h-9 w-full rounded-xl text-sm font-semibold transition flex flex-col items-center justify-center leading-none ";

                  if (isBlocked) {
                    cls += "bg-rose-100 text-rose-500 cursor-default";
                  } else if (isSelected) {
                    cls += "bg-amber-400 text-white shadow-sm cursor-pointer hover:bg-amber-500";
                  } else if (isPast) {
                    cls += "text-slate-300 cursor-default";
                  } else if (isToday) {
                    cls += "ring-2 ring-teal-500 text-teal-700 cursor-pointer hover:bg-teal-50";
                  } else {
                    cls += "text-slate-700 cursor-pointer hover:bg-slate-100";
                  }

                  return (
                    <button
                      key={dateStr}
                      disabled={isPast || isBlocked}
                      onClick={() => toggleDay(dateStr)}
                      title={
                        isBlocked
                          ? `Folga: ${blockedMap.get(dateStr)?.motivo ?? "sem mensagem"}`
                          : undefined
                      }
                      className={cls}
                    >
                      {day}
                      {isBlocked && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-rose-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-5 mt-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-rose-100 border border-rose-200" />
                  Folga
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-amber-400" />
                  Selecionado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md ring-2 ring-teal-500" />
                  Hoje
                </span>
              </div>
            </div>

            {/* ── Dias selecionados + mensagem ──────────────────────────── */}
            {selectedDays.size > 0 && (
              <div className="mx-4 mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <span className="h-5 w-5 rounded-full bg-amber-400 text-white text-xs grid place-items-center font-bold shrink-0">
                    {selectedDays.size}
                  </span>
                  dia{selectedDays.size !== 1 ? "s" : ""} selecionado
                  {selectedDays.size !== 1 ? "s" : ""}
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {selectedSorted.map((d) => formatShort(d)).join(" · ")}
                </p>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                    Mensagem para os pacientes
                    <span className="font-normal text-slate-400">(opcional)</span>
                  </label>
                  <textarea
                    rows={2}
                    maxLength={255}
                    placeholder="Ex: Estarei em congresso médico. Retorno na próxima semana."
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none resize-none transition"
                  />
                </div>

                <button
                  disabled={addMutation.isPending}
                  onClick={() => addMutation.mutate()}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50 transition shadow-sm"
                >
                  {addMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarOff className="h-4 w-4" />
                  )}
                  Marcar {selectedDays.size} folga{selectedDays.size !== 1 ? "s" : ""}
                </button>
              </div>
            )}

            {/* ── Lista de folgas configuradas ──────────────────────────── */}
            <div className="px-6 pb-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Folgas configuradas
              </p>

              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                </div>
              ) : folgas.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                  <CalendarOff className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Nenhuma folga configurada</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {folgas.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3"
                    >
                      <div className="h-8 w-8 rounded-lg bg-rose-100 grid place-items-center shrink-0 mt-0.5">
                        <CalendarOff className="h-4 w-4 text-rose-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 capitalize">
                          {formatLong(f.inicio)}
                        </p>
                        {f.motivo ? (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">"{f.motivo}"</p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">Sem mensagem</p>
                        )}
                      </div>
                      <button
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(f.id)}
                        className="h-7 w-7 grid place-items-center rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition disabled:opacity-40 shrink-0"
                      >
                        {removingId === f.id && removeMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
