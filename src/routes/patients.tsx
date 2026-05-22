import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/tanstack-start";
import { Search, UserRound, Phone, Mail, CalendarDays, DollarSign } from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { fetchPatientsData } from "../lib/patients-list";
import type { PatientRow } from "../lib/patients-list";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/patients")({
  head: () => ({ meta: [{ title: "Pacientes — MediClin" }] }),
  loader: () => fetchPatientsData(),
  component: PatientsPage,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
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
  const loaderData = Route.useLoaderData();
  // Memoiza pra evitar nova referência de array a cada render (useMemo abaixo depende dela).
  const patients = useMemo<PatientRow[]>(() => (loaderData ?? []) as PatientRow[], [loaderData]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.telefone.includes(q),
    );
  }, [patients, search]);

  return (
    <DashboardLayout>
      {/* Topbar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="px-6 py-4 flex items-center gap-4">
          <div className="h-9 w-9 rounded-xl bg-slate-100 grid place-items-center">
            <UserRound className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Pacientes</h1>
            <p className="text-xs text-slate-500">{patients.length} paciente(s) cadastrado(s)</p>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-4">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition bg-white"
          />
        </div>

        {/* Stats row */}
        {patients.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Total de pacientes",
                value: patients.length,
                icon: UserRound,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
              },
              {
                label: "Consultas realizadas",
                value: patients.reduce((s, p) => s + p.totalConsultas, 0),
                icon: CalendarDays,
                color: "text-teal-600",
                bg: "bg-teal-50",
              },
              {
                label: "Faturamento total",
                value: formatCurrency(patients.reduce((s, p) => s + p.totalPago, 0)),
                icon: DollarSign,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                isString: true,
              },
              {
                label: "Ticket médio",
                value: formatCurrency(
                  patients.reduce((s, p) => s + p.totalPago, 0) /
                    Math.max(
                      patients.reduce((s, p) => s + p.totalConsultas, 0),
                      1,
                    ),
                ),
                icon: DollarSign,
                color: "text-amber-600",
                bg: "bg-amber-50",
                isString: true,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3"
              >
                <div className={`h-9 w-9 rounded-xl grid place-items-center ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900 leading-tight">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Patient list */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              {search ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado ainda."}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((patient) => {
                const isExpanded = expanded === patient.id;
                return (
                  <li key={patient.id}>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : patient.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/60 transition"
                    >
                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-teal-100 grid place-items-center text-sm font-semibold text-indigo-700 shrink-0">
                        {initials(patient.nome)}
                      </div>

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {patient.nome}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{patient.email}</p>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-6 text-xs text-slate-500 shrink-0">
                        <div className="text-center">
                          <p className="font-semibold text-slate-900 text-sm">
                            {patient.totalConsultas}
                          </p>
                          <p>consultas</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-emerald-700 text-sm">
                            {formatCurrency(patient.totalPago)}
                          </p>
                          <p>total pago</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-slate-900 text-sm">
                            {formatDate(patient.ultimaConsulta)}
                          </p>
                          <p>última consulta</p>
                        </div>
                      </div>
                    </button>

                    {/* Expanded row */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                        <div className="flex flex-wrap gap-4 text-sm">
                          <a
                            href={`mailto:${patient.email}`}
                            className="inline-flex items-center gap-2 text-slate-600 hover:text-teal-700 transition"
                          >
                            <Mail className="h-4 w-4" />
                            {patient.email}
                          </a>
                          <a
                            href={`tel:${patient.telefone}`}
                            className="inline-flex items-center gap-2 text-slate-600 hover:text-teal-700 transition"
                          >
                            <Phone className="h-4 w-4" />
                            {patient.telefone}
                          </a>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 sm:hidden">
                          <span>{patient.totalConsultas} consultas</span>
                          <span>·</span>
                          <span>{formatCurrency(patient.totalPago)} total</span>
                          <span>·</span>
                          <span>Última: {formatDate(patient.ultimaConsulta)}</span>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
