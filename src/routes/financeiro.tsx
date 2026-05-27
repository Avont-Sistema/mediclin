import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/tanstack-start";
import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  ExternalLink,
  Zap,
  Loader2,
  BadgeDollarSign,
  type LucideIcon,
} from "lucide-react";
import { checkOnboardingStatus } from "../lib/onboarding";
import { fetchFinanceiroData, type FinanceiroData } from "../lib/financeiro";
import { createMPOAuthLink, activateMPAccount } from "../lib/mercadopago";
import { DashboardLayout } from "../components/DashboardLayout";

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — MediClin" },
      { name: "description", content: "Histórico de pagamentos e integração com Mercado Pago." },
    ],
  }),
  loader: async () => {
    const { hasProfile } = await checkOnboardingStatus();
    if (!hasProfile) throw redirect({ to: "/onboarding" });
    return fetchFinanceiroData();
  },
  component: Financeiro,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(v: string | number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: Date | string) {
  const date = d instanceof Date ? d : new Date(String(d));
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pago: { label: "Pago", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  pendente: { label: "Pendente", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  cancelado: { label: "Cancelado", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  reembolsado: { label: "Reembolsado", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl ${iconBg} grid place-items-center shrink-0`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function Financeiro() {
  const loaderData = Route.useLoaderData() as FinanceiroData | null;

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["financeiro"],
    queryFn: () => fetchFinanceiroData(),
    initialData: loaderData ?? undefined,
    staleTime: 30_000,
  });

  const activateMutation = useMutation({
    mutationFn: ({ code, professionalId }: { code: string; professionalId: string }) =>
      activateMPAccount({ data: { code, professionalId, redirectPath: "/financeiro" } }),
    onSuccess: () => void refetch(),
  });

  const connectMutation = useMutation({
    mutationFn: (professionalId: string) =>
      createMPOAuthLink({ data: { professionalId, redirectPath: "/financeiro" } }),
    onSuccess: (result) => {
      window.location.href = result.url;
    },
  });

  // Handle MP OAuth callback (?code=xxx&state=professionalId)
  const activateMutate = activateMutation.mutate;
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) {
      activateMutate({ code, professionalId: state });
      window.history.replaceState({}, "", "/financeiro");
    }
  }, [activateMutate]);

  const mpConnected = data?.mpAccountAtivo ?? false;
  const professionalId = data?.professionalId ?? "";
  const isActivating = activateMutation.isPending || isFetching;
  const payments = data?.payments ?? [];

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <DashboardLayout>
          <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
              <p className="text-sm text-slate-500 mt-1">
                Pagamentos recebidos e integração com Mercado Pago
              </p>
            </div>

            {/* MP Account Card */}
            {isActivating && !mpConnected ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex items-center gap-4">
                <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
                <p className="text-sm text-slate-600">Ativando conta Mercado Pago…</p>
              </div>
            ) : !mpConnected ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-amber-100 grid place-items-center shrink-0">
                  <Zap className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    Conecte sua conta Mercado Pago
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Receba pagamentos dos pacientes via PIX, cartão e boleto diretamente na sua
                    conta. Você mantém o controle total — o dinheiro vai direto para você.
                  </p>
                  {activateMutation.isError && (
                    <p className="text-xs text-rose-600 mt-1">
                      Falha ao ativar conta. Tente conectar novamente.
                    </p>
                  )}
                </div>
                <button
                  disabled={connectMutation.isPending}
                  onClick={() => connectMutation.mutate(professionalId)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white transition"
                >
                  {connectMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Aguarde…
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4" /> Conectar Mercado Pago
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 grid place-items-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Mercado Pago conectado</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sua conta está ativa. Os pacientes podem pagar online ao agendar.
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
                </span>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={DollarSign}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                label="Receita líquida"
                value={formatCurrency(data?.totalLiquido ?? "0")}
              />
              <StatCard
                icon={TrendingUp}
                iconBg="bg-indigo-50"
                iconColor="text-indigo-600"
                label="Transações pagas"
                value={String(data?.countPago ?? 0)}
              />
              <StatCard
                icon={BadgeDollarSign}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
                label="Taxas da plataforma"
                value={formatCurrency(data?.totalTaxa ?? "0")}
              />
            </div>

            {/* Payments Table */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Histórico de pagamentos</h2>
                <span className="text-xs text-slate-400">
                  {payments.length} {payments.length === 1 ? "registro" : "registros"}
                </span>
              </div>

              {payments.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
                  <Wallet className="h-10 w-10 text-slate-300" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Nenhum pagamento registrado ainda
                    </p>
                    {!mpConnected && (
                      <p className="text-xs text-slate-400 mt-1">
                        Conecte o Mercado Pago para começar a receber pagamentos online.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 font-medium">Data</th>
                        <th className="px-5 py-3 font-medium">Paciente</th>
                        <th className="px-5 py-3 font-medium">Serviço</th>
                        <th className="px-5 py-3 font-medium text-right">Bruto</th>
                        <th className="px-5 py-3 font-medium text-right">Taxa</th>
                        <th className="px-5 py-3 font-medium text-right">Líquido</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {payments.map((p) => {
                        const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.pendente;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition">
                            <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap tabular-nums">
                              {formatDate(p.criadoEm)}
                            </td>
                            <td className="px-5 py-3.5 font-medium text-slate-900">
                              {p.appointment?.patient.nome ?? "—"}
                            </td>
                            <td className="px-5 py-3.5 text-slate-600 max-w-[180px] truncate">
                              {p.appointment?.service.nome ?? "—"}
                            </td>
                            <td className="px-5 py-3.5 text-right text-slate-700 whitespace-nowrap tabular-nums">
                              {formatCurrency(p.valorBruto)}
                            </td>
                            <td className="px-5 py-3.5 text-right text-rose-500 whitespace-nowrap tabular-nums">
                              -{formatCurrency(p.taxaPlataforma)}
                            </td>
                            <td className="px-5 py-3.5 text-right font-semibold text-emerald-700 whitespace-nowrap tabular-nums">
                              {formatCurrency(p.valorLiquido)}
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cfg.cls}`}
                              >
                                {cfg.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </DashboardLayout>
      </SignedIn>
    </>
  );
}
