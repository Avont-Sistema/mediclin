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
  LogOut,
  Menu,
  X,
  Rocket,
  Plus,
  ChevronLeft,
  ChevronRight,
  Video,
  MapPin,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Clock,
} from "lucide-react";

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Visão geral", href: "/demo-dashboard" },
  { icon: CalendarDays, label: "Agenda", href: "/demo-agenda" },
  { icon: UserRound, label: "Pacientes", href: "/demo-pacientes" },
  { icon: Globe, label: "Página Pública", href: "/demo-pagina-publica" },
  { icon: Wallet, label: "Financeiro", href: "/demo-financeiro" },
  { icon: Settings, label: "Configurações", href: "#" },
  { icon: LifeBuoy, label: "Suporte", href: "#" },
];

// ─── Dados fictícios ──────────────────────────────────────────────────────────

type ApptStatus = "confirmado" | "aguardando" | "em-andamento" | "concluido";

type Appt = {
  id: string;
  time: string;
  patient: string;
  avatar: string;
  type: "Presencial" | "Teleconsulta";
  reason: string;
  status: ApptStatus;
};

type DaySchedule = {
  label: string;
  dateNum: number;
  month: string;
  dayKey: string;
  appts: Appt[];
};

const STATUS_STYLE: Record<ApptStatus, { label: string; bg: string; text: string; dot: string }> = {
  confirmado: { label: "Confirmado", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  aguardando: { label: "Aguardando", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  "em-andamento": { label: "Em andamento", bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-500" },
  concluido: { label: "Concluído", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

const WEEK_SCHEDULE: DaySchedule[] = [
  {
    label: "Segunda",
    dateNum: 22,
    month: "jun",
    dayKey: "seg",
    appts: [
      { id: "s1", time: "09:00", patient: "Maria Clara S.", avatar: "MC", type: "Presencial", reason: "Sessão de Psicoterapia", status: "concluido" },
      { id: "s2", time: "11:00", patient: "João Pedro M.", avatar: "JP", type: "Teleconsulta", reason: "Consulta Inicial", status: "em-andamento" },
      { id: "s3", time: "15:00", patient: "Roberto Costa", avatar: "RC", type: "Presencial", reason: "Avaliação Psicológica", status: "aguardando" },
    ],
  },
  {
    label: "Terça",
    dateNum: 23,
    month: "jun",
    dayKey: "ter",
    appts: [
      { id: "t1", time: "10:00", patient: "Ana Paula F.", avatar: "AF", type: "Presencial", reason: "Sessão de Psicoterapia", status: "confirmado" },
      { id: "t2", time: "14:00", patient: "Fernanda Lima", avatar: "FL", type: "Presencial", reason: "Consulta Inicial", status: "confirmado" },
      { id: "t3", time: "16:00", patient: "Paulo Souza", avatar: "PS", type: "Teleconsulta", reason: "Consulta Inicial", status: "aguardando" },
    ],
  },
  {
    label: "Quarta",
    dateNum: 24,
    month: "jun",
    dayKey: "qua",
    appts: [
      { id: "q1", time: "09:00", patient: "Carla Mendes", avatar: "CM", type: "Presencial", reason: "Avaliação Psicológica", status: "confirmado" },
      { id: "q2", time: "11:00", patient: "Lucas Rodrigues", avatar: "LR", type: "Presencial", reason: "Sessão de Psicoterapia", status: "confirmado" },
    ],
  },
  {
    label: "Quinta",
    dateNum: 25,
    month: "jun",
    dayKey: "qui",
    appts: [
      { id: "qu1", time: "09:00", patient: "Maria Clara S.", avatar: "MC", type: "Presencial", reason: "Sessão de Psicoterapia", status: "confirmado" },
      { id: "qu2", time: "14:00", patient: "João Pedro M.", avatar: "JP", type: "Teleconsulta", reason: "Consulta Inicial", status: "confirmado" },
      { id: "qu3", time: "15:30", patient: "Ana Paula F.", avatar: "AF", type: "Presencial", reason: "Sessão de Psicoterapia", status: "confirmado" },
    ],
  },
  {
    label: "Sexta",
    dateNum: 26,
    month: "jun",
    dayKey: "sex",
    appts: [
      { id: "sx1", time: "10:00", patient: "Fernanda Lima", avatar: "FL", type: "Presencial", reason: "Consulta Inicial", status: "confirmado" },
      { id: "sx2", time: "16:00", patient: "Roberto Costa", avatar: "RC", type: "Presencial", reason: "Avaliação Psicológica", status: "aguardando" },
    ],
  },
  {
    label: "Sábado",
    dateNum: 27,
    month: "jun",
    dayKey: "sab",
    appts: [],
  },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function DemoSidebar({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  function handleNav(e: React.MouseEvent, href: string) {
    if (href === "#") {
      e.preventDefault();
      toast.info("Explore à vontade! Esta área estará disponível na sua conta.", { duration: 2500 });
    }
    onClose?.();
  }

  return (
    <>
      <div className={`px-6 py-5 border-b border-slate-100 ${mobile ? "flex items-center justify-between" : ""}`}>
        <Link to="/demo" className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="CuidandoVC" className="h-9 w-9 rounded-xl object-contain" />
          <div>
            <div className="text-sm font-semibold tracking-tight">CuidandoVC</div>
            <div className="text-[11px] text-slate-500">Painel do médico</div>
          </div>
        </Link>
        {mobile && (
          <button onClick={onClose} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-50">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href !== "#" && location.pathname.startsWith(item.href);
          return (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleNav(e, item.href)}
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
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition group">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 grid place-items-center text-white font-semibold text-sm shrink-0">AB</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Dra. Ana Beatriz Santos</div>
            <div className="text-xs text-slate-500 truncate">Psicologia Clínica · CRP 06/123456</div>
          </div>
          <button title="Demo — sair" onClick={() => void navigate({ to: "/demo" })} className="opacity-0 group-hover:opacity-100 transition">
            <LogOut className="h-4 w-4 text-slate-400 hover:text-rose-500 transition" />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function DemoAgendaContent() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [weekOffset] = useState(0);

  const totalAppts = WEEK_SCHEDULE.reduce((acc, d) => acc + d.appts.length, 0);

  function handleDemoAction() {
    toast.info("Aqui você gerenciaria o agendamento em tempo real.", { duration: 2500 });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 h-14">
        <Link to="/demo" className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="CuidandoVC" className="h-8 w-8 rounded-lg object-contain" />
          <span className="text-sm font-semibold tracking-tight">CuidandoVC</span>
        </Link>
        <button onClick={() => setMobileOpen(true)} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl">
            <DemoSidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex">
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white min-h-screen sticky top-0">
          <DemoSidebar />
        </aside>

        <main className="flex-1 min-w-0">
          {/* Topbar */}
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
            <div className="px-6 py-4 flex items-center gap-4">
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Agenda</h1>
                <p className="text-xs text-slate-500">{totalAppts} consultas esta semana</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toast.info("Navegação de semana disponível na sua conta.", { duration: 2000 })}
                    className="px-3 py-2 hover:bg-slate-50 transition text-slate-600"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-3 py-2 text-sm font-medium text-slate-700 border-x border-slate-200">
                    22 – 27 jun 2026
                  </span>
                  <button
                    onClick={() => toast.info("Navegação de semana disponível na sua conta.", { duration: 2000 })}
                    className="px-3 py-2 hover:bg-slate-50 transition text-slate-600"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={handleDemoAction}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 transition shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo agendamento</span>
                </button>
              </div>
            </div>
          </header>

          {/* Week content */}
          <div className="p-6 space-y-4">
            {WEEK_SCHEDULE.map((day) => (
              <div key={day.dayKey} className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                {/* Day header */}
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[40px]">
                      <div className="text-[11px] text-slate-400 uppercase font-semibold">{day.label}</div>
                      <div className="text-xl font-bold text-slate-900 leading-tight">{day.dateNum}</div>
                      <div className="text-[11px] text-slate-400">{day.month}</div>
                    </div>
                    <div className="w-px h-10 bg-slate-200" />
                    <span className="text-sm text-slate-500">
                      {day.appts.length === 0
                        ? "Sem agendamentos"
                        : `${day.appts.length} consulta${day.appts.length > 1 ? "s" : ""}`}
                    </span>
                  </div>
                  {day.appts.length > 0 && (
                    <button
                      onClick={handleDemoAction}
                      className="text-xs text-teal-600 hover:text-teal-800 font-medium transition"
                    >
                      + Adicionar
                    </button>
                  )}
                </div>

                {day.appts.length === 0 ? (
                  <div className="px-5 py-6 text-center">
                    <Clock className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Dia livre — sem agendamentos</p>
                    <button
                      onClick={handleDemoAction}
                      className="mt-2 text-xs text-teal-600 hover:underline font-medium"
                    >
                      Agendar consulta
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-50">
                    {day.appts.map((appt) => {
                      const st = STATUS_STYLE[appt.status];
                      return (
                        <li
                          key={appt.id}
                          className="group flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition"
                        >
                          {/* Time */}
                          <div className="shrink-0 w-14 text-center">
                            <span className="text-sm font-bold text-slate-900">{appt.time}</span>
                          </div>

                          {/* Status dot */}
                          <div className={`shrink-0 h-2 w-2 rounded-full ${st.dot}`} />

                          {/* Avatar */}
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center text-xs font-semibold text-slate-700 shrink-0">
                            {appt.avatar}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{appt.patient}</p>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                              {appt.type === "Teleconsulta" ? (
                                <Video className="h-3 w-3" />
                              ) : (
                                <MapPin className="h-3 w-3" />
                              )}
                              <span className="truncate">{appt.reason} · {appt.type}</span>
                            </div>
                          </div>

                          {/* Badge */}
                          <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                            {st.label}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={handleDemoAction} className="grid place-items-center h-7 w-7 rounded-lg hover:bg-emerald-50 text-emerald-600 transition">
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button onClick={handleDemoAction} className="grid place-items-center h-7 w-7 rounded-lg hover:bg-rose-50 text-rose-500 transition">
                              <XCircle className="h-4 w-4" />
                            </button>
                            <button onClick={handleDemoAction} className="grid place-items-center h-7 w-7 rounded-lg hover:bg-slate-100 text-slate-400 transition">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}

            {/* CTA */}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <Rocket className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Quer uma agenda assim para o seu consultório?</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Gestão completa de agendamentos, lembretes automáticos e muito mais.</p>
              <a
                href="/sign-up"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 transition"
              >
                <Rocket className="h-4 w-4" />
                Criar minha conta grátis
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
