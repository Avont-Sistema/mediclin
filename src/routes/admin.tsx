import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignedIn, SignedOut, useSignIn, useClerk } from "@clerk/tanstack-start";
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
  Plug,
  Palette,
  Plus,
  Pencil,
  Trash2,
  FlaskConical,
  Link2,
  LogOut,
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
  IntegracoesSection,
} from "../components/admin/AdminSections";
import {
  fetchSupportConfig,
  updateSupportConfig,
  fetchAllTickets,
  fetchTicketMessages,
  sendTicketMessage,
  updateTicketStatus,
  fetchAllFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  type SupportTicket,
  type TicketMessage,
  type TicketStatus,
  type FaqItem,
} from "../lib/support";
import { roleCanAccessTab, type AdminContext } from "../lib/admin-roles";
import { getAdminContext } from "../lib/admin-context";
import { fetchAppConfig, updateAppConfig } from "../lib/app-config";
import { AfiliadosSection } from "../components/admin/AfiliadosSection";
import { fetchOrCreateMyCode } from "../lib/affiliates";
import {
  fetchTestProfessionals,
  simulateSubscription,
  simulatePayment,
  type TestScenario,
} from "../lib/admin-testmode";

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
        <AdminLoginScreen />
      </SignedOut>
    </>
  );
}

// ─── Tela de login do admin (e-mail + senha via Clerk) ────────────────────────

function AdminLoginScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setError(null);
    setLoading(true);
    try {
      const res = await signIn.create({ identifier: email, password });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        window.location.reload();
      } else {
        setError("Não foi possível concluir o login. Verifique seus dados.");
        setLoading(false);
      }
    } catch (err) {
      const e2 = err as { errors?: { longMessage?: string; message?: string }[] };
      setError(
        e2?.errors?.[0]?.longMessage || e2?.errors?.[0]?.message || "E-mail ou senha inválidos.",
      );
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!isLoaded || !signIn) return;
    setError(null);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${origin}/sso-callback`,
        redirectUrlComplete: `${origin}/admin`,
      });
    } catch {
      setError("Falha ao entrar com Google.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          <img
            src="/logo-icon.png"
            alt="CuidandoVC"
            className="h-8 w-8 rounded-md object-contain"
          />
          <span className="text-lg font-bold text-slate-100">CuidandoVC</span>
          <span className="rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
            admin
          </span>
        </div>
        <h1 className="text-center text-xl font-bold text-slate-100">Painel administrativo</h1>
        <p className="mt-1 text-center text-sm text-slate-500">Acesso restrito à equipe.</p>

        <form onSubmit={handleLogin} className="mt-6 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            autoComplete="username"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-teal-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            autoComplete="current-password"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-teal-500"
          />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !isLoaded}
            className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-2 text-[11px] text-slate-600">
          <div className="h-px flex-1 bg-slate-800" /> ou{" "}
          <div className="h-px flex-1 bg-slate-800" />
        </div>
        <button
          onClick={handleGoogle}
          disabled={!isLoaded}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-60"
        >
          Entrar com Google
        </button>
      </div>
    </div>
  );
}

// ─── Tela de "aguardando aprovação" (usuário sem cargo) ───────────────────────

function PendingApprovalScreen({ ctx }: { ctx: AdminContext }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-900/30">
          <Clock className="h-7 w-7 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-100">Acesso aguardando aprovação</h1>
        <p className="mt-2 text-sm text-slate-400">
          Sua conta foi registrada{ctx.email ? ` (${ctx.email})` : ""}, mas ainda não tem um cargo
          atribuído. Um administrador precisa liberar seu acesso e definir suas permissões.
        </p>
        <p className="mt-4 text-xs text-slate-600">
          Assim que for aprovado, recarregue esta página.
        </p>
      </div>
    </div>
  );
}

type AdminTab =
  | "dashboard"
  | "clientes"
  | "assinaturas"
  | "leads"
  | "afiliados"
  | "suporte"
  | "automacoes"
  | "analytics"
  | "financeiro"
  | "integracoes"
  | "flags"
  | "notificacoes"
  | "auditoria"
  | "personalizacao"
  | "modo-teste"
  | "config";

const NAV: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "assinaturas", label: "Assinaturas", icon: CreditCard },
  { id: "leads", label: "Leads CRM", icon: Briefcase },
  { id: "afiliados", label: "Afiliados", icon: Link2 },
  { id: "suporte", label: "Suporte", icon: LifeBuoy },
  { id: "automacoes", label: "Automações", icon: Zap },
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "financeiro", label: "Financeiro", icon: Wallet },
  { id: "integracoes", label: "Integrações", icon: Plug },
  { id: "flags", label: "Feature Flags", icon: Flag },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "auditoria", label: "Auditoria", icon: ScrollText },
  { id: "personalizacao", label: "Personalização do App", icon: Palette },
  { id: "modo-teste", label: "Modo Teste", icon: FlaskConical },
  { id: "config", label: "Configurações do Sistema", icon: Settings },
];

function AdminContent() {
  const qc = useQueryClient();
  const { signOut } = useClerk();
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"patient" | "split">("patient");
  const [linkCopied, setLinkCopied] = useState(false);

  const { data, isLoading, error } = useQuery<AdminOverview>({
    queryKey: ["admin-overview"],
    queryFn: () => fetchAdminOverview(),
    refetchInterval: 30_000,
  });

  const seed = useMutation({
    mutationFn: () => runSeed(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-overview"] }),
  });

  // Contexto do admin (master / aprovado / cargo) — controla acesso e abas.
  const { data: ctx, isLoading: ctxLoading } = useQuery({
    queryKey: ["adminContext"],
    queryFn: () => getAdminContext(),
  });

  // Código de afiliado pessoal do admin logado
  const { data: myCode } = useQuery({
    queryKey: ["my-affiliate-code"],
    queryFn: () => fetchOrCreateMyCode(),
    enabled: !!ctx?.isApproved,
    staleTime: Infinity,
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  function copyMyLink() {
    if (!myCode) return;
    navigator.clipboard.writeText(`${origin}/onboarding?ref=${myCode.codigo}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

  // Abas visíveis conforme o cargo (master vê tudo).
  const visibleNav = NAV.filter(
    (n) => ctx?.isMaster || (ctx?.role ? roleCanAccessTab(ctx.role, n.id) : false),
  );

  // Se o usuário não pode ver a aba atual, cai na primeira permitida.
  useEffect(() => {
    if (visibleNav.length > 0 && !visibleNav.some((n) => n.id === adminTab)) {
      setAdminTab(visibleNav[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.role, ctx?.isMaster]);

  // Aguardando contexto
  if (ctxLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando…</span>
        </div>
      </div>
    );
  }

  // Conta sem aprovação → tela de espera (bloqueado de tudo)
  if (ctx && !ctx.isApproved) {
    return <PendingApprovalScreen ctx={ctx} />;
  }

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

            {/* Meu link de afiliado */}
            {myCode && (
              <button
                onClick={copyMyLink}
                title={`Copiar meu link: ${origin}/cadastro?ref=${myCode.codigo}`}
                className="flex items-center gap-1.5 rounded-md border border-teal-700/60 bg-teal-900/30 px-3 py-1.5 text-xs font-medium text-teal-300 hover:bg-teal-900/60 transition"
              >
                <Link2 className="h-3.5 w-3.5" />
                {linkCopied ? "Link copiado!" : `Meu link · ${myCode.codigo}`}
              </button>
            )}

            {/* Logout */}
            <button
              onClick={() => signOut({ redirectUrl: "/admin" })}
              title="Desconectar"
              className="grid size-8 place-items-center rounded-md border border-slate-700 bg-slate-800 text-slate-400 hover:text-rose-400 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-56 shrink-0 border-r border-slate-800 min-h-[calc(100vh-3rem)] py-4 px-3 sticky top-12 self-start">
          <nav className="space-y-0.5">
            {visibleNav.map(({ id, label, icon: Icon }) => (
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
            {visibleNav.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>

          {adminTab === "suporte" && <AdminSuporteTab />}
          {adminTab === "analytics" && <AnalyticsSection />}
          {adminTab === "financeiro" && <FinanceiroSection />}
          {adminTab === "integracoes" && <IntegracoesSection />}
          {adminTab === "clientes" && <ClientesSection professionals={data.professionals} />}
          {adminTab === "assinaturas" && <AssinaturasSection professionals={data.professionals} />}
          {adminTab === "leads" && <LeadsSection />}
          {adminTab === "afiliados" && <AfiliadosSection />}
          {adminTab === "automacoes" && <AutomacoesSection />}
          {adminTab === "flags" && <FeatureFlagsSection />}
          {adminTab === "notificacoes" && <NotificationsSection />}
          {adminTab === "auditoria" && <AuditSection />}
          {adminTab === "personalizacao" && <PersonalizacaoSection />}
          {adminTab === "modo-teste" && <TestModeSection />}
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

// ─── PersonalizacaoSection (editor de FAQ) ────────────────────────────────────

// ─── DomainConfig (domínio do app) ────────────────────────────────────────────

function DomainConfig() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["appConfig"],
    queryFn: () => fetchAppConfig(),
  });
  const [dominio, setDominio] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const value = dominio ?? data?.dominio ?? "";

  const mutation = useMutation({
    mutationFn: () => updateAppConfig({ data: { dominio: value } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["appConfig"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Globe className="h-4 w-4 text-teal-400" />
        <h3 className="text-sm font-semibold text-slate-200">Domínio do app</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Domínio usado nos links de e-mail e como endereço oficial do app. Deixe vazio para usar o
        padrão.
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-1 min-w-[240px] items-center rounded-lg border border-slate-700 bg-slate-900 px-3">
            <span className="text-xs text-slate-500">https://</span>
            <input
              value={value}
              onChange={(e) => setDominio(e.target.value)}
              placeholder="cuidandovc.com"
              className="flex-1 bg-transparent px-2 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none"
            />
          </div>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Salvo!" : "Salvar"}
          </button>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-amber-700/40 bg-amber-900/20 p-3 text-[11px] leading-relaxed text-amber-300/80">
        ⚠️ Ao contratar um domínio: primeiro adicione-o no painel da <strong>Vercel</strong>{" "}
        (Settings → Domains) e configure o DNS. Depois informe o mesmo domínio aqui. Os links
        públicos dos médicos seguem automaticamente o domínio ativo na Vercel.
      </div>
    </div>
  );
}

// ─── TestModeSection (simular cenários) ───────────────────────────────────────

const TEST_SCENARIOS: { id: TestScenario; label: string; desc: string; cls: string }[] = [
  {
    id: "trial_ativo",
    label: "Teste ativo (14 dias)",
    desc: "Período de teste em dia",
    cls: "border-amber-700 text-amber-300",
  },
  {
    id: "trial_expirado",
    label: "Teste expirado (Free)",
    desc: "Modo gratuito / bloqueado",
    cls: "border-slate-600 text-slate-300",
  },
  {
    id: "ativa",
    label: "Assinatura ativa",
    desc: "PRO pago, renova em 30d",
    cls: "border-emerald-700 text-emerald-300",
  },
  {
    id: "cancelada",
    label: "Cancelada (ativa até +10d)",
    desc: "PRO até o fim do período",
    cls: "border-amber-700 text-amber-300",
  },
  {
    id: "inadimplente",
    label: "Inadimplente",
    desc: "Pagamento pendente",
    cls: "border-rose-700 text-rose-300",
  },
];

function TestModeSection() {
  const qc = useQueryClient();
  const { data: profs = [], isLoading } = useQuery({
    queryKey: ["testProfessionals"],
    queryFn: () => fetchTestProfessionals(),
  });
  const [selectedId, setSelectedId] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const selected = profs.find((p) => p.id === selectedId) ?? profs[0];

  const refresh = () => void qc.invalidateQueries({ queryKey: ["testProfessionals"] });

  const subMutation = useMutation({
    mutationFn: (scenario: TestScenario) =>
      simulateSubscription({ data: { professionalId: selected!.id, scenario } }),
    onSuccess: (r) => {
      setMsg(`Cenário aplicado: ${r.scenario}`);
      refresh();
    },
    onError: (e) => setMsg(e instanceof Error ? e.message : "Erro ao simular"),
  });

  const payMutation = useMutation({
    mutationFn: () => simulatePayment({ data: { professionalId: selected!.id } }),
    onSuccess: (r) => {
      setMsg(`Pagamento simulado: ${r.servico} — R$ ${r.valor}`);
      refresh();
    },
    onError: (e) => setMsg(e instanceof Error ? e.message : "Erro ao simular pagamento"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Modo Teste</h2>
        <p className="text-sm text-slate-400">
          Simule cenários de assinatura e pagamentos sem dinheiro real e sem esperar datas. As
          mudanças são aplicadas de verdade no profissional escolhido — use uma conta de teste.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : profs.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum profissional cadastrado.</p>
      ) : (
        <>
          {/* Seletor de profissional */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Profissional de teste
            </label>
            <select
              value={selected?.id ?? ""}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setMsg(null);
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-500"
            >
              {profs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nomeCompleto} (/{p.slug}) — {p.subStatus ?? "sem assinatura"}
                </option>
              ))}
            </select>

            {selected && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span className="rounded bg-slate-800 px-2 py-0.5">
                  Status: <strong className="text-slate-200">{selected.subStatus ?? "—"}</strong>
                </span>
                {selected.trialFimEm && (
                  <span className="rounded bg-slate-800 px-2 py-0.5">
                    Teste até {new Date(selected.trialFimEm).toLocaleDateString("pt-BR")}
                  </span>
                )}
                {selected.periodoFimEm && (
                  <span className="rounded bg-slate-800 px-2 py-0.5">
                    Período até {new Date(selected.periodoFimEm).toLocaleDateString("pt-BR")}
                  </span>
                )}
                <a
                  href={`${origin}/${selected.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-teal-900/40 px-2 py-0.5 text-teal-300 hover:bg-teal-900/70"
                >
                  <ExternalLink className="h-3 w-3" /> Ver página pública
                </a>
              </div>
            )}
          </div>

          {/* Cenários de assinatura */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Simular assinatura</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {TEST_SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  disabled={!selected || subMutation.isPending}
                  onClick={() => subMutation.mutate(s.id)}
                  className={`rounded-xl border bg-slate-900 px-4 py-3 text-left transition hover:bg-slate-800 disabled:opacity-50 ${s.cls}`}
                >
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-[11px] text-slate-500">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Simular pagamento */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Simular pagamento</h3>
            <p className="text-xs text-slate-500 mb-3">
              Cria uma consulta confirmada e paga (paciente de teste), refletindo no financeiro e
              nas notificações do médico.
            </p>
            <button
              disabled={!selected || payMutation.isPending}
              onClick={() => payMutation.mutate()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
            >
              {payMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4" />
              )}
              Simular pagamento de consulta
            </button>
          </div>

          {msg && (
            <div className="rounded-xl border border-teal-700/40 bg-teal-900/20 px-4 py-3 text-sm text-teal-300">
              {msg}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PersonalizacaoSection() {
  const qc = useQueryClient();
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["adminFaqs"],
    queryFn: () => fetchAllFaqs(),
  });

  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [creating, setCreating] = useState(false);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["adminFaqs"] });
    void qc.invalidateQueries({ queryKey: ["faqs"] });
  };

  const delMutation = useMutation({
    mutationFn: (id: string) => deleteFaq({ data: { id } }),
    onSuccess: invalidate,
  });

  const toggleMutation = useMutation({
    mutationFn: (f: FaqItem) =>
      updateFaq({
        data: { id: f.id, pergunta: f.pergunta, resposta: f.resposta, ativo: !f.ativo },
      }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Personalização do App</h2>
        <p className="text-sm text-slate-400">
          Domínio do app, conteúdo do suporte e outras configurações globais.
        </p>
      </div>

      {/* Domínio do app */}
      <DomainConfig />

      {/* FAQ */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Perguntas frequentes (FAQ)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Edite respostas, ative/desative ou crie novas perguntas.
            </p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 px-3 py-2 text-xs font-semibold text-white transition"
          >
            <Plus className="h-3.5 w-3.5" /> Nova pergunta
          </button>
        </div>

        {(creating || editing) && (
          <FaqForm
            initial={editing}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSaved={() => {
              invalidate();
              setCreating(false);
              setEditing(null);
            }}
          />
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Carregando…</p>
        ) : faqs.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-700 p-8 text-center">
            <p className="text-sm text-slate-500">
              Nenhuma pergunta cadastrada. Os médicos veem a lista padrão até você criar as suas.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {faqs.map((f) => (
              <li
                key={f.id}
                className={`rounded-xl border border-slate-800 bg-slate-900 p-4 ${f.ativo ? "" : "opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200">{f.pergunta}</p>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{f.resposta}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleMutation.mutate(f)}
                      title={f.ativo ? "Desativar" : "Ativar"}
                      className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-800 transition"
                    >
                      {f.ativo ? "Ativa" : "Inativa"}
                    </button>
                    <button
                      onClick={() => {
                        setCreating(false);
                        setEditing(f);
                      }}
                      className="size-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => delMutation.mutate(f.id)}
                      disabled={delMutation.isPending}
                      className="size-7 grid place-items-center rounded-lg text-slate-400 hover:bg-rose-900/40 hover:text-rose-400 transition"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FaqForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: FaqItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pergunta, setPergunta] = useState(initial?.pergunta ?? "");
  const [resposta, setResposta] = useState(initial?.resposta ?? "");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (initial) {
        await updateFaq({ data: { id: initial.id, pergunta, resposta } });
      } else {
        await createFaq({ data: { pergunta, resposta } });
      }
    },
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  return (
    <div className="mb-4 rounded-xl border border-teal-800 bg-teal-950/30 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-slate-200">
        {initial ? "Editar pergunta" : "Nova pergunta"}
      </h4>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Pergunta</label>
        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          maxLength={255}
          placeholder="Ex: Como o paciente paga a consulta?"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Resposta</label>
        <textarea
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          maxLength={5000}
          rows={3}
          placeholder="Resposta exibida ao médico…"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 resize-none"
        />
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (pergunta.trim().length < 3 || resposta.trim().length < 3) {
              setError("Preencha pergunta e resposta.");
              return;
            }
            setError(null);
            mutation.mutate();
          }}
          disabled={mutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-60"
        >
          {mutation.isPending ? "Salvando…" : "Salvar"}
        </button>
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
        >
          Cancelar
        </button>
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
  const {
    data: tickets = [],
    isLoading: ticketsLoading,
    isError: ticketsError,
  } = useQuery({
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
        ) : ticketsError ? (
          <div className="rounded-xl border border-rose-800/60 bg-rose-900/20 p-6 text-center">
            <AlertTriangle className="h-7 w-7 text-rose-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-rose-200">
              Não foi possível carregar os chamados
            </p>
            <p className="text-xs text-rose-300/70 mt-1">
              Sua conta não tem acesso de admin (ADMIN_CLERK_IDS). Verifique a configuração.
            </p>
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
