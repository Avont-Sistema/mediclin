import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/tanstack-start";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  Phone,
  MessageCircle,
  Calendar,
  ChevronRight,
  Stethoscope,
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { PatientDrawer } from "../components/PatientDrawer";
import { listPatients } from "../lib/patients";
import type { PatientSummary } from "../lib/patients";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/patients")({
  head: () => ({ meta: [{ title: "Pacientes — CuidandoVC" }] }),
  component: PatientsPage,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatDate(isoStr: string | null) {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function whatsappUrl(tel: string) {
  const digits = tel.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PatientsPage() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <PatientsContent />
      </SignedIn>
    </>
  );
}

function PatientsContent() {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: () => listPatients(),
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.telefone.includes(q) ||
        (p.ultimoServico ?? "").toLowerCase().includes(q),
    );
  }, [patients, search]);

  return (
    <DashboardLayout
      lockWhenFree
      lockTitle="Pacientes — plano PRO"
      lockMessage="Assine o plano PRO para acessar a gestão de pacientes."
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="px-6 py-4 flex items-center gap-4">
          <div className="h-9 w-9 rounded-xl bg-slate-100 grid place-items-center">
            <Users className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Pacientes</h1>
            <p className="text-xs text-slate-500">
              {isLoading
                ? "Carregando..."
                : `${patients.length} paciente${patients.length !== 1 ? "s" : ""} cadastrado${patients.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          {/* Search */}
          <div className="ml-auto relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 h-8 text-sm rounded-lg border border-slate-200 bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
            />
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 grid place-items-center mx-auto">
              <Users className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {search ? "Nenhum paciente encontrado" : "Ainda não há pacientes"}
            </p>
            <p className="text-xs text-slate-400">
              {search
                ? "Tente outro nome ou telefone."
                : "Os pacientes aparecem aqui assim que o primeiro agendamento for realizado."}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs text-teal-600 hover:underline"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((patient) => (
              <PatientRow
                key={patient.id}
                patient={patient}
                onOpen={() => setSelectedPatient(patient)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Detail drawer ───────────────────────────────────────────── */}
      {selectedPatient && (
        <PatientDrawer patientId={selectedPatient.id} onClose={() => setSelectedPatient(null)} />
      )}
    </DashboardLayout>
  );
}

// ─── PatientRow ───────────────────────────────────────────────────────────────

function PatientRow({ patient, onOpen }: { patient: PatientSummary; onOpen: () => void }) {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition group cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-indigo-500 grid place-items-center text-white text-sm font-semibold shrink-0">
          {getInitials(patient.nome)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{patient.nome}</p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Phone className="h-3 w-3" />
              {patient.telefone}
            </span>
            {patient.ultimoServico && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Stethoscope className="h-3 w-3" />
                {patient.ultimoServico}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="h-3 w-3" />
              Última visita: {formatDate(patient.ultimaConsulta)}
            </span>
          </div>
        </div>

        {/* Consultation count */}
        <div className="text-center shrink-0 min-w-[48px]">
          <div className="text-lg font-bold text-slate-900 leading-none">
            {patient.totalConsultas}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            consulta{patient.totalConsultas !== 1 ? "s" : ""}
          </div>
        </div>

        {/* WhatsApp button */}
        <a
          href={whatsappUrl(patient.telefone)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="h-9 w-9 grid place-items-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition shrink-0"
          title="Contato via WhatsApp"
        >
          <MessageCircle className="h-4 w-4" />
        </a>

        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition shrink-0" />
      </div>
    </div>
  );
}
