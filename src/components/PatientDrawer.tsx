import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  MessageCircle,
  Phone,
  Mail,
  Calendar,
  Clock,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Check,
  User,
} from "lucide-react";
import { getPatientDetail, updateAppointmentNotes } from "../lib/patients";
import type { PatientAppointment } from "../lib/patients";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  aguardando_pagamento: {
    label: "Aguardando pagamento",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  confirmado: { label: "Confirmado", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
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
  no_show: { label: "No-show", bg: "bg-slate-50", text: "text-slate-500", dot: "bg-slate-400" },
};

function formatDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function isPlaceholderEmail(email: string) {
  return email.endsWith("@noemail.cuidandovc.com.br");
}

function whatsappUrl(tel: string) {
  const digits = tel.replace(/\D/g, "");
  // Assume Brazil (+55) if no country code
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}`;
}

function getInitials(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ─── AppointmentNoteCard ──────────────────────────────────────────────────────

interface NoteCardProps {
  appt: PatientAppointment;
  index: number;
  defaultOpen?: boolean;
}

function AppointmentNoteCard({ appt, index, defaultOpen = false }: NoteCardProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(defaultOpen);
  const [notes, setNotes] = useState(appt.observacoes ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalRef = useRef(appt.observacoes ?? "");

  const st = STATUS_STYLE[appt.status] ?? STATUS_STYLE.confirmado;

  const saveMutation = useMutation({
    mutationFn: (text: string) =>
      updateAppointmentNotes({ data: { appointmentId: appt.id, observacoes: text } }),
    onSuccess: () => {
      setSaveState("saved");
      void queryClient.invalidateQueries({ queryKey: ["patientDetail"] });
      setTimeout(() => setSaveState("idle"), 2000);
    },
    onError: () => setSaveState("idle"),
  });

  function handleNotesChange(value: string) {
    setNotes(value);
    setSaveState("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value === originalRef.current) return;
    debounceRef.current = setTimeout(() => {
      setSaveState("saving");
      originalRef.current = value;
      saveMutation.mutate(value);
    }, 1500);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div
      className={`rounded-xl border transition ${
        open ? "border-teal-200 shadow-sm" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {/* Index badge */}
        <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold grid place-items-center shrink-0">
          {index}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate capitalize">
            {formatDate(appt.inicio)}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <Clock className="h-2.5 w-2.5" />
              {formatTime(appt.inicio)} – {formatTime(appt.fim)}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <Stethoscope className="h-2.5 w-2.5" />
              {appt.service.nome}
            </span>
          </div>
        </div>

        <span
          className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </span>

        {appt.observacoes && (
          <span title="Tem anotações">
            <FileText className="h-3.5 w-3.5 text-teal-500 shrink-0" />
          </span>
        )}

        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
        )}
      </button>

      {/* Notes editor */}
      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              Anotações da consulta
            </label>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              {saveState === "saving" && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
                </>
              )}
              {saveState === "saved" && (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-600">Salvo</span>
                </>
              )}
              {saveState === "idle" && notes !== (appt.observacoes ?? "") && (
                <span className="text-amber-500">Não salvo</span>
              )}
            </span>
          </div>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Ex: Paciente relatou dor de cabeça frequente. Solicitado exame de sangue. Prescrito Paracetamol 500mg..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:bg-white outline-none resize-none transition"
          />
          <p className="text-[10px] text-slate-400">Salvo automaticamente enquanto você digita.</p>
        </div>
      )}
    </div>
  );
}

// ─── PatientDrawer ────────────────────────────────────────────────────────────

interface PatientDrawerProps {
  patientId: string;
  onClose: () => void;
}

export function PatientDrawer({ patientId, onClose }: PatientDrawerProps) {
  const { data: patient, isLoading } = useQuery({
    queryKey: ["patientDetail", patientId],
    queryFn: () => getPatientDetail({ data: { patientId } }),
    staleTime: 30_000,
  });

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const consultations = patient?.appointments ?? [];
  const concludedCount = consultations.filter((a) => a.status === "concluido").length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-5 border-b border-slate-100">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-400 to-indigo-500 grid place-items-center text-white font-bold text-base shrink-0">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                getInitials(patient?.nome ?? "?")
              )}
            </div>

            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="h-4 w-32 bg-slate-100 rounded animate-pulse mb-2" />
              ) : (
                <h2 className="text-base font-semibold text-slate-900 truncate">{patient?.nome}</h2>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                {patient?.telefone && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Phone className="h-3 w-3" />
                    {patient.telefone}
                  </span>
                )}
                {patient?.email && !isPlaceholderEmail(patient.email) && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Mail className="h-3 w-3" />
                    {patient.email}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {patient?.telefone && (
                <a
                  href={whatsappUrl(patient.telefone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-sm"
                  title="Contato via WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              )}
              <button
                onClick={onClose}
                className="h-9 w-9 grid place-items-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Stats row */}
          {!isLoading && patient && (
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Paciente desde{" "}
                {new Date(patient.criadoEm).toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                {consultations.length} consulta{consultations.length !== 1 ? "s" : ""}
                {concludedCount > 0 && (
                  <span className="text-emerald-600 font-medium">
                    ({concludedCount} concluída{concludedCount !== 1 ? "s" : ""})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Nenhuma consulta registrada.</p>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Histórico de consultas
              </p>
              {consultations.map((appt, i) => (
                <AppointmentNoteCard
                  key={appt.id}
                  appt={appt}
                  index={consultations.length - i}
                  defaultOpen={i === 0}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
