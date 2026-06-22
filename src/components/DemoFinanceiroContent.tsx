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
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Filter,
  ChevronDown,
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

const MONTHLY_REVENUE = [
  { month: "Jan", receita: 2800 },
  { month: "Fev", receita: 3200 },
  { month: "Mar", receita: 2950 },
  { month: "Abr", receita: 3800 },
  { month: "Mai", receita: 3600 },
  { month: "Jun", receita: 4350 },
];

type TxStatus = "pago" | "aguardando" | "cancelado";

type Transaction = {
  id: string;
  date: string;
  patient: string;
  avatar: string;
  service: string;
  method: "PIX" | "Crédito" | "Débito";
  amount: number;
  status: TxStatus;
};

const TRANSACTIONS: Transaction[] = [
  { id: "t1", date: "22/06/2026", patient: "Maria Clara S.", avatar: "MC", service: "Sessão de Psicoterapia", method: "PIX", amount: 150, status: "pago" },
  { id: "t2", date: "22/06/2026", patient: "Roberto Costa", avatar: "RC", service: "Avaliação Psicológica", method: "Crédito", amount: 250, status: "pago" },
  { id: "t3", date: "21/06/2026", patient: "João Pedro M.", avatar: "JP", service: "Consulta Inicial", method: "PIX", amount: 180, status: "pago" },
  { id: "t4", date: "20/06/2026", patient: "Fernanda Lima", avatar: "FL", service: "Consulta Inicial", method: "PIX", amount: 180, status: "pago" },
  { id: "t5", date: "18/06/2026", patient: "Paulo Souza", avatar: "PS", service: "Consulta Inicial", method: "Débito", amount: 180, status: "aguardando" },
  { id: "t6", date: "15/06/2026", patient: "Carla Mendes", avatar: "CM", service: "Avaliação Psicológica", method: "PIX", amount: 250, status: "pago" },
  { id: "t7", date: "10/06/2026", patient: "Lucas Rodrigues", avatar: "LR", service: "Sessão de Psicoterapia", method: "Crédito", amount: 150, status: "pago" },
  { id: "t8", date: "08/06/2026", patient: "Eduardo Nunes", avatar: "EN", service: "Sessão de Psicoterapia", method: "PIX", amount: 150, status: "pago" },
  { id: "t9", date: "05/06/2026", patient: "Patricia Alves", avatar: "PA", service: "Consulta Inicial", method: "PIX", amount: 180, status: "cancelado" },
  { id: "t10", date: "01/06/2026", patient: "Ana Paula F.", avatar: "AF", service: "Sessão de Psicoterapia", method: "PIX", amount: 150, status: "pago" },
];

const STATUS_TX: Record<TxStatus, { label: string; bg: string; text: string; icon: typeof CheckCircle2 }> = {
  pago: { label: "Pago", bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2 },
  aguardando: { label: "Aguardando", bg: "bg-amber-50", text: "text-amber-700", icon: Clock },
  cancelado: { label: "Cancelado", bg: "bg-rose-50", text: "text-rose-700", icon: XCircle },
};

const METHOD_COLORS: Record<string, string> = {
  PIX: "bg-green-100 text-green-700",
  Crédito: "bg-blue-100 text-blue-700",
  Débito: "bg-violet-100 text-violet-700",
};

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

