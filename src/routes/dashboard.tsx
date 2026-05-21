import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  DollarSign,
  Activity,
  Bell,
  Search,
  Settings,
  LogOut,
  Stethoscope,
  Video,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  FileText,
  MessageSquare,
  Plus,
  LayoutDashboard,
  CalendarDays,
  UserRound,
  Wallet,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

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

const todayAppointments: Appt[] = [
  {
    id: "1",
    time: "08:30",
    patient: "Mariana Costa",
    age: 34,
    type: "Presencial",
    reason: "Consulta de rotina",
    status: "concluido",
    avatar: "MC",
  },
  {
    id: "2",
    time: "09:15",
    patient: "Rafael Almeida",
    age: 52,
    type: "Presencial",
    reason: "Retorno — hipertensão",
    status: "concluido",
    avatar: "RA",
  },
  {
    id: "3",
    time: "10:00",
    patient: "Beatriz Lima",
    age: 28,
    type: "Teleconsulta",
    reason: "Avaliação cardiológica",
    status: "em-andamento",
    avatar: "BL",
  },
  {
    id: "4",
    time: "11:30",
    patient: "João Pedro Santos",
    age: 41,
    type: "Presencial",
    reason: "Eletrocardiograma",
    status: "confirmado",
    avatar: "JS",
  },
  {
    id: "5",
    time: "14:00",
    patient: "Carla Mendes",
    age: 60,
    type: "Presencial",
    reason: "Holter 24h — entrega",
    status: "confirmado",
    avatar: "CM",
  },
  {
    id: "6",
    time: "15:45",
    patient: "Tiago Ribeiro",
    age: 37,
    type: "Teleconsulta",
    reason: "Resultado de exames",
    status: "aguardando",
    avatar: "TR",
  },
  {
    id: "7",
    time: "16:30",
    patient: "Luana Ferreira",
    age: 45,
    type: "Presencial",
    reason: "Consulta inicial",
    status: "confirmado",
    avatar: "LF",
  },
  {
    id: "8",
    time: "17:15",
    patient: "Eduardo Nunes",
    age: 29,
    type: "Teleconsulta",
    reason: "Acompanhamento",
    status: "cancelado",
    avatar: "EN",
  },
];

type Stat = {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  icon: LucideIcon;
  iconBg: string;
  iconText: string;
};

const stats: Stat[] = [
  {
    label: "Consultas hoje",
    value: "8",
    delta: "+12,5%",
    trend: "up",
    icon: CalendarDays,
    iconBg: "bg-teal-50",
    iconText: "text-teal-600",
  },
  {
    label: "Pacientes ativos",
    value: "342",
    delta: "+8,2%",
    trend: "up",
    icon: Users,
    iconBg: "bg-indigo-50",
    iconText: "text-indigo-600",
  },
  {
    label: "Faturamento (mês)",
    value: "R$ 48.720",
    delta: "+18,4%",
    trend: "up",
    icon: Wallet,
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
  },
  {
    label: "Taxa de no-show",
    value: "4,2%",
    delta: "-1,1%",
    trend: "down",
    icon: Activity,
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
  },
];

const weekData = [
  { day: "Seg", consultas: 12, receita: 5400 },
  { day: "Ter", consultas: 9, receita: 4100 },
  { day: "Qua", consultas: 14, receita: 6300 },
  { day: "Qui", consultas: 11, receita: 4950 },
  { day: "Sex", consultas: 15, receita: 6750 },
  { day: "Sáb", consultas: 6, receita: 2700 },
  { day: "Dom", consultas: 0, receita: 0 },
];

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
  const [filter, setFilter] = useState<"todos" | Appt["status"]>("todos");

  const filtered = useMemo(
    () =>
      filter === "todos" ? todayAppointments : todayAppointments.filter((a) => a.status === filter),
    [filter],
  );

  const maxConsultas = Math.max(...weekData.map((d) => d.consultas));
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white min-h-screen sticky top-0">
          <div className="px-6 py-5 border-b border-slate-100">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 grid place-items-center text-white">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight">MediClin</div>
                <div className="text-[11px] text-slate-500">Painel do médico</div>
              </div>
            </Link>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
            {[
              { icon: LayoutDashboard, label: "Visão geral", active: true },
              { icon: CalendarDays, label: "Agenda" },
              { icon: UserRound, label: "Pacientes" },
              { icon: ClipboardList, label: "Prontuários" },
              { icon: FileText, label: "Receitas" },
              { icon: MessageSquare, label: "Mensagens" },
              { icon: Wallet, label: "Financeiro" },
              { icon: Settings, label: "Configurações" },
            ].map((item) => (
              <button
                key={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                  item.active
                    ? "bg-gradient-to-r from-teal-50 to-indigo-50 text-teal-700 font-medium ring-1 ring-teal-100"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 grid place-items-center text-white font-semibold">
                DR
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">Dr. Ricardo Lima</div>
                <div className="text-xs text-slate-500 truncate">CRM-SP 123.456</div>
              </div>
              <LogOut className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Topbar */}
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
            <div className="px-6 py-4 flex items-center gap-4">
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Olá, Dr. Ricardo 👋</h1>
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
                <button className="relative h-9 w-9 grid place-items-center rounded-lg hover:bg-slate-100 transition">
                  <Bell className="h-4 w-4 text-slate-600" />
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                </button>
                <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 transition shadow-sm">
                  <Plus className="h-4 w-4" />
                  Novo agendamento
                </button>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-6">
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
                      {todayAppointments.length} consultas programadas
                    </p>
                  </div>
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
                </div>
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
                            <span className="text-xs text-slate-400">· {a.age} anos</span>
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
              </div>

              {/* Next patient card */}
              <div className="space-y-6">
                <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-6 relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-teal-500/20 blur-3xl" />
                  <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
                  <div className="relative">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-teal-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
                      Em andamento
                    </div>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight">Beatriz Lima</h3>
                    <p className="text-sm text-slate-300 mt-1">
                      Avaliação cardiológica · Teleconsulta
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-300">
                      <Clock className="h-3.5 w-3.5" />
                      Iniciada às 10:00 · 12 min
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
                      value="2"
                    />
                    <Row
                      icon={Clock}
                      color="text-amber-600"
                      label="Tempo médio por consulta"
                      value="28 min"
                    />
                    <Row icon={XCircle} color="text-rose-600" label="Cancelamentos" value="1" />
                    <Row
                      icon={DollarSign}
                      color="text-teal-600"
                      label="Receita prevista hoje"
                      value="R$ 3.240"
                    />
                    <Row
                      icon={Phone}
                      color="text-indigo-600"
                      label="Retornos agendados"
                      value="4"
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
                    <h2 className="text-base font-semibold tracking-tight">
                      Atendimentos da semana
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Consultas realizadas por dia</p>
                  </div>
                  <div className="text-xs text-slate-500">
                    Total:{" "}
                    <span className="font-semibold text-slate-900">
                      {weekData.reduce((s, d) => s + d.consultas, 0)}
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
        </main>
      </div>
    </div>
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
