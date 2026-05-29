import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Wallet,
  ShieldAlert,
  Plus,
  Save,
  Loader2,
  CheckCircle2,
  X,
  Pencil,
  Users,
  HardDrive,
  Percent,
  MessageCircle,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";
import {
  fetchPlans,
  upsertPlan,
  fetchFinanceOverview,
  fetchDelinquencyConfig,
  updateDelinquencyConfig,
  type Plan,
} from "../../lib/saas-admin";

function brl(v: number | string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PAY_STATUS: Record<string, { label: string; cls: string }> = {
  pago: { label: "Aprovados", cls: "text-emerald-300 bg-emerald-900/30 ring-emerald-700" },
  aprovado: { label: "Aprovados", cls: "text-emerald-300 bg-emerald-900/30 ring-emerald-700" },
  pendente: { label: "Pendentes", cls: "text-amber-300 bg-amber-900/30 ring-amber-700" },
  reembolsado: { label: "Estornados", cls: "text-sky-300 bg-sky-900/30 ring-sky-700" },
  estornado: { label: "Estornados", cls: "text-sky-300 bg-sky-900/30 ring-sky-700" },
  falha: { label: "Falhas", cls: "text-rose-300 bg-rose-900/30 ring-rose-700" },
  cancelado: { label: "Cancelados", cls: "text-slate-400 bg-slate-800 ring-slate-700" },
};

type Tab = "planos" | "gestao" | "automacao";

export function FinanceiroSection() {
  const [tab, setTab] = useState<Tab>("planos");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-100">Financeiro</h1>
        <p className="text-xs text-slate-500">Planos, cobranças, gestão financeira e automação</p>
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-800/60 border border-slate-700 rounded-lg w-fit">
        {(
          [
            { id: "planos" as const, label: "Planos", icon: Package },
            { id: "gestao" as const, label: "Gestão Financeira", icon: Wallet },
            { id: "automacao" as const, label: "Automação", icon: ShieldAlert },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              tab === id ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "planos" && <PlanosTab />}
      {tab === "gestao" && <GestaoTab />}
      {tab === "automacao" && <AutomacaoTab />}
    </div>
  );
}

// ─── Planos ───────────────────────────────────────────────────────────────────

function emptyPlan(ordem: number): Plan {
  return {
    id: "",
    slug: "",
    nome: "",
    descricao: "",
    precoMensal: "0",
    precoAnual: "0",
    trialDias: 14,
    maxUsuarios: 1,
    maxAgendamentosMes: -1,
    armazenamentoGb: 1,
    comissaoPct: "5",
    whatsappIncluso: false,
    recursos: [],
    ativo: true,
    ordem,
  };
}

function PlanosTab() {
  const qc = useQueryClient();
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => fetchPlans(),
  });
  const [editing, setEditing] = useState<Plan | null>(null);

  if (isLoading) {
    return <Centered />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setEditing(emptyPlan(plans.length + 1))}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition"
        >
          <Plus className="h-3.5 w-3.5" /> Novo plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} onEdit={() => setEditing(p)} />
        ))}
      </div>

      {editing && (
        <PlanEditor
          plan={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void qc.invalidateQueries({ queryKey: ["plans"] });
          }}
        />
      )}
    </div>
  );
}

