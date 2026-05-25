import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/tanstack-start";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Clock,
  Users,
  DollarSign,
  Activity,
  Bell,
  Search,
  Video,
  MapPin,
  CheckCircle2,
  XCircle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  FileText,
  Plus,
  CalendarDays,
  UserRound,
  Wallet,
  ExternalLink,
  Zap,
  AlertTriangle,
  Crown,
  X,
  type LucideIcon,
} from "lucide-react";
import { fetchCurrentProfessional } from "../lib/auth";
import { checkOnboardingStatus } from "../lib/onboarding";
import { createMPOAuthLink, activateMPAccount } from "../lib/mercadopago";
import { createMPSubscriptionCheckout, getMPSubscriptionPortalUrl } from "../lib/mp-subscription";
import { fetchDashboardData, type DashboardData, type SubscriptionInfo, type UpcomingAppt } from "../lib/dashboard";
import { DashboardLayout } from "../components/DashboardLayout";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Médico — MediClin" },
      {
        name: "description",
        content:
          "Painel de controle para médicos: agendamentos, pacientes, faturamento e métricas em tempo real.",
      },
    ],
  }),
  loader: async () => {
    const { hasProfile } = await checkOnboardingStatus();
    if (!hasProfile) throw redirect({ to: "/onboarding" });
    return fetchDashboardData();
  },
  component: Dashboard,
});

type Appt = {
  id: string;
  time: string;
  patient: string;
  age: number;
  type: "Presencial" | "Teleconsulta";
  reason: string;
  status: "confirmado" | "aguardando" | "em-andamento" | "concluido" | "cancelado";
  avatar: string;
};

type Stat = {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  icon: LucideIcon;
  iconBg: string;
  iconText: string;
};

function buildStats(data: DashboardData | null): Stat[] {
  const s = data?.stats;
  const faturamento = s
    ? s.faturamentoMes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";
  return [
    {
      label: "Consultas hoje",
      value: String(s?.consultasHoje ?? "—"),
      delta: "—",
      trend: "up",
      icon: CalendarDays,
      iconBg: "bg-teal-50",
      iconText: "text-teal-600",
    },
    {
      label: "Pacientes ativos",
      value: String(s?.pacientesAtivos ?? "—"),
      delta: "—",
      trend: "up",
      icon: Users,
      iconBg: "bg-indigo-50",
      iconText: "text-indigo-600",
    },
    {
      label: "Faturamento (mês)",
      value: faturamento,
      delta: "—",
      trend: "up",
      icon: Wallet,
      iconBg: "bg-emerald-50",
      iconText: "text-emerald-600",
    },
    {
      label: "Taxa de no-show",
      value: s ? `${s.taxaNoShow.toFixed(1).replace(".", ",")}%` : "—",
      delta: "—",
      trend: "down",
      icon: Activity,
      iconBg: "bg-amber-50",
      iconText: "text-amber-600",
    },
  ];
}

const EMPTY_WEEK = Array.from({ length: 7 }, (_, i) => {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return { day: days[d.getDay()], consultas: 0, receita: 0 };
});

const statusStyle: Record<
  Appt["status"],
  { label: string; bg: string; text: string; dot: string }