export function DemoFinanceiroContent() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const totalPago = TRANSACTIONS.filter((t) => t.status === "pago").reduce((s, t) => s + t.amount, 0);
  const totalPendente = TRANSACTIONS.filter((t) => t.status === "aguardando").reduce((s, t) => s + t.amount, 0);
  const totalConsultas = TRANSACTIONS.filter((t) => t.status === "pago").length;
  const ticketMedio = totalConsultas > 0 ? totalPago / totalConsultas : 0;

  function handleDemoAction() {
    toast.info("Exporte relatórios e gerencie pagamentos na sua conta real.", { duration: 2500 });
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
                <h1 className="text-lg font-semibold tracking-tight">Financeiro</h1>
                <p className="text-xs text-slate-500">Junho 2026</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={handleDemoAction}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filtrar
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleDemoAction}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 transition shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Exportar</span>
                </button>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-6">
            {/* Stats */}
            <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                {
                  label: "Faturamento do mês",
                  value: `R$ ${totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                  delta: "+12% vs mês ant.",
                  trend: "up" as const,
                  icon: DollarSign,
                  iconBg: "bg-emerald-50",
                  iconText: "text-emerald-600",
                },
                {
                  label: "Consultas pagas",
                  value: String(totalConsultas),
                  delta: "+3 vs mês ant.",
                  trend: "up" as const,
                  icon: CheckCircle2,
                  iconBg: "bg-teal-50",
                  iconText: "text-teal-600",
                },
                {
                  label: "Ticket médio",
                  value: `R$ ${ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                  delta: "+R$ 8 vs mês ant.",
                  trend: "up" as const,
                  icon: TrendingUp,
                  iconBg: "bg-indigo-50",
                  iconText: "text-indigo-600",
                },
                {
                  label: "Pendente",
                  value: `R$ ${totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                  delta: "1 cobrança aberta",
                  trend: "down" as const,
                  icon: Clock,
                  iconBg: "bg-amber-50",
                  iconText: "text-amber-600",
                },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-white border border-slate-200 p-5 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div className={`h-10 w-10 rounded-xl grid place-items-center ${s.iconBg}`}>
                      <s.icon className={`h-5 w-5 ${s.iconText}`} />
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      s.trend === "up" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {s.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
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

            {/* Charts */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Bar chart */}
              <div className="xl:col-span-2 rounded-2xl bg-white border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">Receita mensal</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Últimos 6 meses</p>
                  </div>
                  <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                    Total: R$ 20.700
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={MONTHLY_REVENUE} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                      formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Receita"]}
                    />
                    <Bar dataKey="receita" fill="url(#finGrad)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Payment method breakdown */}
              <div className="rounded-2xl bg-white border border-slate-200 p-6">
                <h3 className="text-sm font-semibold tracking-tight mb-5">Formas de pagamento</h3>
                <div className="space-y-4">
                  {[
                    { method: "PIX", pct: 68, amount: "R$ 2.958,00", color: "bg-green-500" },
                    { method: "Cartão de Crédito", pct: 24, amount: "R$ 1.044,00", color: "bg-blue-500" },
                    { method: "Cartão de Débito", pct: 8, amount: "R$ 348,00", color: "bg-violet-500" },
                  ].map((item) => (
                    <div key={item.method}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-700 font-medium">{item.method}</span>
                        <div className="text-right">
                          <span className="font-semibold text-slate-900">{item.pct}%</span>
                          <span className="text-slate-400 ml-1">· {item.amount}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    Receba pagamentos por PIX, cartão e muito mais direto pelo app.
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

            {/* Transactions */}
            <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold tracking-tight">Extrato de transações</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{TRANSACTIONS.length} transações este mês</p>
                </div>
              </div>
              <ul className="divide-y divide-slate-50">
                {TRANSACTIONS.map((tx) => {
                  const st = STATUS_TX[tx.status];
                  const StatusIcon = st.icon;
                  return (
                    <li key={tx.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/80 transition">
                      {/* Avatar */}
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center text-xs font-semibold text-slate-700 shrink-0">
                        {tx.avatar}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{tx.patient}</p>
                        <p className="text-xs text-slate-500 truncate">{tx.service} · {tx.date}</p>
                      </div>

                      {/* Method */}
                      <span className={`hidden sm:inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${METHOD_COLORS[tx.method]}`}>
                        {tx.method}
                      </span>

                      {/* Status */}
                      <span className={`hidden md:inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                        <StatusIcon className="h-3 w-3" />
                        {st.label}
                      </span>

                      {/* Amount */}
                      <span className={`text-sm font-semibold shrink-0 ${tx.status === "cancelado" ? "text-slate-400 line-through" : "text-slate-900"}`}>
                        R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