function PlanCard({ plan, onEdit }: { plan: Plan; onEdit: () => void }) {
  return (
    <div
      className={`rounded-xl border bg-slate-900 p-4 flex flex-col ${
        plan.ativo ? "border-slate-800" : "border-slate-800/50 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100">{plan.nome}</h3>
          <p className="text-[10px] font-mono text-slate-500">{plan.slug}</p>
        </div>
        <button
          onClick={onEdit}
          className="grid size-7 place-items-center rounded-lg hover:bg-slate-800 text-slate-400 transition"
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold text-teal-300 leading-none">{brl(plan.precoMensal)}</p>
        <p className="text-[11px] text-slate-500 mt-1">/mês · {brl(plan.precoAnual)}/ano</p>
      </div>

      <ul className="mt-4 space-y-1.5 text-[11px] text-slate-400 flex-1">
        <Spec
          icon={<Users className="h-3 w-3" />}
          label="Usuários"
          value={plan.maxUsuarios === -1 ? "Ilimitado" : String(plan.maxUsuarios)}
        />
        <Spec
          icon={<CalendarClock className="h-3 w-3" />}
          label="Agend./mês"
          value={plan.maxAgendamentosMes === -1 ? "Ilimitado" : String(plan.maxAgendamentosMes)}
        />
        <Spec
          icon={<HardDrive className="h-3 w-3" />}
          label="Armazenamento"
          value={`${plan.armazenamentoGb} GB`}
        />
        <Spec
          icon={<Percent className="h-3 w-3" />}
          label="Comissão"
          value={`${plan.comissaoPct}%`}
        />
        <Spec
          icon={<MessageCircle className="h-3 w-3" />}
          label="WhatsApp"
          value={plan.whatsappIncluso ? "Incluso" : "—"}
        />
      </ul>

      {plan.recursos.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800 space-y-1">
          {plan.recursos.map((r, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <CheckCircle2 className="h-3 w-3 text-teal-500 shrink-0" />
              {r}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-[10px]">
        <span className="text-slate-500">Trial: {plan.trialDias}d</span>
        {!plan.ativo && <span className="text-rose-400">· inativo</span>}
      </div>
    </div>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-slate-500">
        {icon}
        {label}
      </span>
      <span className="font-medium text-slate-300">{value}</span>
    </li>
  );
}

function PlanEditor({
  plan,
  onClose,
  onSaved,
}: {
  plan: Plan;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<Plan>(plan);
  const [recursosText, setRecursosText] = useState(plan.recursos.join("\n"));

  const mutation = useMutation({
    mutationFn: () =>
      upsertPlan({
        data: {
          id: f.id || undefined,
          slug: f.slug,
          nome: f.nome,
          descricao: f.descricao || undefined,
          precoMensal: f.precoMensal,
          precoAnual: f.precoAnual,
          trialDias: f.trialDias,
          maxUsuarios: f.maxUsuarios,
          maxAgendamentosMes: f.maxAgendamentosMes,
          armazenamentoGb: f.armazenamentoGb,
          comissaoPct: f.comissaoPct,
          whatsappIncluso: f.whatsappIncluso,
          recursos: recursosText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          ativo: f.ativo,
          ordem: f.ordem,
        },
      }),
    onSuccess: onSaved,
  });

  const num = (k: keyof Plan) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: Number(e.target.value) }));
  const str = (k: keyof Plan) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const inputCls =
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-slate-100">
            {f.id ? "Editar plano" : "Novo plano"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome">
            <input value={f.nome} onChange={str("nome")} placeholder="Pro" className={inputCls} />
          </Field>
          <Field label="Slug (único)">
            <input
              value={f.slug}
              onChange={(e) =>
                setF((p) => ({
                  ...p,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                }))
              }
              placeholder="pro"
              className={inputCls}
            />
          </Field>
          <Field label="Preço mensal (R$)">
            <input value={f.precoMensal} onChange={str("precoMensal")} className={inputCls} />
          </Field>
          <Field label="Preço anual (R$)">
            <input value={f.precoAnual} onChange={str("precoAnual")} className={inputCls} />
          </Field>
          <Field label="Trial (dias)">
            <input
              type="number"
              value={f.trialDias}
              onChange={num("trialDias")}
              className={inputCls}
            />
          </Field>
          <Field label="Comissão (%)">
            <input value={f.comissaoPct} onChange={str("comissaoPct")} className={inputCls} />
          </Field>
          <Field label="Máx. usuários (-1 = ilimitado)">
            <input
              type="number"
              value={f.maxUsuarios}
              onChange={num("maxUsuarios")}
              className={inputCls}
            />
          </Field>
          <Field label="Máx. agend./mês (-1 = ilimitado)">
            <input
              type="number"
              value={f.maxAgendamentosMes}
              onChange={num("maxAgendamentosMes")}
              className={inputCls}
            />
          </Field>
          <Field label="Armazenamento (GB)">
            <input
              type="number"
              value={f.armazenamentoGb}
              onChange={num("armazenamentoGb")}
              className={inputCls}
            />
          </Field>
          <Field label="Ordem">
            <input type="number" value={f.ordem} onChange={num("ordem")} className={inputCls} />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Recursos (um por linha)">
            <textarea
              value={recursosText}
              onChange={(e) => setRecursosText(e.target.value)}
              rows={4}
              placeholder={"Agenda online\nLembretes WhatsApp"}
              className={inputCls + " resize-none"}
            />
          </Field>
        </div>

        <div className="mt-3 flex items-center gap-5">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={f.whatsappIncluso}
              onChange={(e) => setF((p) => ({ ...p, whatsappIncluso: e.target.checked }))}
              className="size-4 rounded accent-teal-500"
            />
            WhatsApp incluso
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={f.ativo}
              onChange={(e) => setF((p) => ({ ...p, ativo: e.target.checked }))}
              className="size-4 rounded accent-teal-500"
            />
            Ativo
          </label>
        </div>

        {mutation.isError && (
          <p className="mt-3 text-xs text-rose-400">
            Erro ao salvar. Verifique os campos (slug único, valores numéricos).
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            disabled={mutation.isPending || !f.nome || !f.slug}
            onClick={() => mutation.mutate()}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-5 py-2 text-sm font-semibold text-white transition"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar plano
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

// ─── Gestão financeira ────────────────────────────────────────────────────────

function GestaoTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["financeOverview"],
    queryFn: () => fetchFinanceOverview(),
    staleTime: 30_000,
  });

  if (isLoading || !data) return <Centered />;

  const findStatus = (keys: string[]) =>
    data.porStatus
      .filter((s) => keys.includes(s.status))
      .reduce((acc, s) => ({ count: acc.count + s.count, total: acc.total + s.total }), {
        count: 0,
        total: 0,
      });

  const aprovados = findStatus(["pago", "aprovado"]);
  const pendentes = findStatus(["pendente"]);
  const estornados = findStatus(["reembolsado", "estornado"]);
  const falhas = findStatus(["falha", "rejeitado"]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <FinStat
          label="Aprovados"
          count={aprovados.count}
          total={aprovados.total}
          cls="text-emerald-300"
        />
        <FinStat
          label="Pendentes"
          count={pendentes.count}
          total={pendentes.total}
          cls="text-amber-300"
        />
        <FinStat
          label="Estornados"
          count={estornados.count}
          total={estornados.total}
          cls="text-sky-300"
        />
        <FinStat label="Falhas" count={falhas.count} total={falhas.total} cls="text-rose-300" />
        <FinStat label="Inadimplentes" count={data.inadimplentes} cls="text-orange-300" />
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Pagamentos recentes
        </h3>
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          {data.recentes.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">Nenhum pagamento ainda</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-slate-500 border-b border-slate-800">
                  <th className="px-4 py-2.5 font-medium">Data</th>
                  <th className="px-4 py-2.5 font-medium text-right">Valor</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.recentes.map((p) => {
                  const cfg = PAY_STATUS[p.status] ?? PAY_STATUS.pendente;
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5 text-slate-400 tabular-nums">
                        {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-200 tabular-nums">
                        {brl(p.valorBruto)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${cfg.cls}`}
                        >
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function FinStat({
  label,
  count,
  total,
  cls,
}: {
  label: string;
  count: number;
  total?: number;
  cls: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${cls}`}>{count}</p>
      {total !== undefined && <p className="text-[10px] text-slate-500 mt-0.5">{brl(total)}</p>}
    </div>
  );
}

// ─── Automação de inadimplência ───────────────────────────────────────────────

function AutomacaoTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["delinquencyConfig"],
    queryFn: () => fetchDelinquencyConfig(),
  });
  const [f, setF] = useState<{
    ativo: boolean;
    diasAlerta: number;
    diasLimitar: number;
    diasBloquear: number;
  } | null>(null);
  const [saved, setSaved] = useState(false);

  const cfg = f ?? data ?? null;

  const mutation = useMutation({
    mutationFn: () => updateDelinquencyConfig({ data: cfg! }),
    onSuccess: () => {
      setSaved(true);
      void qc.invalidateQueries({ queryKey: ["delinquencyConfig"] });
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading || !cfg) return <Centered />;

  const set = (patch: Partial<typeof cfg>) => setF({ ...cfg, ...patch });
  const inputCls =
    "w-20 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 text-center focus:border-teal-500 outline-none";

  return (
    <div className="max-w-2xl space-y-5">
      {/* Toggle master */}
      <div
        className={`rounded-xl border p-5 ${cfg.ativo ? "border-orange-700/50 bg-orange-900/15" : "border-slate-800 bg-slate-900"}`}
      >
        <div className="flex items-start gap-3">
          <ShieldAlert
            className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.ativo ? "text-orange-400" : "text-slate-500"}`}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                Bloqueio progressivo por inadimplência
              </h3>
              <button
                onClick={() => set({ ativo: !cfg.ativo })}
                className={`relative h-6 w-11 rounded-full transition ${cfg.ativo ? "bg-orange-500" : "bg-slate-700"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${cfg.ativo ? "left-[22px]" : "left-0.5"}`}
                />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Quando ativo, médicos sem pagamento são alertados, têm a agenda limitada e depois
              bloqueados conforme os dias abaixo.
            </p>
            {!cfg.ativo && (
              <p className="text-[11px] text-amber-400/80 mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Desligado — nenhuma conta é afetada.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Etapas */}
      <div className="space-y-3">
        <Etapa
          dia={cfg.diasAlerta}
          cor="text-amber-300 border-amber-700/40 bg-amber-900/10"
          titulo="Alerta"
          desc="Notificação de pagamento pendente"
          onChange={(v) => set({ diasAlerta: v })}
          inputCls={inputCls}
        />
        <Etapa
          dia={cfg.diasLimitar}
          cor="text-orange-300 border-orange-700/40 bg-orange-900/10"
          titulo="Limita agenda"
          desc="Novos agendamentos são bloqueados"
          onChange={(v) => set({ diasLimitar: v })}
          inputCls={inputCls}
        />
        <Etapa
          dia={cfg.diasBloquear}
          cor="text-rose-300 border-rose-700/40 bg-rose-900/10"
          titulo="Bloqueia"
          desc="Acesso ao painel suspenso até regularizar"
          onChange={(v) => set({ diasBloquear: v })}
          inputCls={inputCls}
        />
      </div>

      <button
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
        className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-5 py-2 text-sm font-semibold text-white transition"
      >
        {saved ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : mutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saved ? "Salvo!" : "Salvar automação"}
      </button>
    </div>
  );
}

function Etapa({
  dia,
  cor,
  titulo,
  desc,
  onChange,
  inputCls,
}: {
  dia: number;
  cor: string;
  titulo: string;
  desc: string;
  onChange: (v: number) => void;
  inputCls: string;
}) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${cor}`}>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-slate-400">Dia</span>
        <input
          type="number"
          min={1}
          value={dia}
          onChange={(e) => onChange(Number(e.target.value))}
          className={inputCls}
        />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-100">{titulo}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

function Centered() {
  return (
    <div className="flex items-center justify-center py-16 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}
