import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/tanstack-start";
import { useState } from "react";
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
} from "lucide-react";
import { fetchAdminOverview, runSeed } from "../lib/admin";
import type { AdminOverview } from "../lib/admin";

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

function AdminContent() {
  const qc = useQueryClient();
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
            <div className="grid size-6 place-items-center rounded-md bg-gradient-to-br from-teal-500 to-emerald-600">
              <div className="size-2 rounded-sm rotate-45 bg-white" />
            </div>
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
              <FeatureBadge ok={data.features.twilio} label="WhatsApp" />
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

      <div className="mx-auto max-w-[1600px] px-6 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Médicos"
            value={data.totals.professionals}
            color="text-violet-400"
          />
          <StatCard
            icon={<Activity className="h-4 w-4" />}
            label="Pacientes"
            value={data.totals.patients}
            color="text-teal-400"
          />
          <StatCard
            icon={<CalendarDays className="h-4 w-4" />}
            label="Agendamentos"
            value={data.totals.appointments}
            color="text-amber-400"
          />
        </div>

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
              desc={data.features.mp ? "Pagamentos ativos" : "Adicionar MERCADOPAGO_ACCESS_TOKEN"}
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
