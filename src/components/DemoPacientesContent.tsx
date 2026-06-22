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
  Search,
  MoreHorizontal,
  Phone,
  MessageSquare,
  Clock,
  ChevronRight,
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

type Patient = {
  id: string;
  name: string;
  avatar: string;
  type: string;
  sessions: number;
  lastSession: string;
  nextSession: string | null;
  status: "ativo" | "inativo";
  phone: string;
};

const PATIENTS: Patient[] = [
  { id: "p1", name: "Maria Clara Souza", avatar: "MC", type: "Sessão de Psicoterapia", sessions: 12, lastSession: "22/06/2026", nextSession: "25/06/2026", status: "ativo", phone: "(11) 9 8765-4321" },
  { id: "p2", name: "João Pedro Mendes", avatar: "JP", type: "Consulta Inicial", sessions: 4, lastSession: "21/06/2026", nextSession: "25/06/2026", status: "ativo", phone: "(11) 9 9012-3456" },
  { id: "p3", name: "Roberto Costa", avatar: "RC", type: "Avaliação Psicológica", sessions: 1, lastSession: "22/06/2026", nextSession: "26/06/2026", status: "ativo", phone: "(21) 9 7654-3210" },
  { id: "p4", name: "Ana Paula Ferreira", avatar: "AF", type: "Sessão de Psicoterapia", sessions: 28, lastSession: "23/06/2026", nextSession: "25/06/2026", status: "ativo", phone: "(11) 9 8811-2233" },
  { id: "p5", name: "Fernanda Lima", avatar: "FL", type: "Consulta Inicial", sessions: 8, lastSession: "20/06/2026", nextSession: "26/06/2026", status: "ativo", phone: "(11) 9 5544-6677" },
  { id: "p6", name: "Paulo Souza", avatar: "PS", type: "Consulta Inicial", sessions: 2, lastSession: "18/06/2026", nextSession: "23/06/2026", status: "ativo", phone: "(31) 9 3322-1100" },
  { id: "p7", name: "Carla Mendes", avatar: "CM", type: "Avaliação Psicológica", sessions: 5, lastSession: "15/06/2026", nextSession: "24/06/2026", status: "ativo", phone: "(11) 9 2244-5566" },
  { id: "p8", name: "Lucas Rodrigues", avatar: "LR", type: "Sessão de Psicoterapia", sessions: 19, lastSession: "10/06/2026", nextSession: "24/06/2026", status: "ativo", phone: "(11) 9 6677-8899" },
  { id: "p9", name: "Patricia Alves", avatar: "PA", type: "Consulta Inicial", sessions: 1, lastSession: "01/05/2026", nextSession: null, status: "inativo", phone: "(11) 9 1122-3344" },
  { id: "p10", name: "Eduardo Nunes", avatar: "EN", type: "Sessão de Psicoterapia", sessions: 7, lastSession: "08/06/2026", nextSession: null, status: "inativo", phone: "(41) 9 4455-6677" },
];

const AVATAR_COLORS = [
  "from-teal-400 to-emerald-500",
  "from-blue-400 to-indigo-500",
  "from-violet-400 to-purple-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-cyan-400 to-sky-500",
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

export function DemoPacientesContent() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filter, setFilter] = useState<"todos" | "ativo" | "inativo">("todos");

  const filtered = filter === "todos" ? PATIENTS : PATIENTS.filter((p) => p.status === filter);
  const ativos = PATIENTS.filter((p) => p.status === "ativo").length;
  const inativos = PATIENTS.filter((p) => p.status === "inativo").length;

  function handleDemoAction() {
    toast.info("Acesse o perfil completo do paciente na sua conta real.", { duration: 2500 });
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
                <h1 className="text-lg font-semibold tracking-tight">Pacientes</h1>
                <p className="text-xs text-slate-500">{PATIENTS.length} pacientes cadastrados</p>
              </div>
              <div className="flex-1 max-w-sm ml-4 hidden sm:block">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    placeholder="Buscar por nome ou telefone..."
                    readOnly
                    onClick={() => toast.info("Busca disponível na sua conta real.", { duration: 2000 })}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 cursor-pointer focus:outline-none"
                  />
                </div>
              </div>
              <div className="ml-auto">
                <button
                  onClick={handleDemoAction}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 transition shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo paciente</span>
                </button>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total", value: PATIENTS.length, active: filter === "todos", key: "todos" as const },
                { label: "Ativos", value: ativos, active: filter === "ativo", key: "ativo" as const },
                { label: "Inativos", value: inativos, active: filter === "inativo", key: "inativo" as const },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setFilter(s.key)}
                  className={`rounded-xl border p-4 text-left transition hover:shadow-sm ${
                    s.active
                      ? "border-teal-300 bg-teal-50 ring-1 ring-teal-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`text-2xl font-bold ${s.active ? "text-teal-700" : "text-slate-900"}`}>{s.value}</div>
                  <div className={`text-xs mt-1 ${s.active ? "text-teal-600" : "text-slate-500"}`}>{s.label}</div>
                </button>
              ))}
            </div>

            {/* Patient list */}
            <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  {filter === "todos" ? "Todos os pacientes" : filter === "ativo" ? "Pacientes ativos" : "Pacientes inativos"}
                </h2>
                <span className="text-xs text-slate-400">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
              </div>

              <ul className="divide-y divide-slate-50">
                {filtered.map((p, i) => (
                  <li
                    key={p.id}
                    className="group flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 transition cursor-pointer"
                    onClick={handleDemoAction}
                  >
                    {/* Avatar */}
                    <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} grid place-items-center text-white font-semibold text-sm shrink-0`}>
                      {p.avatar}
                    </div>

                    {/* Name + type */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 truncate">{p.type}</p>
                    </div>

                    {/* Sessions */}
                    <div className="hidden sm:block text-center min-w-[60px]">
                      <div className="text-sm font-semibold text-slate-900">{p.sessions}</div>
                      <div className="text-[10px] text-slate-400">sessões</div>
                    </div>

                    {/* Last session */}
                    <div className="hidden md:block text-center min-w-[90px]">
                      <div className="text-xs text-slate-600 flex items-center gap-1 justify-center">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {p.lastSession}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">última sessão</div>
                    </div>

                    {/* Next session */}
                    <div className="hidden lg:block text-center min-w-[90px]">
                      {p.nextSession ? (
                        <>
                          <div className="text-xs text-teal-700 font-medium">{p.nextSession}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">próxima sessão</div>
                        </>
                      ) : (
                        <div className="text-xs text-slate-300">—</div>
                      )}
                    </div>

                    {/* Status */}
                    <span className={`hidden sm:inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.status === "ativo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {p.status === "ativo" ? "Ativo" : "Inativo"}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); toast.info("WhatsApp integrado na sua conta real.", { duration: 2000 }); }}
                        className="grid place-items-center h-7 w-7 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600 transition"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toast.info("Ligue para o paciente direto pelo app.", { duration: 2000 }); }}
                        className="grid place-items-center h-7 w-7 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDemoAction(); }}
                        className="grid place-items-center h-7 w-7 rounded-lg hover:bg-slate-100 text-slate-400 transition"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 group-hover:text-slate-400 transition" />
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <UserRound className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Gerencie todos os seus pacientes em um só lugar</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Prontuário eletrônico, histórico de sessões, lembretes automáticos e muito mais.</p>
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
