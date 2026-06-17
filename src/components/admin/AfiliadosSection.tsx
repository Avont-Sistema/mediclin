import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Link2,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  Loader2,
  ToggleLeft,
  ToggleRight,
  MousePointerClick,
  UserCheck,
  Tags,
  TrendingUp,
  X,
  Crown,
  CalendarDays,
} from "lucide-react";
import {
  fetchAffiliateCodes,
  createAffiliateCode,
  updateAffiliateCode,
  toggleAffiliateCode,
  deleteAffiliateCode,
  fetchAffiliateStats,
  fetchMyConversions,
  fetchOrCreateMyCode,
  type AffiliateCode,
} from "../../lib/affiliates";
import { fetchMyAdminRecord } from "../../lib/role-permissions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none";

const selectCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Link2;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ─── Formulário de criação / edição ───────────────────────────────────────────

type FormData = {
  codigo: string;
  nome: string;
  descricao: string;
  tipoDesconto: "" | "percentual" | "valor_fixo" | "periodo_free";
  valorDesconto: string;
  diasFree: number;
  dataInicio: string;
  dataFim: string;
  limiteUsos: string;
};

const emptyForm: FormData = {
  codigo: "",
  nome: "",
  descricao: "",
  tipoDesconto: "",
  valorDesconto: "",
  diasFree: 0,
  dataInicio: "",
  dataFim: "",
  limiteUsos: "",
};

function codeToForm(c: AffiliateCode): FormData {
  return {
    codigo: c.codigo,
    nome: c.nome,
    descricao: c.descricao ?? "",
    tipoDesconto: (c.tipoDesconto ?? "") as FormData["tipoDesconto"],
    valorDesconto: c.valorDesconto ?? "",
    diasFree: c.diasFree,
    dataInicio: c.dataInicio ? c.dataInicio.slice(0, 10) : "",
    dataFim: c.dataFim ? c.dataFim.slice(0, 10) : "",
    limiteUsos: c.limiteUsos != null ? String(c.limiteUsos) : "",
  };
}

