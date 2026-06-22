import { useState } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  LayoutDashboard,
  CalendarDays,
  UserRound,
  Settings,
  Globe,
  Wallet,
  LifeBuoy,
  Clock,
  Users,
  DollarSign,
  Activity,
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
  Camera,
  Mic,
  Wifi,
  MoreHorizontal,
  MonitorSmartphone,
  Menu,
  X,
  LogOut,
  Rocket,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ApptStatus = "confirmado" | "aguardando" | "em-andamento" | "concluido" | "cancelado";

type Appt = {
  id: string;
  time: string;
  patient: string;
  type: "Presencial" | "Teleconsulta";
  reason: string;
  status: ApptStatus;
  avatar: string;
};

// ─── Dados fictícios ──────────────────────────────────────────────────────────

const WEEK_DATA = [
  { day: "Seg", consultas: 3, receita: 450 },
  { day: "Ter", consultas: 4, receita: 620 },
  { day: "Qua", consultas: 5, receita: 750 },
  { day: "Qui", consultas: 2, receita: 300 },
  { day: "Sex", consultas: 4, receita: 600 },
  { day: "Sáb", consultas: 1, receita: 150 },
  { day: "Dom", consultas: 0, receita: 0 },
];

const STATUS_STYLE: Record<ApptStatus, { label: string; bg: string; text: string; dot: string }> = {
  confirmado: {
    label: "Confirmado",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
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
  cancelado: {
    label: "Cancelado",
    bg: "bg-rose-50",
    text: "text-rose-700",
    dot: "bg-rose-500",
  },
};

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Visão geral", href: "/demo-dashboard" },
  { icon: CalendarDays, label: "Agenda", href: "/demo-agenda" },
  { icon: UserRound, label: "Pacientes", href: "/demo-pacientes" },
  { icon: Globe, label: "Página Pública", href: "/demo-pagina-publica" },
  { icon: Wallet, label: "Financeiro", href: "/demo-financeiro" },
  { icon: Settings, label: "Configurações", href: "#" },
  { icon: LifeBuoy, label: "Suporte", href: "#" },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function DemoSidebar({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  function handleNavDemo(e: React.MouseEvent, href: string) {
    if (href === "#") {
      e.preventDefault();
      toast.info("Explore à vontade! Esta área estará disponível na sua conta.", {
        duration: 2500,
      });
    }
    onClose?.();
  }

  return (
    <>
      {/* Logo */}
      <div className={`px-6 py-5 border-b border-slate-100 ${mobile ? "flex items-center justify-between" : ""}`}>
        <Link to="/demo" className="flex items-center gap-2">
          <img
            src="/logo-icon.png"
            alt="CuidandoVC"
            className="h-9 w-9 rounded-xl object-contain"
          />
          <div>
            <div className="text-sm font-semibold tracking-tight">CuidandoVC</div>
            <div className="text-[11px] text-slate-500">Painel do médico</div>
          </div>
        </Link>
        {mobile && (
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href !== "#" && location.pathname.startsWith(item.href);
          return (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleNavDemo(e, item.href)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                isActive
                  ? "bg-gradient-to-r from-teal-50 to-indigo-50 text-teal-700 font-medium ring-1 ring-teal-100"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition group">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 grid place-items-center text-white font-semibold text-sm shrink-0">
            AB
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Dra. Ana Beatriz Santos</div>
            <div className="text-xs text-slate-500 truncate">Psicologia Clínica · CRP 06/123456</div>
          </div>
          <button
            title="Demo — sair"
            onClick={() => void navigate({ to: "/demo" })}
            className="opacity-0 group-hover:opacity-100 transition"
          >
            <LogOut className="h-4 w-4 text-slate-400 hover:text-rose-500 transition" />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  demoServico?: string;
  demoHorario?: string;
  demoData?: string;
}

export function DemoDashboardContent({ demoServico, demoHorario, demoData }: Props) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const todayDow = new Date()
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "");
  const todayDayMonth = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  // Agendamento dinâmico — o que o usuário acabou de "fazer"
  const demoAppt: Appt | null =
    demoServico && demoHorario
      ? {
          id: "demo-user",
          time: demoHorario,
          patient: "Novo Paciente (você)",
          type: "Presencial",
          reason: demoServico,
          status: "confirmado",
          avatar: "NP",
        }
      : null;

  // Appointments fixos
  const BASE_APPTS: Appt[] = [
    {
      id: "a1",
      time: "09:00",
      patient: "Maria Clara S.",
      type: "Presencial",
      reason: "Sessão de Psicoterapia",
      status: "confirmado",
      avatar: "MC",
    },
    {
      id: "a2",
      time: "10:30",
      patient: "João Pedro M.",
      type: "Teleconsulta",
      reason: "Consulta Inicial",
      status: "em-andamento",
      avatar: "JP",
    },
    {
      id: "a3",
      time: "14:00",
      patient: "Roberto Costa",
      type: "Presencial",
      reason: "Avaliação Psicológica",
      status: "aguardando",
      avatar: "RC",
    },
  ];

  // Insere o agendamento do usuário (se tiver) na posição correta por horário
  const appointments: Appt[] = demoAppt
    ? [...BASE_APPTS, demoAppt].sort((a, b) => a.time.localeCompare(b.time))
    : BASE_APPTS;

  const proximaConsulta =
    appointments.find(
      (a) => a.status === "confirmado" || a.status === "aguardando" || a.status === "em-andamento",
    ) ?? null;
  const remainingAppts = appointments.filter((a) => a.id !== proximaConsulta?.id);
  const emAndamento = appointments.find((a) => a.status === "em-andamento");

  const concluidos = appointments.filter((a) => a.status === "concluido").length;
  const cancelados = appointments.filter((a) => a.status === "cancelado").length;
  const confirmados = appointments.filter((a) => a.status === "confirmado").length;

  const stats = [
    {
      label: "Consultas hoje",
      value: String(appointments.length),
      delta: "+1 vs ontem",
      trend: "up" as const,
      icon: CalendarDays,
      iconBg: "bg-teal-50",
      iconText: "text-teal-600",
    },
    {
      label: "Pacientes ativos",
      value: "31",
      delta: "+3 este mês",
      trend: "up" as const,
      icon: Users,
      iconBg: "bg-indigo-50",
      iconText: "text-indigo-600",
    },
    {
      label: "Faturamento (mês)",
      value: "R$ 4.350",
      delta: "+12% vs mês ant.",
      trend: "up" as const,
      icon: Wallet,
      iconBg: "bg-emerald-50",
      iconText: "text-emerald-600",
    },
    {
      label: "Taxa de no-show",
      value: "4,0%",
      delta: "-2% vs mês ant.",
      trend: "down" as const,
      icon: Activity,
      iconBg: "bg-amber-50",
      iconText: "text-amber-600",
    },
  ];

  function handleDemoAction() {
    toast.info("Aqui você confirmaria, concluiria ou cancelaria a consulta em tempo real.", {
      duration: 3000,
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 h-14">
        <Link to="/demo" className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="CuidandoVC" className="h-8 w-8 rounded-lg object-contain" />
          <span className="text-sm font-semibold tracking-tight">CuidandoVC</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl">
            <DemoSidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white min-h-screen sticky top-0">
          <DemoSidebar />
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Topbar */}
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
            <div className="px-6 py-4 flex items-center gap-4">
              <div>
                <h1 className="text-lg font-semibold tracking-tight">
                  Olá, Ana Beatriz 👋
                </h1>
                <p className="text-xs text-slate-500 capitalize">{today}</p>
              </div>
              <div className="flex-1 max-w-md ml-6 hidden md:block">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    placeholder="Buscar paciente, prontuário..."
                    readOnly
                    onClick={() =>
                      toast.info("Busca disponível na sua conta real.", { duration: 2000 })
                    }
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 cursor-pointer focus:outline-none"
                  />
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() =>
                    toast.info("Novo agendamento disponível na sua conta real.", { duration: 2000 })
                  }
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 transition shadow-sm"
                >
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

            {/* Grid: agenda + sidebar */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Agenda */}
              <div className="xl:col-span-2 rounded-2xl bg-white border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">Agenda de hoje</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {appointments.length} consultas programadas
                    </p>
                  </div>
                  <button
                    onClick={handleDemoAction}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Novo
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Próximo agendamento — card destaque */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-3">
                      {proximaConsulta?.status === "em-andamento"
                        ? "Em andamento"
                        : "Próximo agendamento"}
                    </p>

                    {proximaConsulta && (
                      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white overflow-hidden shadow-sm">
                        <div className="px-5 pt-5 pb-4 flex items-center gap-4">
                          <div className="shrink-0 text-center">
                            <div className="text-3xl font-bold tracking-tight leading-none">
                              {proximaConsulta.time}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-wide">
                              {proximaConsulta.status === "em-andamento" ? "em curso" : "próxima"}
                            </div>
                          </div>
                          <div className="w-px self-stretch bg-white/10" />
                          <div className="h-12 w-12 rounded-full bg-white/15 ring-2 ring-white/20 grid place-items-center text-base font-bold shrink-0">
                            {proximaConsulta.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold truncate">
                              {proximaConsulta.patient}
                            </p>
                            <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-0.5">
                              {proximaConsulta.type === "Teleconsulta" ? (
                                <Video className="h-3.5 w-3.5" />
                              ) : (
                                <MapPin className="h-3.5 w-3.5" />
                              )}
                              <span className="truncate">{proximaConsulta.reason}</span>
                            </div>
                            <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[proximaConsulta.status].dot}`}
                              />
                              {STATUS_STYLE[proximaConsulta.status].label}
                            </span>
                          </div>
                        </div>
                        <div className="px-4 pb-4 flex gap-2 border-t border-white/5 pt-3">
                          <button
                            onClick={handleDemoAction}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-xl bg-white text-slate-900 hover:bg-slate-100 transition"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Concluir
                          </button>
                          <button
                            onClick={handleDemoAction}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
                          >
                            <XCircle className="h-4 w-4" />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Demais agendamentos */}
                  {remainingAppts.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">
                        Demais agendamentos
                      </p>
                      <ul className="space-y-0.5">
                        {remainingAppts.map((a) => {
                          const st = STATUS_STYLE[a.status];
                          return (
                            <li
                              key={a.id}
                              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition"
                            >
                              <div className="shrink-0 bg-slate-900 text-white rounded-lg px-2.5 py-2 text-center min-w-[56px]">
                                <div className="text-[9px] text-slate-400 uppercase tracking-wide font-semibold">
                                  {todayDow}
                                </div>
                                <div className="text-sm font-bold leading-tight mt-0.5">
                                  {todayDayMonth}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">{a.time}</div>
                              </div>
                              <div className={`w-0.5 h-8 rounded-full shrink-0 ${st.dot}`} />
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center text-xs font-semibold text-slate-700 shrink-0">
                                {a.avatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {a.patient}
                                </p>
                                <p className="text-xs text-slate-500 truncate">{a.reason}</p>
                              </div>
                              <span
                                className={`hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}
                              >
                                {st.label}
                              </span>
                              <button
                                onClick={handleDemoAction}
                                className="h-7 w-7 grid place-items-center rounded-lg hover:bg-slate-200 transition opacity-0 group-hover:opacity-100"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={() =>
                      toast.info("Veja sua agenda completa na sua conta real.", { duration: 2000 })
                    }
                    className="w-full text-xs text-center text-teal-600 hover:text-teal-800 font-medium py-1 transition"
                  >
                    Ver agenda completa →
                  </button>
                </div>
              </div>

              {/* Sidebar card */}
              <div className="space-y-6">
                {/* Em andamento / Sala virtual */}
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
                          <button
                            onClick={handleDemoAction}
                            className="inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg bg-white text-slate-900 hover:bg-slate-100 transition"
                          >
                            <Video className="h-4 w-4" />
                            Entrar
                          </button>
                          <button
                            onClick={handleDemoAction}
                            className="inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
                          >
                            <FileText className="h-4 w-4" />
                            Prontuário
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-indigo-300">
                          <MonitorSmartphone className="h-3.5 w-3.5" />
                          Teleconsulta
                        </div>
                        <h3 className="mt-3 text-lg font-semibold tracking-tight">
                          Sala virtual pronta
                        </h3>
                        <div className="mt-4 space-y-2.5">
                          {[
                            { icon: Camera, label: "Câmera disponível" },
                            { icon: Mic, label: "Microfone disponível" },
                            { icon: Wifi, label: "Conexão estável" },
                          ].map(({ icon: Icon, label }) => (
                            <div key={label} className="flex items-center gap-2 text-xs text-slate-300">
                              <div className="h-5 w-5 rounded-full bg-emerald-500/20 grid place-items-center shrink-0">
                                <Icon className="h-3 w-3 text-emerald-400" />
                              </div>
                              {label}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={handleDemoAction}
                          className="mt-5 w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white transition"
                        >
                          <Video className="h-4 w-4" />
                          Iniciar sala virtual
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Resumo do dia */}
                <div className="rounded-2xl bg-white border border-slate-200 p-6">
                  <h3 className="text-sm font-semibold tracking-tight">Resumo do dia</h3>
                  <ul className="mt-4 space-y-3 text-sm">
                    {[
                      { icon: CheckCircle2, color: "text-emerald-600", label: "Concluídas", value: String(concluidos) },
                      { icon: Clock, color: "text-amber-600", label: "Confirmadas", value: String(confirmados) },
                      { icon: XCircle, color: "text-rose-600", label: "Cancelamentos", value: String(cancelados) },
                      { icon: DollarSign, color: "text-teal-600", label: "Faturamento do mês", value: "R$ 4.350,00" },
                      { icon: Users, color: "text-indigo-600", label: "Pacientes este mês", value: "31" },
                    ].map(({ icon: Icon, color, label, value }) => (
                      <li key={label} className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                        <span className="flex-1 text-slate-600">{label}</span>
                        <span className="font-semibold text-slate-900">{value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Gráfico semanal */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 rounded-2xl bg-white border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">
                      Atendimentos da semana
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Consultas realizadas por dia</p>
                  </div>
                  <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                    Últimos 7 dias: 19 consultas
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={WEEK_DATA} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [`${v} consultas`]}
                    />
                    <Bar
                      dataKey="consultas"
                      fill="url(#barGrad)"
                      radius={[6, 6, 0, 0]}
                    />
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Distribuição */}
              <div className="rounded-2xl bg-white border border-slate-200 p-6">
                <h3 className="text-sm font-semibold tracking-tight mb-4">
                  Tipos de atendimento
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Consulta Inicial", pct: 42, color: "bg-teal-500" },
                    { label: "Psicoterapia", pct: 35, color: "bg-indigo-500" },
                    { label: "Avaliação Psicológica", pct: 15, color: "bg-violet-500" },
                    { label: "Outros", pct: 8, color: "bg-slate-300" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="font-semibold text-slate-900">{item.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA dentro do painel */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    Quer ter um painel assim para o seu consultório?
                  </p>
                  <a
                    href="/sign-up"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 transition"
                  >
                    <Rocket className="h-4 w-4" />
                    Criar minha conta
                  </a>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