> = {
  confirmado: { label: "Confirmado", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  aguardando: {
    label: "Aguardando",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  "em-andamento": {
    label: "Em andamento",
    bg: "bg-teal-50",
    text: "text-teal-700",
    dot: "bg-teal-500",
  },
  concluido: {
    label: "Concluído",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  cancelado: { label: "Cancelado", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};

function Dashboard() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <DashboardContent />
      </SignedIn>
    </>
  );
}

function DashboardContent() {
  const data = Route.useLoaderData() ?? null;
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"todos" | Appt["status"]>("todos");
  const [showNotifs, setShowNotifs] = useState(false);

  // Memoiza pra evitar nova referência de array a cada render (filtered depende dela).
  const appointments = useMemo<Appt[]>(
    () => (data?.todayAppointments ?? []) as Appt[],
    [data?.todayAppointments],
  );
  const stats = buildStats(data);
  const weekData = data?.weekData ?? EMPTY_WEEK;

  const filtered = useMemo(
    () => (filter === "todos" ? appointments : appointments.filter((a) => a.status === filter)),
    [filter, appointments],
  );

  const upcomingAppointments = useMemo<UpcomingAppt[]>(
    () => (data?.upcomingAppointments ?? []) as UpcomingAppt[],
    [data?.upcomingAppointments],
  );

  const maxConsultas = Math.max(...weekData.map((d) => d.consultas), 1);
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const profNome = data?.professional?.nomeCompleto ?? "Médico";
  const profPrimeiroNome = profNome.split(" ")[0];
  const profEspecialidade = data?.professional?.especialidade ?? "";
  const profRegistro = data?.professional?.registro ?? "";

  // Day summary derived from real appointments
  const concluidos = appointments.filter((a) => a.status === "concluido").length;
  const cancelados = appointments.filter((a) => a.status === "cancelado").length;
  const emAndamento = appointments.find((a) => a.status === "em-andamento");

  return (
    <DashboardLayout>
      {/* Main content (DashboardLayout provides sidebar) */}
      <div className="flex-1 min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="px-6 py-4 flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Olá, {profPrimeiroNome} 👋</h1>
              <p className="text-xs text-slate-500 capitalize">{today}</p>
            </div>
            <div className="flex-1 max-w-md ml-6 hidden md:block">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Buscar paciente, prontuário, exame..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
                />
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {/* Notifications bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifs((v) => !v)}
                  className="relative h-9 w-9 grid place-items-center rounded-lg hover:bg-slate-100 transition"
                >
                  <Bell className="h-4 w-4 text-slate-600" />
                  {upcomingAppointments.length > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                  )}
                </button>

                {showNotifs && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                    <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Lembretes</p>
                          <p className="text-xs text-slate-400">Próximas consultas da semana</p>
                        </div>
                        <button
                          onClick={() => setShowNotifs(false)}
                          className="h-7 w-7 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {upcomingAppointments.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                          <Bell className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-sm font-medium text-slate-500">Tudo em dia!</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Nenhuma consulta nos próximos 7 dias.
                          </p>
                        </div>
                      ) : (
                        <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                          {upcomingAppointments.map((a) => (
                            <li
                              key={a.id}
                              className="px-4 py-3 hover:bg-slate-50 transition flex items-center gap-3"
                            >
                              <div className="h-8 w-8 rounded-full bg-teal-50 grid place-items-center text-xs font-semibold text-teal-700 shrink-0">
                                {a.avatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{a.patient}</p>
                                <p className="text-xs text-slate-500">
                                  {a.date} · {a.time} · {a.reason}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="px-4 py-2 border-t border-slate-100">
                        <button
                          onClick={() => { setShowNotifs(false); void navigate({ to: "/agenda" }); }}
                          className="w-full text-xs text-center text-teal-600 hover:text-teal-800 font-medium py-1 transition"
                        >
                          Ver agenda completa →
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Novo agendamento */}
              <button
                onClick={() => void navigate({ to: "/agenda" })}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 transition shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Novo agendamento
              </button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          <SubscriptionCard subscription={data?.subscription ?? null} />
          <MPConnectBanner />

          {/* Stats */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl bg-white border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between">
                  <div className={`h-10 w-10 rounded-xl grid place-items-center ${s.iconBg}`}>
                    <s.icon className={`h-5 w-5 ${s.iconText}`} />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      s.trend === "up"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {s.trend === "up" ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {s.delta}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                </div>
              </div>
            ))}
          </section>

          {/* Grid */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Appointments */}
            <div className="xl:col-span-2 rounded-2xl bg-white border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-base font-semibold tracking-tight">Agenda de hoje</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {appointments.length > 0
                      ? `${appointments.length} consulta${appointments.length !== 1 ? "s" : ""} programada${appointments.length !== 1 ? "s" : ""}`
                      : "Nenhuma consulta agendada para hoje"}
                  </p>
                </div>
                {appointments.length > 0 && (
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                    {(["todos", "confirmado", "em-andamento", "concluido"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-md font-medium transition ${
                          filter === f
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {f === "todos" ? "Todos" : statusStyle[f].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Empty today → show upcoming week */}
              {appointments.length === 0 ? (
                <div className="px-6 py-8">
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="h-14 w-14 rounded-2xl bg-slate-100 grid place-items-center mb-3">
                      <CalendarDays className="h-7 w-7 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">Dia livre hoje! 🎉</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Aproveite para organizar sua agenda ou adicionar novos horários.
                    </p>
                  </div>

                  {upcomingAppointments.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Próximas consultas da semana
                      </p>
                      <ul className="space-y-2">
                        {upcomingAppointments.slice(0, 6).map((a) => {
                          const st = statusStyle[a.status];
                          return (
                            <li
                              key={a.id}
                              className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 hover:bg-slate-50 transition"
                            >
                              <div className="flex flex-col items-center min-w-[64px]">
                                <div className="text-xs font-bold text-slate-700">{a.time}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{a.date}</div>
                              </div>
                              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-200 to-indigo-200 grid place-items-center text-xs font-semibold text-slate-700 shrink-0">
                                {a.avatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{a.patient}</p>
                                <p className="text-xs text-slate-500 truncate">{a.reason}</p>
                              </div>
                              <span
                                className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                                {st.label}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                      <button
                        onClick={() => void navigate({ to: "/agenda" })}
                        className="mt-4 w-full text-xs text-center text-teal-600 hover:text-teal-800 font-medium py-2 transition"
                      >
                        Ver agenda completa →
                      </button>
                    </>
                  )}

                  {upcomingAppointments.length === 0 && (
                    <div className="text-center">
                      <button
                        onClick={() => void navigate({ to: "/agenda" })}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition shadow-sm"
                      >
                        <Plus className="h-4 w-4" />
                        Configurar disponibilidade
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filtered.map((a) => {
                    const st = statusStyle[a.status];
                    return (
                      <li
                        key={a.id}
                        className="px-6 py-4 hover:bg-slate-50/60 transition flex items-center gap-4"
                      >
                        <div className="flex flex-col items-center min-w-[56px]">
                          <div className="text-sm font-semibold text-slate-900">{a.time}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">30 min</div>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 grid place-items-center text-xs font-semibold text-slate-700 shrink-0">
                          {a.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 truncate">
                              {a.patient}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            {a.type === "Teleconsulta" ? (
                              <Video className="h-3 w-3 text-indigo-500" />
                            ) : (
                              <MapPin className="h-3 w-3 text-teal-500" />
                            )}
                            <span className="truncate">{a.reason}</span>
                          </div>
                        </div>
                        <span
                          className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                        <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition">
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>
                      </li>
                    );
                  })}
                  {filtered.length === 0 && (
                    <li className="px-6 py-12 text-center text-sm text-slate-500">
                      Nenhuma consulta neste filtro.
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* Next patient card */}
            <div className="space-y-6">
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-6 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-teal-500/20 blur-3xl" />
                <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="relative">
                  {emAndamento ? (
                    <>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-teal-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
                        Em andamento
                      </div>
                      <h3 className="mt-3 text-xl font-semibold tracking-tight">
                        {emAndamento.patient}
                      </h3>
                      <p className="text-sm text-slate-300 mt-1">
                        {emAndamento.reason} · {emAndamento.type}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-300">
                        <Clock className="h-3.5 w-3.5" />
                        Iniciada às {emAndamento.time}
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <button className="inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg bg-white text-slate-900 hover:bg-slate-100 transition">
                          <Video className="h-4 w-4" />
                          Entrar
                        </button>
                        <button className="inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg bg-white/10 text-white hover:bg-white/20 transition">
                          <FileText className="h-4 w-4" />
                          Prontuário
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                        Aguardando consulta
                      </div>
                      <h3 className="mt-3 text-base font-semibold tracking-tight text-slate-300">
                        Nenhuma consulta em andamento
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">
                        A próxima consulta aparecerá aqui automaticamente.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Quick patient stats */}
              <div className="rounded-2xl bg-white border border-slate-200 p-6">
                <h3 className="text-sm font-semibold tracking-tight">Resumo do dia</h3>
                <ul className="mt-4 space-y-3 text-sm">
                  <Row
                    icon={CheckCircle2}
                    color="text-emerald-600"
                    label="Consultas concluídas"
                    value={String(concluidos)}
                  />
                  <Row
                    icon={Clock}
                    color="text-amber-600"
                    label="Confirmadas"
                    value={String(appointments.filter((a) => a.status === "confirmado").length)}
                  />
                  <Row
                    icon={XCircle}
                    color="text-rose-600"
                    label="Cancelamentos"
                    value={String(cancelados)}
                  />
                  <Row
                    icon={DollarSign}
                    color="text-teal-600"
                    label="Faturamento do mês"
                    value={
                      data?.stats
                        ? data.stats.faturamentoMes.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : "—"
                    }
                  />
                  <Row
                    icon={Users}
                    color="text-indigo-600"
                    label="Pacientes este mês"
                    value={String(data?.stats?.pacientesAtivos ?? "—")}
                  />
                </ul>
              </div>
            </div>
          </section>

          {/* Charts row */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 rounded-2xl bg-white border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-semibold tracking-tight">Atendimentos da semana</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Consultas realizadas por dia</p>
                </div>
                <div className="text-xs text-slate-500">
                  Últimos 7 dias:{" "}
                  <span className="font-semibold text-slate-900">
                    {weekData.reduce((s, d) => s + d.consultas, 0)} consultas
                  </span>
                </div>
              </div>
              <div className="flex items-end gap-3 h-48">
                {weekData.map((d) => {
                  const h = maxConsultas > 0 ? (d.consultas / maxConsultas) * 100 : 0;
                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="text-xs font-medium text-slate-700 opacity-0 group-hover:opacity-100 transition">
                        {d.consultas}
                      </div>
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-teal-500 to-indigo-500 hover:from-teal-600 hover:to-indigo-600 transition relative"
                          style={{ height: `${Math.max(h, 4)}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-500">{d.day}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Specialties breakdown */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <h2 className="text-base font-semibold tracking-tight">Distribuição</h2>
              <p className="text-xs text-slate-500 mt-0.5 mb-5">Consultas por tipo este mês</p>
              <ul className="space-y-4">
                {[
                  { label: "Consulta inicial", pct: 42, color: "bg-teal-500" },
                  { label: "Retorno", pct: 28, color: "bg-indigo-500" },
                  { label: "Teleconsulta", pct: 18, color: "bg-emerald-500" },
                  { label: "Exames", pct: 12, color: "bg-amber-500" },
                ].map((item) => (
                  <li key={item.label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="font-medium text-slate-900">{item.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Row({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: LucideIcon;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-slate-600">{label}</span>
      </div>
      <span className="font-semibold text-slate-900">{value}</span>
    </li>
  );
}

// ─── SubscriptionCard ─────────────────────────────────────────────────────────

function trialDaysLeft(trialFimEm: string | null): number {
  if (!trialFimEm) return 0;
  return Math.max(0, Math.ceil((new Date(trialFimEm).getTime() - Date.now()) / 86_400_000));
}

function formatPeriodEnd(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function SubscriptionCard({ subscription }: { subscription: SubscriptionInfo | null }) {
  const [successBanner, setSuccessBanner] = useState(false);

  const checkoutMutation = useMutation({
    mutationFn: (plan: "pro" | "clinic") => createMPSubscriptionCheckout({ data: { plan } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => getMPSubscriptionPortalUrl(),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscription") === "success") {
      setSuccessBanner(true);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  if (!subscription) return null;

  const { status, plano, trialFimEm, periodoFimEm, hasMPAccount } = subscription;
  const daysLeft = trialDaysLeft(trialFimEm);
  const isCheckoutPending = checkoutMutation.isPending;
  const pendingPlan = isCheckoutPending ? (checkoutMutation.variables as "pro" | "clinic") : null;

  // ── Sucesso pós-checkout ─────────────────────────────────────────────────
  if (successBanner) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
        <p className="text-sm text-slate-700 flex-1">
          <strong>Assinatura ativada!</strong> Seja bem-vindo ao plano{" "}
          <span className="capitalize font-semibold">{plano}</span>. Obrigado por assinar o
          MediClin.
        </p>
        <button
          onClick={() => setSuccessBanner(false)}
          className="text-slate-400 hover:text-slate-600 text-lg leading-none"
        >
          ×
        </button>
      </div>
    );
  }

  // ── Plano ativo — strip compacto ─────────────────────────────────────────
  if (status === "ativa") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 flex items-center gap-3 flex-wrap">
        <Crown className="h-4 w-4 text-emerald-600 shrink-0" />
        <p className="text-sm text-slate-700 flex-1">
          Plano <strong className="capitalize">{plano}</strong> · ativo
          {periodoFimEm && (
            <span className="text-slate-500">
              {" "}
              · próxima cobrança em {formatPeriodEnd(periodoFimEm)}
            </span>
          )}
        </p>
        {hasMPAccount && (
          <button
            disabled={portalMutation.isPending}
            onClick={() => portalMutation.mutate()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-60 transition shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {portalMutation.isPending ? "Abrindo..." : "Gerenciar assinatura"}
          </button>
        )}
      </div>
    );
  }

  // ── Inadimplente ─────────────────────────────────────────────────────────
  if (status === "inadimplente") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 flex items-center gap-4 flex-wrap">
        <div className="h-10 w-10 rounded-xl bg-rose-100 grid place-items-center shrink-0">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">Pagamento pendente</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Houve um problema com seu pagamento. Atualize seus dados para continuar usando o
            MediClin.
          </p>
        </div>
        {hasMPAccount && (
          <button
            disabled={portalMutation.isPending}
            onClick={() => portalMutation.mutate()}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white transition"
          >
            <ExternalLink className="h-4 w-4" />
            {portalMutation.isPending ? "Abrindo..." : "Atualizar pagamento"}
          </button>
        )}
      </div>
    );
  }

  // ── Cancelado — reativar ─────────────────────────────────────────────────
  if (status === "cancelada") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex items-center gap-4 flex-wrap">
        <div className="h-10 w-10 rounded-xl bg-slate-100 grid place-items-center shrink-0">
          <Zap className="h-5 w-5 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">Assinatura cancelada</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Reative seu plano para continuar recebendo agendamentos pelo MediClin.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            disabled={isCheckoutPending}
            onClick={() => checkoutMutation.mutate("pro")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white transition"
          >
            {pendingPlan === "pro" ? "Aguarde..." : "Plano Pro"}
          </button>
          <button
            disabled={isCheckoutPending}
            onClick={() => checkoutMutation.mutate("clinic")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white transition"
          >
            {pendingPlan === "clinic" ? "Aguarde..." : "Plano Clinic"}
          </button>
        </div>
      </div>
    );
  }

  // ── Trial (default) ──────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 flex items-center gap-4 flex-wrap">
      <div className="h-10 w-10 rounded-xl bg-amber-100 grid place-items-center shrink-0">
        <Zap className="h-5 w-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">
          {daysLeft > 0
            ? `Período de teste — ${daysLeft} dia${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""}`
            : "Período de teste encerrado"}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Assine um plano para continuar usando todos os recursos do MediClin.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <button
          disabled={isCheckoutPending}
          onClick={() => checkoutMutation.mutate("pro")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white transition shadow-sm"
        >
          <Crown className="h-4 w-4" />
          {pendingPlan === "pro" ? "Aguarde..." : "Pro — R$79/mês"}
        </button>
        <button
          disabled={isCheckoutPending}
          onClick={() => checkoutMutation.mutate("clinic")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white transition shadow-sm"
        >
          <Crown className="h-4 w-4" />
          {pendingPlan === "clinic" ? "Aguarde..." : "Clinic — R$199/mês"}
        </button>
      </div>
    </div>
  );
}

function MPConnectBanner() {
  const { data: professional, refetch } = useQuery({
    queryKey: ["currentProfessional"],
    queryFn: () => fetchCurrentProfessional(),
  });

  const activateMutation = useMutation({
    mutationFn: ({ code, professionalId }: { code: string; professionalId: string }) =>
      activateMPAccount({ data: { code, professionalId } }),
    onSuccess: () => refetch(),
  });

  const connectMutation = useMutation({
    mutationFn: (professionalId: string) => createMPOAuthLink({ data: { professionalId } }),
    onSuccess: (result) => {
      window.location.href = result.url;
    },
  });

  // Após retorno do OAuth do Mercado Pago: ?code=xxx&state=professionalId
  const activateMutate = activateMutation.mutate;
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state"); // professionalId
    if (code && state) {
      activateMutate({ code, professionalId: state });
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [activateMutate]);

  if (!professional) return null;
  if (professional.mpAccountAtivo) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-amber-100 grid place-items-center shrink-0">
        <Zap className="h-5 w-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">Ative os pagamentos online</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Conecte sua conta Mercado Pago para receber pagamentos dos pacientes via PIX, cartão e
          boleto.
        </p>
      </div>
      <button
        disabled={connectMutation.isPending || activateMutation.isPending}
        onClick={() => connectMutation.mutate(professional.id)}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white transition"
      >
        <ExternalLink className="h-4 w-4" />
        {connectMutation.isPending || activateMutation.isPending
          ? "Aguarde..."
          : "Conectar Mercado Pago"}
      </button>
    </div>
  );
}