function AffiliateModal({
  editing,
  onClose,
}: {
  editing: AffiliateCode | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormData>(editing ? codeToForm(editing) : emptyForm);
  const [err, setErr] = useState<string | null>(null);

  const set = (field: keyof FormData, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        codigo: form.codigo.toUpperCase().trim(),
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || undefined,
        tipoDesconto: form.tipoDesconto || null,
        valorDesconto: form.valorDesconto.trim() || null,
        diasFree: form.diasFree,
        dataInicio: form.dataInicio || null,
        dataFim: form.dataFim || null,
        limiteUsos: form.limiteUsos ? parseInt(form.limiteUsos, 10) : null,
      } as const;

      if (!payload.codigo || !payload.nome) throw new Error("Código e nome são obrigatórios.");
      if (!/^[A-Z0-9_-]+$/.test(payload.codigo))
        throw new Error("Código: somente letras maiúsculas, números, _ e -");

      if (editing) {
        await updateAffiliateCode({ data: { ...payload, id: editing.id } });
      } else {
        await createAffiliateCode({ data: payload });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-codes"] });
      qc.invalidateQueries({ queryKey: ["affiliate-stats"] });
      onClose();
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-100">
            {editing ? "Editar código de afiliado" : "Novo código de afiliado"}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Código <span className="text-rose-400">*</span>
              </label>
              <input
                value={form.codigo}
                onChange={(e) => set("codigo", e.target.value.toUpperCase())}
                placeholder="PARCEIRO30"
                className={inputCls + " font-mono tracking-wider"}
              />
              <p className="mt-0.5 text-[10px] text-slate-600">Letras maiúsculas, números, _ e -</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Nome do afiliado <span className="text-rose-400">*</span>
              </label>
              <input
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                placeholder="João Silva"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Descrição (interna)</label>
            <input
              value={form.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              placeholder="Vendedor região Sul — campanha Instagram"
              className={inputCls}
            />
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 space-y-3">
            <p className="text-xs font-semibold text-slate-400">Benefício concedido ao médico</p>

            <div>
              <label className="mb-1 block text-xs text-slate-500">Tipo de desconto</label>
              <select
                value={form.tipoDesconto}
                onChange={(e) => set("tipoDesconto", e.target.value)}
                className={selectCls}
              >
                <option value="">Sem desconto monetário</option>
                <option value="percentual">Percentual (%)</option>
                <option value="valor_fixo">Valor fixo (R$)</option>
                <option value="periodo_free">Somente período free extra</option>
              </select>
            </div>

            {(form.tipoDesconto === "percentual" || form.tipoDesconto === "valor_fixo") && (
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  {form.tipoDesconto === "percentual" ? "Percentual de desconto (%)" : "Valor de desconto (R$)"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorDesconto}
                  onChange={(e) => set("valorDesconto", e.target.value)}
                  placeholder={form.tipoDesconto === "percentual" ? "30" : "50.00"}
                  className={inputCls}
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs text-slate-500">Dias extras de trial gratuito</label>
              <input
                type="number"
                min="0"
                max="365"
                value={form.diasFree}
                onChange={(e) => set("diasFree", parseInt(e.target.value, 10) || 0)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Válido de</label>
              <input
                type="date"
                value={form.dataInicio}
                onChange={(e) => set("dataInicio", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Válido até</label>
              <input
                type="date"
                value={form.dataFim}
                onChange={(e) => set("dataFim", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Limite de usos</label>
              <input
                type="number"
                min="1"
                value={form.limiteUsos}
                onChange={(e) => set("limiteUsos", e.target.value)}
                placeholder="∞ ilimitado"
                className={inputCls}
              />
            </div>
          </div>

          {err && <p className="text-xs text-rose-400">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="flex-1 rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60"
            >
              {save.isPending ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : editing ? (
                "Salvar alterações"
              ) : (
                "Criar código"
              )}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Linha da tabela ──────────────────────────────────────────────────────────

function CodeRow({
  code,
  origin,
  onEdit,
}: {
  code: AffiliateCode;
  origin: string;
  onEdit: (c: AffiliateCode) => void;
}) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const link = `${origin}/cadastro?ref=${code.codigo}`;

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggle = useMutation({
    mutationFn: () => toggleAffiliateCode({ data: { id: code.id, ativo: !code.ativo } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["affiliate-codes"] }),
  });

  const remove = useMutation({
    mutationFn: () => deleteAffiliateCode({ data: { id: code.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-codes"] });
      qc.invalidateQueries({ queryKey: ["affiliate-stats"] });
    },
  });

  const beneficio = (() => {
    const parts: string[] = [];
    if (code.tipoDesconto === "percentual" && code.valorDesconto)
      parts.push(`${code.valorDesconto}% off`);
    else if (code.tipoDesconto === "valor_fixo" && code.valorDesconto)
      parts.push(`R$ ${code.valorDesconto} off`);
    if (code.diasFree > 0) parts.push(`+${code.diasFree}d free`);
    return parts.length > 0 ? parts.join(" · ") : "—";
  })();

  const taxaConv =
    code.totalCliques > 0
      ? `${Math.round((code.totalConversoes / code.totalCliques) * 100)}%`
      : "—";

  return (
    <tr className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-teal-400">{code.codigo}</span>
          {!code.ativo && (
            <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">
              inativo
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">{code.nome}</p>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-slate-300">{beneficio}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-medium text-slate-200">{code.totalCliques}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-medium text-slate-200">{code.totalConversoes}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-xs text-slate-400">{taxaConv}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={copyLink}
            title="Copiar link de afiliado"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
          >
            {copied ? (
              <Check className="h-4 w-4 text-teal-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => toggle.mutate()}
            title={code.ativo ? "Desativar" : "Ativar"}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
          >
            {code.ativo ? (
              <ToggleRight className="h-4 w-4 text-teal-400" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => onEdit(code)}
            title="Editar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Deletar o código "${code.codigo}"? Esta ação é irreversível.`))
                remove.mutate();
            }}
            title="Deletar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── View do comercial (seus dados pessoais) ──────────────────────────────────

const PLANO_CLS: Record<string, string> = {
  free:   "bg-slate-700 text-slate-300",
  pro:    "bg-violet-900/40 text-violet-300 ring-1 ring-violet-700",
  clinic: "bg-amber-900/40 text-amber-300 ring-1 ring-amber-700",
};

const SUB_CLS: Record<string, string> = {
  ativa:        "text-teal-400",
  trial:        "text-amber-400",
  cancelada:    "text-rose-400",
  inadimplente: "text-rose-500",
};

function ComercialView() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const [copied, setCopied] = useState(false);

  const { data: myCode } = useQuery({
    queryKey: ["my-affiliate-code"],
    queryFn: () => fetchOrCreateMyCode(),
    staleTime: Infinity,
  });

  const { data: stats } = useQuery({
    queryKey: ["affiliate-stats"],
    queryFn: () => fetchAffiliateStats(),
  });

  const { data: conversions = [], isLoading } = useQuery({
    queryKey: ["my-conversions"],
    queryFn: () => fetchMyConversions(),
  });

  const link = myCode ? `${origin}/onboarding?ref=${myCode.codigo}` : "";

  function copyLink() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-100">Meus afiliados</h1>
        <p className="text-xs text-slate-500">Médicos cadastrados pelo seu link e desempenho.</p>
      </div>

      {/* Meu link */}
      {myCode && (
        <div className="rounded-xl border border-teal-700/40 bg-teal-900/20 p-4">
          <p className="text-xs font-semibold text-teal-400 mb-1">Meu link de captação</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-teal-300 font-mono truncate">
              {link}
            </code>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500 shrink-0"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Código: <span className="font-mono text-slate-300">{myCode.codigo}</span>
          </p>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={MousePointerClick} label="Cliques no link" value={stats?.totalCliques ?? "—"} />
        <StatCard icon={UserCheck} label="Médicos captados" value={stats?.totalConversoes ?? "—"} />
        <StatCard
          icon={TrendingUp}
          label="Taxa de conversão"
          value={stats ? `${stats.taxaConversao}%` : "—"}
          sub="cliques → cadastros"
        />
      </div>

      {/* Lista de convertidos */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Médicos captados
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : conversions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <UserCheck className="mb-3 h-8 w-8 text-slate-700" />
              <p className="text-sm text-slate-500">Nenhum médico captado ainda.</p>
              <p className="mt-1 text-xs text-slate-600">Compartilhe seu link para começar.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-[11px] text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Profissional</th>
                  <th className="px-4 py-2.5 font-medium">Especialidade</th>
                  <th className="px-4 py-2.5 font-medium">Plano</th>
                  <th className="px-4 py-2.5 font-medium">Assinatura</th>
                  <th className="px-4 py-2.5 font-medium">Captado em</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map((c) => (
                  <tr key={c.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-slate-200">{c.nomeCompleto}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{c.especialidade}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${PLANO_CLS[c.plano] ?? PLANO_CLS.free}`}>
                        {c.plano}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.subscriptionStatus ? (
                        <span className={`text-xs font-medium ${SUB_CLS[c.subscriptionStatus] ?? "text-slate-400"}`}>
                          {c.subscriptionStatus}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(c.criadoEm).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Seção principal (adaptativa por cargo) ───────────────────────────────────

export function AfiliadosSection() {
  const [modal, setModal] = useState<"new" | AffiliateCode | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const { data: myRecord } = useQuery({
    queryKey: ["my-admin-record"],
    queryFn: () => fetchMyAdminRecord(),
    staleTime: 60_000,
  });

  const { data: codes, isLoading: codesLoading } = useQuery({
    queryKey: ["affiliate-codes"],
    queryFn: () => fetchAffiliateCodes(),
  });

  const { data: stats } = useQuery({
    queryKey: ["affiliate-stats"],
    queryFn: () => fetchAffiliateStats(),
  });

  // Comercial: view isolada com apenas seus dados
  if (myRecord?.role === "comercial") return <ComercialView />;

  // Super admin / outros cargos com acesso: view completa de gestão
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100">Afiliados</h1>
          <p className="text-xs text-slate-500">
            Gerencie códigos e links de afiliado para vendedores captarem médicos.
          </p>
        </div>
        <button
          onClick={() => setModal("new")}
          className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500"
        >
          <Plus className="h-4 w-4" />
          Novo código
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Tags}             label="Códigos ativos"    value={stats?.totalCodigos ?? "—"} />
        <StatCard icon={MousePointerClick} label="Cliques totais"    value={stats?.totalCliques ?? "—"} />
        <StatCard icon={UserCheck}         label="Conversões"        value={stats?.totalConversoes ?? "—"} sub="médicos cadastrados via afiliado" />
        <StatCard icon={TrendingUp}        label="Taxa de conversão" value={stats ? `${stats.taxaConversao}%` : "—"} sub="cliques → cadastros" />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        {codesLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !codes || codes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Link2 className="mb-3 h-8 w-8 text-slate-700" />
            <p className="text-sm font-medium text-slate-400">Nenhum código de afiliado criado</p>
            <button
              onClick={() => setModal("new")}
              className="mt-4 flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              <Plus className="h-3.5 w-3.5" /> Criar primeiro código
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-slate-500 border-b border-slate-800 bg-slate-900/80">
                <th className="px-4 py-2.5 font-medium">Código / Afiliado</th>
                <th className="px-4 py-2.5 font-medium">Benefício</th>
                <th className="px-4 py-2.5 font-medium text-center">Cliques</th>
                <th className="px-4 py-2.5 font-medium text-center">Conversões</th>
                <th className="px-4 py-2.5 font-medium text-center">Taxa</th>
                <th className="px-4 py-2.5 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <CodeRow key={c.id} code={c} origin={origin} onEdit={(code) => setModal(code)} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal !== null && (
        <AffiliateModal editing={modal === "new" ? null : modal} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
