import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/tanstack-start";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  CalendarDays,
  Activity,
  ExternalLink,
  RefreshCw,
  Database,
  CheckCircle2,
  XCircle,
  Eye,
  LayoutDashboard,
  Globe,
  ChevronRight,
  Stethoscope,
  Crown,
  Zap,
  Monitor,
  LifeBuoy,
  MessageCircle,
  Mail,
  Send,
  Ticket,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  Save,
  ChevronDown,
  DollarSign,
  TrendingUp,
  UserPlus,
  Wallet,
  AlertTriangle,
  CreditCard,
  UserX,
  Briefcase,
  Flag,
  Bell,
  ScrollText,
  Settings,
} from "lucide-react";
import { fetchAdminOverview, runSeed, fetchPlanPrices, updatePlanPrice } from "../lib/admin";
import type { AdminOverview, AdminMetrics } from "../lib/admin";
import { AnalyticsSection } from "../components/admin/AnalyticsSection";
import { FinanceiroSection } from "../components/admin/FinanceiroSection";
import {
  ClientesSection,
  AssinaturasSection,
  LeadsSection,
  FeatureFlagsSection,
  AutomacoesSection,
  NotificationsSection,
  AuditSection,
  SystemConfigSection,
} from "../components/admin/AdminSections";
import {
  fetchSupportConfig,
  updateSupportConfig,
  fetchAllTickets,
  fetchTicketMessages,
  sendTicketMessage,
  updateTicketStatus,
  type SupportTicket,
  type TicketMessage,
  type TicketStatus,
} from "../lib/support";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — CuidandoVC" }] }),
  component: AdminPage,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLANO_LABEL: Record<string, { label: string; color: string }> = {
  free: { label: "Free", color: "bg-slate-100 text-slate-600" },
  pro: { label: "Pro", color: "bg-violet-100 text-violet-700" },
  clinic: { label: "Clinic", color: "bg-amber-100 text-amber-700" },
};

// ─── Component ────────────────────────────────────────────────────────────────

function AdminPage() {
  return (
    <>
      <SignedIn>
        <AdminContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

type AdminTab =
  | "dashboard"
  | "clientes"
  | "assinaturas"
  | "leads"
  | "suporte"
  | "automacoes"
  | "analytics"
  | "financeiro"
  | "flags"
  | "notificacoes"
  | "auditoria"
  | "config";

const NAV: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "assinaturas", label: "Assinaturas", icon: CreditCard },
  { id: "leads", label: "Leads CRM", icon: Briefcase },
  { id: "suporte", label: "Suporte", icon: LifeBuoy },
  { id: "automacoes", label: "Automações", icon: Zap },
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "financeiro", label: "Financeiro", icon: Wallet },
  { id: "flags", label: "Feature Flags", icon: Flag },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "auditoria", label: "Auditoria", icon: ScrollText },
  { id: "config", label: "Configurações do Sistema", icon: Settings },
];

