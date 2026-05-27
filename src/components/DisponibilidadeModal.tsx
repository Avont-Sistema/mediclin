import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Clock, Check, Loader2 } from "lucide-react";
import { getAvailabilityRules, saveAvailabilityRules } from "../lib/disponibilidade";

// ─── Types & config ───────────────────────────────────────────────────────────

type DiaSemana = "domingo" | "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado";

const DIAS_CONFIG: { id: DiaSemana; label: string }[] = [
  { id: "segunda", label: "Segunda-feira" },
  { id: "terca", label: "Terça-feira" },
  { id: "quarta", label: "Quarta-feira" },
  { id: "quinta", label: "Quinta-feira" },
  { id: "sexta", label: "Sexta-feira" },
  { id: "sabado", label: "Sábado" },
  { id: "domingo", label: "Domingo" },
];

type DayState = { ativo: boolean; horaInicio: string; horaFim: string };
type WeekState = Record<DiaSemana, DayState>;

const DEFAULT_DAY: DayState = { ativo: false, horaInicio: "08:00", horaFim: "18:00" };

function makeDefault(): WeekState {
  return Object.fromEntries(DIAS_CONFIG.map((d) => [d.id, { ...DEFAULT_DAY }])) as WeekState;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DisponibilidadeModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<WeekState>(makeDefault);
  const [saved, setSaved] = useState(false);

  // ── Load existing rules ───────────────────────────────────────────────────
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["availabilityRules"],
    queryFn: () => getAvailabilityRules(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const next = makeDefault();
    for (const rule of rules) {
      const dia = rule.diaSemana as DiaSemana;
      if (dia in next) {
        next[dia] = { ativo: rule.ativo, horaInicio: rule.horaInicio, horaFim: rule.horaFim };
      }
    }
    setState(next);
  }, [rules, open]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      const rulesToSave = DIAS_CONFIG.filter((d) => state[d.id].ativo).map((d) => ({
        diaSemana: d.id,
        horaInicio: state[d.id].horaInicio,
        horaFim: state[d.id].horaFim,
      }));
      return saveAvailabilityRules({ data: { rules: rulesToSave } });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["availabilityRules"] });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1200);
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggle = (dia: DiaSemana) =>
    setState((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], ativo: !prev[dia].ativo },
    }));

  const setTime = (dia: DiaSemana, field: "horaInicio" | "horaFim", val: string) =>
    setState((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [field]: val },
    }));

  // Quick-fill: apply a single time range to all enabled days
  const applyAll = (horaInicio: string, horaFim: string) =>
    setState(
      (prev) =>
        Object.fromEntries(
          DIAS_CONFIG.map((d) => [d.id, { ...prev[d.id], horaInicio, horaFim }]),
        ) as WeekState,
    );

  const selectWeekdays = () =>
    setState((prev) => {
      const next = { ...prev };
      for (const d of DIAS_CONFIG) {
        next[d.id] = { ...next[d.id], ativo: d.id !== "sabado" && d.id !== "domingo" };
      }
      return next;
    });

  if (!open) return null;

  const activeCount = DIAS_CONFIG.filter((d) => state[d.id].ativo).length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-teal-50 grid place-items-center">
                <Clock className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Disponibilidade Semanal</h2>
                <p className="text-xs text-slate-400">
                  Defina os dias e horários em que você atende
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Body ─────────────────────────────────────────────────────── */}
          <div className="overflow-y-auto flex-1">
            <div className="px-6 pt-4 pb-3">
              {/* Quick actions */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <button
                  onClick={selectWeekdays}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 transition"
                >
                  Seg – Sex
                </button>
                <button
                  onClick={() => applyAll("08:00", "18:00")}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
                >
                  Aplicar 08:00–18:00 a todos
                </button>
                <button
                  onClick={() => setState(makeDefault)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition"
                >
                  Limpar
                </button>
              </div>

              {/* Day rows */}
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                </div>
              ) : (
                <div className="space-y-2">
                  {DIAS_CONFIG.map((dia) => {
                    const ds = state[dia.id];
                    return (
                      <div
                        key={dia.id}
                        className={`rounded-xl border px-4 py-3 transition-all ${
                          ds.ativo ? "border-teal-200 bg-teal-50/40" : "border-slate-200 bg-white"
                        }`}
                      >
                        {/* Day row */}
                        <div className="flex items-center gap-3">
                          {/* Toggle */}
                          <button
                            onClick={() => toggle(dia.id)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                              ds.ativo ? "bg-teal-500" : "bg-slate-200"
                            }`}
                            aria-label={ds.ativo ? `Desativar ${dia.label}` : `Ativar ${dia.label}`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                                ds.ativo ? "translate-x-4" : "translate-x-1"
                              }`}
                            />
                          </button>

                          <span
                            className={`text-sm font-semibold flex-1 ${
                              ds.ativo ? "text-slate-900" : "text-slate-400"
                            }`}
                          >
                            {dia.label}
                          </span>
                        </div>

                        {/* Time inputs — shown when day is active */}
                        {ds.ativo && (
                          <div className="flex items-center gap-2 mt-2.5 ml-12">
                            <span className="text-xs text-slate-500">Das</span>
                            <input
                              type="time"
                              value={ds.horaInicio}
                              onChange={(e) => setTime(dia.id, "horaInicio", e.target.value)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
                            />
                            <span className="text-xs text-slate-500">às</span>
                            <input
                              type="time"
                              value={ds.horaFim}
                              onChange={(e) => setTime(dia.id, "horaFim", e.target.value)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <div className="px-6 py-4 border-t border-slate-100 shrink-0">
            {saveMutation.error && (
              <p className="text-xs text-rose-500 mb-2">Erro ao salvar. Tente novamente.</p>
            )}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 flex-1">
                {activeCount === 0
                  ? "Nenhum dia selecionado"
                  : `${activeCount} dia${activeCount !== 1 ? "s" : ""} de atendimento`}
              </span>
              <button
                disabled={saveMutation.isPending || saved}
                onClick={() => saveMutation.mutate()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-60 transition"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <>
                    <Check className="h-4 w-4" /> Salvo!
                  </>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