function AdminContent() {
  const qc = useQueryClient();
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"patient" | "split">("patient");

  const { data, isLoading, error } = useQuery<AdminOverview>({
    queryKey: ["admin-overview"],
    queryFn: () => fetchAdminOverview(),
    refetchInterval: 30_000,
  });

  const seed = useMutation({
    mutationFn: () => runSeed(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-overview"] }),
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando admin...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="text-sm text-rose-400">Erro ao carregar dados.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-icon.png"
              alt="CuidandoVC"
              className="size-6 rounded-md object-contain"
            />
            <span className="text-sm font-bold tracking-tight">CuidandoVC</span>
            <span className="text-xs text-slate-500 font-mono border border-slate-700 rounded px-1.5 py-0.5">
              admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Feature badges */}
            <div className="hidden md:flex items-center gap-2">
              <FeatureBadge ok={data.features.mp} label="MP" />
              <FeatureBadge ok={data.features.resend} label="Email" />
              <FeatureBadge ok={data.features.cron} label="Cron" />
            </div>

            <button
              onClick={() => seed.mutate()}
              disabled={seed.isPending}
              className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition disabled:opacity-50"
            >
              <Database className="h-3.5 w-3.5" />
              {seed.isPending ? "Seeding..." : seed.data ? seed.data.message : "Seed de teste"}
            </button>

            <button
              onClick={() => qc.invalidateQueries({ queryKey: ["admin-overview"] })}
              className="grid size-8 place-items-center rounded-md border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-56 shrink-0 border-r border-slate-800 min-h-[calc(100vh-3rem)] py-4 px-3 sticky top-12 self-start">
          <nav className="space-y-0.5">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setAdminTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                  adminTab === id
                    ? "bg-slate-800 text-slate-100 font-medium"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 px-6 py-6 space-y-6">
          {/* Seletor de seção no mobile */}
          <select
            value={adminTab}
            onChange={(e) => setAdminTab(e.target.value as AdminTab)}
            className="md:hidden w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            {NAV.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>

          {adminTab === "suporte" && <AdminSuporteTab />}
          {adminTab === "analytics" && <AnalyticsSection />}
          {adminTab === "financeiro" && <FinanceiroSection />}
          {adminTab === "clientes" && <ClientesSection professionals={data.professionals} />}
          {adminTab === "assinaturas" && <AssinaturasSection professionals={data.professionals} />}
          {adminTab === "leads" && <LeadsSection />}
          {adminTab === "automacoes" && <AutomacoesSection />}
          {adminTab === "flags" && <FeatureFlagsSection />}
          {adminTab === "notificacoes" && <NotificationsSection />}
          {adminTab === "auditoria" && <AuditSection />}
          {adminTab === "config" && <SystemConfigSection />}
          {adminTab === "dashboard" && (
            <>
              {/* Métricas do negócio */}
              <MetricsDashboard metrics={data.metrics} />

              {/* Main grid */}
              <div className="grid grid-cols-[340px_1fr] gap-6">
                {/* Left: Professionals list */}
                <div className="space-y-3">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Médicos cadastrados
                  </h2>

                  {data.professionals.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
                      <p className="text-sm text-slate-500 mb-3">Nenhum médico cadastrado</p>
                      <button
                        onClick={() => seed.mutate()}
                        className="text-xs text-teal-400 hover:text-teal-300"
                      >
                        Executar seed de teste →
                      </button>
                    </div>
                  ) : (
                    data.professionals.map((prof) => (
                      <ProfessionalCard
                        key={prof.id}
                        prof={prof}
                        origin={origin}
                        isSelected={previewSlug === prof.slug}
                        onPreview={() => {
                          setPreviewSlug(prof.slug);
                        }}
                      />
                    ))
                  )}
                </div>

                {/* Right: Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Preview
                    </h2>
                    {previewSlug && (
                      <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
                        <button
                          onClick={() => setPreviewMode("patient")}
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${previewMode === "patient" ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
                        >
                          <Globe className="h-3 w-3" /> Paciente
                        </button>
                        <button
                          onClick={() => setPreviewMode("split")}
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${previewMode === "split" ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
                        >
                          <Monitor className="h-3 w-3" /> Split
                        </button>
                      </div>
                    )}
                  </div>

                  {!previewSlug ? (
                    <EmptyPreview />
                  ) : previewMode === "patient" ? (
                    <PatientPreview slug={previewSlug} origin={origin} />
                  ) : (
                    <SplitPreview slug={previewSlug} origin={origin} />
                  )}
                </div>
              </div>

              {/* Feature status */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
                  Status das integrações
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <FeatureCard
                    ok={data.features.mp}
                    title="Mercado Pago"
                    desc={
                      data.features.mp ? "Pagamentos ativos" : "Adicionar MERCADOPAGO_ACCESS_TOKEN"
                    }
                  />
                  <FeatureCard
                    ok={data.features.resend}
                    title="Resend (Email)"
                    desc={data.features.resend ? "Emails ativos" : "Adicionar RESEND_API_KEY"}
                  />
                  <FeatureCard
                    ok={data.features.twilio}
                    title="Twilio (WhatsApp)"
                    desc={data.features.twilio ? "WhatsApp ativo" : "Adicionar TWILIO_ACCOUNT_SID"}
                  />
                  <FeatureCard
                    ok={data.features.cron}
                    title="Cron (Lembretes)"
                    desc={data.features.cron ? "Cron ativo" : "Adicionar CRON_SECRET"}
                  />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── AdminSuporteTab ──────────────────────────────────────────────────────────

const STATUS_CFG: Record<TicketStatus, { label: string; cls: string }> = {
  aberto: { label: "Aberto", cls: "bg-blue-900/40 text-blue-300 ring-blue-700" },
  em_andamento: { label: "Em andamento", cls: "bg-amber-900/40 text-amber-300 ring-amber-700" },
  resolvido: { label: "Resolvido", cls: "bg-emerald-900/40 text-emerald-300 ring-emerald-700" },
  fechado: { label: "Fechado", cls: "bg-slate-800 text-slate-400 ring-slate-700" },
};

const PRIORIDADE_CFG: Record<string, { dot: string; label: string }> = {
  baixa: { dot: "bg-slate-400", label: "Baixa" },
  normal: { dot: "bg-blue-400", label: "Normal" },
  alta: { dot: "bg-amber-400", label: "Alta" },
  urgente: { dot: "bg-rose-500", label: "Urgente" },
};

function AdminSuporteTab() {
  const qc = useQueryClient();
  const [view, setView] = useState<"main" | "chat">("main");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // ── Config form ──
  const { data: cfg, isLoading: cfgLoading } = useQuery({
    queryKey: ["supportConfig"],
    queryFn: () => fetchSupportConfig(),
    staleTime: 30_000,
  });

  const [cfgForm, setCfgForm] = useState({ email: "", whatsapp: "", whatsappMessage: "" });
  const [cfgSaved, setCfgSaved] = useState(false);

  useEffect(() => {
    if (cfg) {
      setCfgForm({
        email: cfg.email ?? "",
        whatsapp: cfg.whatsapp ?? "",
        whatsappMessage: cfg.whatsappMessage ?? "Olá, preciso de ajuda com o CuidandoVC",
      });
    }
  }, [cfg]);

  const cfgMutation = useMutation({
    mutationFn: () => updateSupportConfig({ data: cfgForm }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["supportConfig"] });
      setCfgSaved(true);
      setTimeout(() => setCfgSaved(false), 2500);
    },
  });

  // ── Tickets ──
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["adminTickets"],
    queryFn: () => fetchAllTickets(),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  const activeTicket = tickets.find((t) => t.id === activeTicketId) ?? null;
  const unread = tickets.filter((t) => !t.lidoAdmin && t.status !== "fechado").length;

  if (view === "chat" && activeTicketId) {
    return (
      <AdminTicketChat
        ticketId={activeTicketId}
        ticket={activeTicket}
        onBack={() => {
          setView("main");
          void qc.invalidateQueries({ queryKey: ["adminTickets"] });
        }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
      {/* ── Config ── */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Configurações de Contato
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              <Mail className="h-3 w-3 inline mr-1" /> E-mail de suporte
            </label>
            <input
              value={cfgForm.email}
              onChange={(e) => setCfgForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="suporte@seudomain.com"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              <MessageCircle className="h-3 w-3 inline mr-1" /> WhatsApp (com DDI)
            </label>
            <input
              value={cfgForm.whatsapp}
              onChange={(e) => setCfgForm((f) => ({ ...f, whatsapp: e.target.value }))}
              placeholder="+5511999990000"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Mensagem padrão do WhatsApp
            </label>
            <textarea
              value={cfgForm.whatsappMessage}
              onChange={(e) => setCfgForm((f) => ({ ...f, whatsappMessage: e.target.value }))}
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
            />
          </div>
          <button
            disabled={cfgMutation.isPending || cfgLoading}
            onClick={() => cfgMutation.mutate()}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white transition"
          >
            {cfgSaved ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Salvo!
              </>
            ) : cfgMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Salvar configurações
              </>
            )}
          </button>
          <p className="text-[10px] text-slate-500 text-center">
            Estas informações aparecem na aba Suporte dos médicos.
            <br />
            Para tickets internos, configure ADMIN_CLERK_IDS no Vercel.
          </p>
        </div>
      </div>

      {/* ── Tickets ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Chamados
            {unread > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-4 w-4 rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {unread}
              </span>
            )}
          </h2>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["adminTickets"] })}
            className="grid size-7 place-items-center rounded-md border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {ticketsLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
            <Ticket className="h-8 w-8 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Nenhum chamado ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => {
              const sCfg = STATUS_CFG[t.status];
              const pCfg = PRIORIDADE_CFG[t.prioridade] ?? PRIORIDADE_CFG.normal;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTicketId(t.id);
                    setView("chat");
                  }}
                  className={`w-full text-left rounded-xl border p-4 transition group ${
                    !t.lidoAdmin && t.status !== "fechado"
                      ? "border-teal-700/60 bg-teal-900/20 hover:bg-teal-900/30"
                      : "border-slate-800 bg-slate-900 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${pCfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-100 truncate">{t.titulo}</p>
                        {!t.lidoAdmin && t.status !== "fechado" && (
                          <span className="shrink-0 rounded-full bg-teal-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                            NOVO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {t.professional?.nomeCompleto ?? "—"} · {t.professional?.email ?? ""}
                      </p>
                      {t.lastMessage && (
                        <p className="text-xs text-slate-500 mt-1 truncate">{t.lastMessage}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${sCfg.cls}`}
                        >
                          {sCfg.label}
                        </span>
                        {t.categoria && (
                          <span className="text-[10px] text-slate-500">{t.categoria}</span>
                        )}
                        <span className="text-[10px] text-slate-600 ml-auto">
                          {new Date(t.criadoEm).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-700 group-hover:text-teal-400 shrink-0 mt-1 transition" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AdminTicketChat ──────────────────────────────────────────────────────────

function AdminTicketChat({
  ticketId,
  ticket,
  onBack,
}: {
  ticketId: string;
  ticket: SupportTicket | null;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["ticketMessages", ticketId],
    queryFn: () => fetchTicketMessages({ data: { ticketId } }),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const sendMutation = useMutation({
    mutationFn: () => sendTicketMessage({ data: { ticketId, conteudo: text } }),
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: ["ticketMessages", ticketId] });
      void qc.invalidateQueries({ queryKey: ["adminTickets"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: TicketStatus) => updateTicketStatus({ data: { ticketId, status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminTickets"] }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sCfg = ticket ? STATUS_CFG[ticket.status] : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="h-8 w-8 grid place-items-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 transition shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-slate-100 truncate">
            {ticket?.titulo ?? "Chamado"}
          </p>
          <p className="text-xs text-slate-400">
            {ticket?.professional?.nomeCompleto ?? "—"} · {ticket?.professional?.email ?? ""}
          </p>
        </div>

        {/* Status dropdown */}
        {ticket && (
          <div className="relative shrink-0">
            <select
              value={ticket.status}
              onChange={(e) => statusMutation.mutate(e.target.value as TicketStatus)}
              disabled={statusMutation.isPending}
              className="appearance-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 pr-8 text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="aberto">Aberto</option>
              <option value="em_andamento">Em andamento</option>
              <option value="resolvido">Resolvido</option>
              <option value="fechado">Fechado</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {sCfg && (
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${sCfg.cls}`}
          >
            {sCfg.label}
          </span>
          {ticket?.categoria && <span className="text-xs text-slate-500">{ticket.categoria}</span>}
          {ticket?.prioridade && (
            <span className="text-xs text-slate-500">
              Prioridade: {PRIORIDADE_CFG[ticket.prioridade]?.label}
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col">
        <div className="flex-1 p-4 space-y-3 min-h-[360px] max-h-[520px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-10">Nenhuma mensagem</p>
          ) : (
            messages.map((msg) => <AdminMessageBubble key={msg.id} msg={msg} />)
          )}
          <div ref={bottomRef} />
        </div>

        {ticket?.status !== "fechado" ? (
          <div className="border-t border-slate-800 p-3 flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (text.trim()) sendMutation.mutate();
                }
              }}
              placeholder="Responder ao médico... (Enter para enviar)"
              rows={2}
              maxLength={5000}
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
            />
            <button
              disabled={!text.trim() || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
              className="h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white transition"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        ) : (
          <div className="border-t border-slate-800 p-3 text-center text-xs text-slate-500">
            Ticket fechado. Reabra alterando o status acima.
          </div>
        )}
      </div>
    </div>
  );
}

function AdminMessageBubble({ msg }: { msg: TicketMessage }) {
  const isAdmin = msg.autorRole === "admin";
  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isAdmin
            ? "bg-teal-600 text-white rounded-br-sm"
            : "bg-slate-800 text-slate-200 rounded-bl-sm"
        }`}
      >
        {!isAdmin && <p className="text-[10px] font-semibold text-slate-400 mb-1">Médico</p>}
        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.conteudo}</p>
        <p
          className={`text-[10px] mt-1 ${isAdmin ? "text-teal-200" : "text-slate-500"} text-right`}
        >
          {new Date(msg.criadoEm).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeatureBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs rounded px-1.5 py-0.5 font-mono ${ok ? "bg-emerald-950 text-emerald-400 border border-emerald-900" : "bg-slate-800 text-slate-500 border border-slate-700"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-slate-600"}`} />
      {label}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className={`flex items-center gap-2 mb-2 ${color}`}>
        {icon}
        <span className="text-xs font-medium text-slate-400">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// ─── Métricas do negócio ──────────────────────────────────────────────────────

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className={`flex items-center gap-2 mb-2 ${color}`}>
        {icon}
        <span className="text-xs font-medium text-slate-400">{label}</span>
      </div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-1.5">{sub}</p>}
    </div>
  );
}

function MetricsDashboard({ metrics: m }: { metrics: AdminMetrics }) {
  return (
    <div className="space-y-5">
      {/* ── Crescimento ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Crescimento
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<Users className="h-4 w-4" />}
            label="Total de médicos"
            value={m.totalMedicos}
            color="text-violet-400"
          />
          <MetricCard
            icon={<UserPlus className="h-4 w-4" />}
            label="Novos no mês"
            value={m.novosNoMes}
            color="text-emerald-400"
          />
          <MetricCard
            icon={<Activity className="h-4 w-4" />}
            label="Total de pacientes"
            value={m.totalPacientes}
            color="text-teal-400"
          />
          <MetricCard
            icon={<CalendarDays className="h-4 w-4" />}
            label="Total de agendamentos"
            value={m.totalAgendamentos}
            color="text-amber-400"
          />
        </div>
      </div>

      {/* ── Profissionais por plano ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Profissionais por plano
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PlanCard
            label="Plano Gratuito"
            value={m.porPlano.free}
            badge="FREE"
            badgeCls="bg-slate-700 text-slate-300"
            barCls="bg-slate-500"
            total={m.totalMedicos}
          />
          <PlanCard
            label="Plano PRO"
            value={m.porPlano.pro}
            badge="PRO"
            badgeCls="bg-violet-600/30 text-violet-300 ring-1 ring-violet-600/40"
            barCls="bg-violet-500"
            total={m.totalMedicos}
          />
          <PlanCard
            label="Plano Clínica"
            value={m.porPlano.clinic}
            badge="CLINIC"
            badgeCls="bg-amber-600/30 text-amber-300 ring-1 ring-amber-600/40"
            barCls="bg-amber-500"
            total={m.totalMedicos}
          />
        </div>
      </div>

      {/* ── Financeiro (assinaturas) ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Financeiro — Assinaturas (SaaS)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            icon={<DollarSign className="h-4 w-4" />}
            label="MRR"
            value={formatBRL(m.mrr)}
            sub="Receita recorrente mensal"
            color="text-emerald-400"
          />
          <MetricCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Receita anual est."
            value={formatBRL(m.receitaAnualEstimada)}
            sub="MRR × 12"
            color="text-emerald-400"
          />
          <MetricCard
            icon={<Zap className="h-4 w-4" />}
            label="Trial ativo"
            value={m.trialAtivo}
            color="text-sky-400"
          />
          <MetricCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Inadimplentes"
            value={m.inadimplentes}
            color="text-orange-400"
          />
          <MetricCard
            icon={<UserX className="h-4 w-4" />}
            label="Churn no mês"
            value={m.churnNoMes}
            sub="Cancelamentos"
            color="text-rose-400"
          />
          <MetricCard
            icon={<Ticket className="h-4 w-4" />}
            label="Tickets abertos"
            value={m.ticketsAbertos}
            color="text-indigo-400"
          />
        </div>
      </div>

      {/* ── Pagamentos (split paciente→médico) ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Pagamentos processados (pacientes)
        </h2>
        <div className="grid grid-cols-2 gap-4 md:max-w-md">
          <MetricCard
            icon={<CreditCard className="h-4 w-4" />}
            label="Transações pagas"
            value={m.pagamentos.count}
            color="text-teal-400"
          />
          <MetricCard
            icon={<Wallet className="h-4 w-4" />}
            label="Volume processado"
            value={formatBRL(m.pagamentos.valorTotal)}
            color="text-emerald-400"
          />
        </div>
      </div>

      {/* ── Editor de preços dos planos ── */}
      <PlanPriceEditor />
    </div>
  );
}

function PlanCard({
  label,
  value,
  badge,
  badgeCls,
  barCls,
  total,
}: {
  label: string;
  value: number;
  badge: string;
  badgeCls: string;
  barCls: string;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badgeCls}`}>{badge}</span>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold leading-none">{value}</p>
        <span className="text-xs text-slate-500">{pct}%</span>
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PlanPriceEditor() {
  const qc = useQueryClient();
  const { data: prices } = useQuery({
    queryKey: ["planPrices"],
    queryFn: () => fetchPlanPrices(),
    staleTime: 60_000,
  });

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savedPlano, setSavedPlano] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({
      plano,
      valorMensal,
    }: {
      plano: "free" | "pro" | "clinic";
      valorMensal: string;
    }) => updatePlanPrice({ data: { plano, valorMensal } }),
    onSuccess: (_r, vars) => {
      setSavedPlano(vars.plano);
      void qc.invalidateQueries({ queryKey: ["planPrices"] });
      void qc.invalidateQueries({ queryKey: ["admin-overview"] });
      setTimeout(() => setSavedPlano(null), 2000);
    },
  });

  const PLAN_LABEL: Record<string, string> = { free: "Gratuito", pro: "PRO", clinic: "Clínica" };

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
        Preços dos planos (base do MRR)
      </h2>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs text-slate-500 mb-4">
          Defina o valor mensal de cada plano. O MRR é calculado como a soma das assinaturas ativas
          multiplicadas por estes preços.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(prices ?? []).map((p) => {
            const current = draft[p.plano] ?? p.valorMensal;
            return (
              <div key={p.plano} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {PLAN_LABEL[p.plano]}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">R$</span>
                  <input
                    value={current}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [p.plano]: e.target.value.replace(/[^0-9.]/g, "") }))
                    }
                    placeholder="0.00"
                    className="flex-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                  <button
                    disabled={mutation.isPending || current === p.valorMensal}
                    onClick={() =>
                      mutation.mutate({
                        plano: p.plano,
                        valorMensal: current,
                      })
                    }
                    className="shrink-0 grid size-8 place-items-center rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white transition"
                    title="Salvar"
                  >
                    {savedPlano === p.plano ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : mutation.isPending && mutation.variables?.plano === p.plano ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProfessionalCard({
  prof,
  origin,
  isSelected,
  onPreview,
}: {
  prof: AdminOverview["professionals"][number];
  origin: string;
  isSelected: boolean;
  onPreview: () => void;
}) {
  const plano = PLANO_LABEL[prof.plano] ?? PLANO_LABEL.free;

  return (
    <div
      className={`rounded-xl border bg-slate-900 p-4 transition cursor-pointer ${
        isSelected
          ? "border-teal-500/50 ring-1 ring-teal-500/20"
          : "border-slate-800 hover:border-slate-700"
      }`}
      onClick={onPreview}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-100">{prof.nomeCompleto}</p>
            {!prof.ativo && (
              <span className="text-xs bg-slate-800 text-slate-500 rounded px-1.5 py-0.5">
                inativo
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{prof.especialidade}</p>
        </div>
        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${plano.color}`}>
          {plano.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          {prof.servicesCount} serviços
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          {prof.appointmentsHoje} hoje
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {prof.appointmentsTotal} total
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-teal-900/50 border border-teal-800/50 py-1.5 text-xs font-medium text-teal-400 hover:bg-teal-900 transition"
        >
          <Eye className="h-3 w-3" />
          Preview paciente
        </button>
        <a
          href={`${origin}/${prof.slug}`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="grid size-7 place-items-center rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 transition"
          title="Abrir em nova aba"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="h-[600px] rounded-xl border border-dashed border-slate-800 bg-slate-900/50 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-slate-800">
          <Eye className="h-5 w-5 text-slate-500" />
        </div>
        <p className="text-sm text-slate-500">Selecione um médico para visualizar</p>
        <p className="text-xs text-slate-600 mt-1">
          Click em um card para ver a página do paciente
        </p>
      </div>
    </div>
  );
}

function PatientPreview({ slug, origin }: { slug: string; origin: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
      {/* Browser bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-slate-600" />
          <div className="h-2.5 w-2.5 rounded-full bg-slate-600" />
          <div className="h-2.5 w-2.5 rounded-full bg-slate-600" />
        </div>
        <div className="flex-1 rounded-md bg-slate-700 px-3 py-1 text-xs text-slate-400 font-mono">
          {origin}/{slug}
        </div>
        <a
          href={`${origin}/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-slate-500 hover:text-slate-300 transition"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <iframe
        key={slug}
        src={`${origin}/${slug}`}
        className="w-full h-[600px] bg-white"
        title={`Página pública — ${slug}`}
      />
    </div>
  );
}

function SplitPreview({ slug, origin }: { slug: string; origin: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Doctor side */}
      <div className="rounded-xl overflow-hidden border border-violet-900/50 bg-slate-900">
        <div className="flex items-center gap-2 px-3 py-2 bg-violet-950/50 border-b border-violet-900/40">
          <LayoutDashboard className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-medium text-violet-300">Dashboard do Médico</span>
          <div className="flex-1" />
          <a href={`${origin}/dashboard`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3 w-3 text-violet-500 hover:text-violet-300" />
          </a>
        </div>
        <iframe
          src={`${origin}/dashboard`}
          className="w-full h-[560px] bg-white"
          title="Dashboard do médico"
        />
      </div>

      {/* Patient side */}
      <div className="rounded-xl overflow-hidden border border-teal-900/50 bg-slate-900">
        <div className="flex items-center gap-2 px-3 py-2 bg-teal-950/50 border-b border-teal-900/40">
          <Globe className="h-3.5 w-3.5 text-teal-400" />
          <span className="text-xs font-medium text-teal-300">Página do Paciente</span>
          <div className="flex-1" />
          <a href={`${origin}/${slug}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3 w-3 text-teal-500 hover:text-teal-300" />
          </a>
        </div>
        <iframe
          key={slug}
          src={`${origin}/${slug}`}
          className="w-full h-[560px] bg-white"
          title={`Página pública — ${slug}`}
        />
      </div>
    </div>
  );
}

function FeatureCard({ ok, title, desc }: { ok: boolean; title: string; desc: string }) {
  return (
    <div
      className={`rounded-lg border p-3 ${ok ? "border-emerald-900/50 bg-emerald-950/30" : "border-slate-800 bg-slate-900/50"}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-slate-600 shrink-0" />
        )}
        <span className="text-xs font-semibold text-slate-200">{title}</span>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
