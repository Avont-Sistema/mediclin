import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Loader2,
  Save,
  X,
  UserPlus,
  Crown,
  DollarSign,
  LifeBuoy,
  Briefcase,
  Wrench,
  Bell,
  Flag,
  ScrollText,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Mail,
  Plug,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import {
  fetchLeads,
  upsertLead,
  fetchFeatureFlags,
  toggleFeatureFlag,
  fetchAuditLog,
  fetchNotifications,
  markNotificationRead,
  fetchAdminUsers,
  upsertAdminUser,
  fetchDelinquencyConfig,
  type Lead,
  type AdminUser,
} from "../../lib/saas-admin";
import { fetchIntegrationConfig, updateIntegrationConfig } from "../../lib/integrations";
import type { AdminOverview } from "../../lib/admin";

function Centered() {
  return (
    <div className="flex items-center justify-center py-16 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

function SectionHead({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h1 className="text-lg font-bold text-slate-100">{title}</h1>
      <p className="text-xs text-slate-500">{desc}</p>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none";

// ═══ CLIENTES ═════════════════════════════════════════════════════════════════

const PLANO_CLS: Record<string, string> = {
  free: "bg-slate-700 text-slate-300",
  pro: "bg-violet-900/40 text-violet-300 ring-1 ring-violet-700",
  clinic: "bg-amber-900/40 text-amber-300 ring-1 ring-amber-700",
};

export function ClientesSection({
  professionals,
}: {
  professionals: AdminOverview["professionals"];
}) {
  const [q, setQ] = useState("");
  const filtered = professionals.filter(
    (p) =>
      p.nomeCompleto.toLowerCase().includes(q.toLowerCase()) ||
      p.especialidade.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <SectionHead title="Clientes" desc="Médicos e profissionais cadastrados na plataforma" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nome ou especialidade…"
        className={inputCls + " max-w-sm"}
      />
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-slate-500 border-b border-slate-800">
              <th className="px-4 py-2.5 font-medium">Profissional</th>
              <th className="px-4 py-2.5 font-medium">Especialidade</th>
              <th className="px-4 py-2.5 font-medium">Plano</th>
              <th className="px-4 py-2.5 font-medium text-center">Serviços</th>
              <th className="px-4 py-2.5 font-medium text-center">Agend.</th>
              <th className="px-4 py-2.5 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2.5 font-medium text-slate-200">{p.nomeCompleto}</td>
                <td className="px-4 py-2.5 text-slate-400">{p.especialidade}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${PLANO_CLS[p.plano]}`}
                  >
                    {p.plano.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center text-slate-400">{p.servicesCount}</td>
                <td className="px-4 py-2.5 text-center text-slate-400">{p.appointmentsTotal}</td>
                <td className="px-4 py-2.5 text-center">
                  <span
                    className={`text-[10px] ${p.ativo ? "text-emerald-400" : "text-slate-500"}`}
                  >
                    {p.ativo ? "● Ativo" : "○ Inativo"}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500 text-sm">
                  Nenhum cliente encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══ ASSINATURAS ══════════════════════════════════════════════════════════════

export function AssinaturasSection({
  professionals,
}: {
  professionals: AdminOverview["professionals"];
}) {
  const porPlano = { free: 0, pro: 0, clinic: 0 };
  for (const p of professionals) porPlano[p.plano]++;

  return (
    <div className="space-y-4">
      <SectionHead title="Assinaturas" desc="Distribuição de assinaturas por plano" />
      <div className="grid grid-cols-3 gap-4 max-w-2xl">
        {(["free", "pro", "clinic"] as const).map((plano) => (
          <div key={plano} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${PLANO_CLS[plano]}`}>
              {plano.toUpperCase()}
            </span>
            <p className="text-3xl font-bold text-slate-100 mt-3">{porPlano[plano]}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">assinantes</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Gerencie os planos e preços em <span className="text-teal-400">Financeiro → Planos</span>.
      </p>
    </div>
  );
}

// ═══ LEADS (CRM) ══════════════════════════════════════════════════════════════

const LEAD_STATUS: Record<string, { label: string; cls: string }> = {
  novo: { label: "Novo", cls: "bg-blue-900/40 text-blue-300 ring-blue-700" },
  contatado: { label: "Contatado", cls: "bg-amber-900/40 text-amber-300 ring-amber-700" },
  qualificado: { label: "Qualificado", cls: "bg-violet-900/40 text-violet-300 ring-violet-700" },
  convertido: { label: "Convertido", cls: "bg-emerald-900/40 text-emerald-300 ring-emerald-700" },
  perdido: { label: "Perdido", cls: "bg-slate-800 text-slate-400 ring-slate-700" },
};

export function LeadsSection() {
  const qc = useQueryClient();
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => fetchLeads(),
  });
  const [editing, setEditing] = useState<Partial<Lead> | null>(null);

  if (isLoading) return <Centered />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHead title="Leads / CRM" desc="Funil de prospecção de novos médicos" />
        <button
          onClick={() => setEditing({ status: "novo" })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition"
        >
          <Plus className="h-3.5 w-3.5" /> Novo lead
        </button>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center">
          <Briefcase className="h-8 w-8 text-slate-700 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhum lead cadastrado</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-slate-500 border-b border-slate-800">
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">Contato</th>
                <th className="px-4 py-2.5 font-medium">Origem</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {leads.map((l) => {
                const s = LEAD_STATUS[l.status];
                return (
                  <tr key={l.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-medium text-slate-200">{l.nome}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">
                      {l.email}
                      {l.telefone ? ` · ${l.telefone}` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{l.origem ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${s.cls}`}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => setEditing(l)}
                        className="text-xs text-teal-400 hover:text-teal-300"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <LeadEditor
          lead={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void qc.invalidateQueries({ queryKey: ["leads"] });
          }}
        />
      )}
    </div>
  );
}

function LeadEditor({
  lead,
  onClose,
  onSaved,
}: {
  lead: Partial<Lead>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    nome: lead.nome ?? "",
    email: lead.email ?? "",
    telefone: lead.telefone ?? "",
    origem: lead.origem ?? "",
    status: (lead.status ?? "novo") as Lead["status"],
    notas: lead.notas ?? "",
  });
  const mutation = useMutation({
    mutationFn: () =>
      upsertLead({
        data: {
          id: lead.id,
          nome: f.nome,
          email: f.email || undefined,
          telefone: f.telefone || undefined,
          origem: f.origem || undefined,
          status: f.status,
          notas: f.notas || undefined,
        },
      }),
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-100">
            {lead.id ? "Editar lead" : "Novo lead"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={f.nome}
            onChange={(e) => setF({ ...f, nome: e.target.value })}
            placeholder="Nome *"
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
              placeholder="E-mail"
              className={inputCls}
            />
            <input
              value={f.telefone}
              onChange={(e) => setF({ ...f, telefone: e.target.value })}
              placeholder="Telefone"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={f.origem}
              onChange={(e) => setF({ ...f, origem: e.target.value })}
              placeholder="Origem (Instagram, indicação…)"
              className={inputCls}
            />
            <select
              value={f.status}
              onChange={(e) => setF({ ...f, status: e.target.value as Lead["status"] })}
              className={inputCls}
            >
              <option value="novo">Novo</option>
              <option value="contatado">Contatado</option>
              <option value="qualificado">Qualificado</option>
              <option value="convertido">Convertido</option>
              <option value="perdido">Perdido</option>
            </select>
          </div>
          <textarea
            value={f.notas}
            onChange={(e) => setF({ ...f, notas: e.target.value })}
            placeholder="Notas"
            rows={3}
            className={inputCls + " resize-none"}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            disabled={mutation.isPending || !f.nome}
            onClick={() => mutation.mutate()}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-5 py-2 text-sm font-semibold text-white transition"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}{" "}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══ FEATURE FLAGS ════════════════════════════════════════════════════════════

export function FeatureFlagsSection() {
  const qc = useQueryClient();
  const { data: flags = [], isLoading } = useQuery({
    queryKey: ["featureFlags"],
    queryFn: () => fetchFeatureFlags(),
  });
  const mutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      toggleFeatureFlag({ data: { id, ativo } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["featureFlags"] }),
  });

  if (isLoading) return <Centered />;

  return (
    <div className="space-y-4">
      <SectionHead
        title="Feature Flags"
        desc="Ative ou desative recursos da plataforma sem deploy"
      />
      <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800/60">
        {flags.map((flag) => (
          <div key={flag.id} className="flex items-center gap-4 p-4">
            <Flag
              className={`h-4 w-4 shrink-0 ${flag.ativo ? "text-teal-400" : "text-slate-600"}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 font-mono">{flag.chave}</p>
              {flag.descricao && <p className="text-xs text-slate-500 mt-0.5">{flag.descricao}</p>}
            </div>
            <button
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ id: flag.id, ativo: !flag.ativo })}
              className={`relative h-6 w-11 rounded-full transition shrink-0 ${flag.ativo ? "bg-teal-500" : "bg-slate-700"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${flag.ativo ? "left-[22px]" : "left-0.5"}`}
              />
            </button>
          </div>
        ))}
        {flags.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-10">Nenhuma flag</p>
        )}
      </div>
    </div>
  );
}

// ═══ AUTOMAÇÕES ═══════════════════════════════════════════════════════════════

export function AutomacoesSection() {
  const { data: delinq } = useQuery({
    queryKey: ["delinquencyConfig"],
    queryFn: () => fetchDelinquencyConfig(),
  });

  const items = [
    {
      icon: ShieldCheck,
      titulo: "Bloqueio por inadimplência",
      desc: delinq
        ? `Alerta dia ${delinq.diasAlerta} · limita dia ${delinq.diasLimitar} · bloqueia dia ${delinq.diasBloquear}`
        : "Bloqueio progressivo de contas sem pagamento",
      ativo: delinq?.ativo ?? false,
      nota: "Configure em Financeiro → Automação",
    },
    {
      icon: Clock,
      titulo: "Lembretes de consulta",
      desc: "Envio automático de lembrete antes da consulta (cron diário)",
      ativo: true,
      nota: "/api/cron/reminders",
    },
    {
      icon: Mail,
      titulo: "Confirmação de agendamento",
      desc: "E-mail automático ao paciente e ao médico após o pagamento",
      ativo: true,
      nota: "Disparado pelo webhook do Mercado Pago",
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHead title="Automações" desc="Rotinas automáticas da plataforma" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((it) => (
          <div key={it.titulo} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-start gap-3">
              <it.icon
                className={`h-5 w-5 shrink-0 ${it.ativo ? "text-teal-400" : "text-slate-600"}`}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-100">{it.titulo}</p>
                  <span
                    className={`text-[10px] font-medium ${it.ativo ? "text-emerald-400" : "text-slate-500"}`}
                  >
                    {it.ativo ? "● Ativo" : "○ Inativo"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{it.desc}</p>
                <p className="text-[10px] text-slate-600 mt-2 font-mono">{it.nota}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ NOTIFICAÇÕES ═════════════════════════════════════════════════════════════

const NOTIF_CLS: Record<string, string> = {
  info: "border-sky-700/40 bg-sky-900/10",
  warning: "border-amber-700/40 bg-amber-900/10",
  success: "border-emerald-700/40 bg-emerald-900/10",
  error: "border-rose-700/40 bg-rose-900/10",
};

export function NotificationsSection() {
  const qc = useQueryClient();
  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
  });
  const mutation = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (isLoading) return <Centered />;

  return (
    <div className="space-y-4">
      <SectionHead title="Notificações" desc="Eventos e avisos do sistema" />
      {notifs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center">
          <Bell className="h-8 w-8 text-slate-700 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhuma notificação</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 flex items-start gap-3 ${NOTIF_CLS[n.tipo] ?? NOTIF_CLS.info} ${n.lida ? "opacity-60" : ""}`}
            >
              <Bell className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-100">{n.titulo}</p>
                {n.mensagem && <p className="text-xs text-slate-400 mt-0.5">{n.mensagem}</p>}
                <p className="text-[10px] text-slate-600 mt-1">
                  {new Date(n.criadoEm).toLocaleString("pt-BR")}
                </p>
              </div>
              {!n.lida && (
                <button
                  onClick={() => mutation.mutate(n.id)}
                  className="text-[11px] text-teal-400 hover:text-teal-300 shrink-0"
                >
                  Marcar lida
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ AUDITORIA ════════════════════════════════════════════════════════════════

export function AuditSection() {
  const { data: log = [], isLoading } = useQuery({
    queryKey: ["auditLog"],
    queryFn: () => fetchAuditLog(),
  });

  if (isLoading) return <Centered />;

  return (
    <div className="space-y-4">
      <SectionHead title="Auditoria" desc="Registro de ações administrativas" />
      {log.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center">
          <ScrollText className="h-8 w-8 text-slate-700 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhum registro ainda</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800/60">
          {log.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <code className="text-[11px] text-teal-400 font-mono shrink-0 w-40 truncate">
                {e.acao}
              </code>
              <span className="text-slate-400 text-xs flex-1 truncate">
                {e.entidade}
                {e.detalhe ? ` · ${e.detalhe}` : ""}
              </span>
              <span className="text-[10px] text-slate-600 shrink-0">
                {new Date(e.criadoEm).toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ CONFIGURAÇÕES DO SISTEMA / PERMISSÕES ════════════════════════════════════

const ROLE_DEFS = [
  {
    role: "super_admin",
    icon: Crown,
    label: "Super Admin",
    desc: "Acesso total a tudo",
    cls: "text-amber-400",
  },
  {
    role: "financeiro",
    icon: DollarSign,
    label: "Financeiro",
    desc: "Só cobrança e planos",
    cls: "text-emerald-400",
  },
  {
    role: "suporte",
    icon: LifeBuoy,
    label: "Suporte",
    desc: "Só tickets de suporte",
    cls: "text-sky-400",
  },
  {
    role: "comercial",
    icon: Briefcase,
    label: "Comercial",
    desc: "Só leads e clientes",
    cls: "text-violet-400",
  },
  {
    role: "operacional",
    icon: Wrench,
    label: "Operacional",
    desc: "Sem acesso financeiro",
    cls: "text-slate-400",
  },
] as const;

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_DEFS.map((r) => [r.role, r.label]),
);

export function SystemConfigSection() {
  const qc = useQueryClient();
  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => fetchAdminUsers(),
  });
  const [editing, setEditing] = useState<Partial<AdminUser> | null>(null);

  return (
    <div className="space-y-6">
      <SectionHead title="Configurações do Sistema" desc="Níveis de permissão e administradores" />

      {/* Níveis de permissão (referência) */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Níveis de permissão
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {ROLE_DEFS.map((r) => (
            <div
              key={r.role}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-start gap-3"
            >
              <r.icon className={`h-5 w-5 shrink-0 ${r.cls}`} />
              <div>
                <p className="text-sm font-semibold text-slate-100">{r.label}</p>
                <p className="text-xs text-slate-500">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-amber-400/70 mt-3">
          ⚠️ Os níveis ainda não restringem o acesso (gating pendente). Definição das funções já
          registrada — a aplicação das regras entra quando o ADMIN_CLERK_IDS / login admin estiver
          configurado.
        </p>
      </div>

      {/* Administradores */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Administradores
          </h3>
          <button
            onClick={() => setEditing({ role: "suporte", ativo: true })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition"
          >
            <UserPlus className="h-3.5 w-3.5" /> Adicionar admin
          </button>
        </div>

        {isLoading ? (
          <Centered />
        ) : admins.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center">
            <ShieldCheck className="h-8 w-8 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nenhum admin cadastrado</p>
            <p className="text-xs text-slate-600 mt-1">
              Adicione admins pelo Clerk User ID para definir níveis de acesso.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800/60">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{a.nome || a.clerkId}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{a.email || a.clerkId}</p>
                </div>
                <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-300">
                  {ROLE_LABEL[a.role] ?? a.role}
                </span>
                <span className={`text-[10px] ${a.ativo ? "text-emerald-400" : "text-slate-500"}`}>
                  {a.ativo ? "● Ativo" : "○ Inativo"}
                </span>
                <button
                  onClick={() => setEditing(a)}
                  className="text-xs text-teal-400 hover:text-teal-300"
                >
                  Editar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <AdminEditor
          admin={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void qc.invalidateQueries({ queryKey: ["adminUsers"] });
          }}
        />
      )}
    </div>
  );
}

function AdminEditor({
  admin,
  onClose,
  onSaved,
}: {
  admin: Partial<AdminUser>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    clerkId: admin.clerkId ?? "",
    nome: admin.nome ?? "",
    email: admin.email ?? "",
    role: (admin.role ?? "suporte") as AdminUser["role"],
    ativo: admin.ativo ?? true,
  });
  const mutation = useMutation({
    mutationFn: () =>
      upsertAdminUser({
        data: {
          id: admin.id,
          clerkId: f.clerkId,
          nome: f.nome || undefined,
          email: f.email || undefined,
          role: f.role,
          ativo: f.ativo,
        },
      }),
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-100">
            {admin.id ? "Editar admin" : "Novo admin"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Clerk User ID *
            </label>
            <input
              value={f.clerkId}
              onChange={(e) => setF({ ...f, clerkId: e.target.value })}
              placeholder="user_xxxxx"
              className={inputCls + " font-mono"}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={f.nome}
              onChange={(e) => setF({ ...f, nome: e.target.value })}
              placeholder="Nome"
              className={inputCls}
            />
            <input
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
              placeholder="E-mail"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Nível de acesso
            </label>
            <select
              value={f.role}
              onChange={(e) => setF({ ...f, role: e.target.value as AdminUser["role"] })}
              className={inputCls}
            >
              {ROLE_DEFS.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label} — {r.desc}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={f.ativo}
              onChange={(e) => setF({ ...f, ativo: e.target.checked })}
              className="size-4 rounded accent-teal-500"
            />
            Ativo
          </label>
        </div>
        {mutation.isError && <p className="mt-3 text-xs text-rose-400">Erro ao salvar.</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            disabled={mutation.isPending || !f.clerkId}
            onClick={() => mutation.mutate()}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-5 py-2 text-sm font-semibold text-white transition"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}{" "}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══ INTEGRAÇÕES (Mercado Pago) ═══════════════════════════════════════════════

type SecretField = "mpAccessToken" | "mpPublicKey" | "mpAppId" | "mpAppSecret" | "mpWebhookSecret";

const MP_FIELDS: { key: SecretField; label: string; hint: string }[] = [
  {
    key: "mpAccessToken",
    label: "Access Token",
    hint: "Credenciais → Access Token. Começa com APP_USR- (produção) ou TEST- (teste).",
  },
  {
    key: "mpPublicKey",
    label: "Public Key",
    hint: "Credenciais → Public Key. Usada no checkout do lado do cliente.",
  },
  {
    key: "mpAppId",
    label: "Client ID (App ID)",
    hint: "Suas integrações → seu app → Client ID. Necessário para o marketplace (OAuth dos médicos).",
  },
  {
    key: "mpAppSecret",
    label: "Client Secret",
    hint: "Suas integrações → seu app → Client Secret. Mantenha em segredo.",
  },
  {
    key: "mpWebhookSecret",
    label: "Assinatura do Webhook",
    hint: "Webhooks → Assinatura secreta. Valida que as notificações vêm do Mercado Pago.",
  },
];

export function IntegracoesSection() {
  const qc = useQueryClient();
  const { data: cfg, isLoading } = useQuery({
    queryKey: ["integrationConfig"],
    queryFn: () => fetchIntegrationConfig(),
  });

  const [secrets, setSecrets] = useState<Record<SecretField, string>>({
    mpAccessToken: "",
    mpPublicKey: "",
    mpAppId: "",
    mpAppSecret: "",
    mpWebhookSecret: "",
  });
  const [reveal, setReveal] = useState<Record<SecretField, boolean>>({
    mpAccessToken: false,
    mpPublicKey: false,
    mpAppId: false,
    mpAppSecret: false,
    mpWebhookSecret: false,
  });
  const [ambiente, setAmbiente] = useState<"test" | "producao">("test");
  const [ativo, setAtivo] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sincroniza ambiente/ativo quando os dados carregam (uma vez por carga).
  if (cfg && !dirty && (ambiente !== cfg.mpAmbiente || ativo !== cfg.mpAtivo)) {
    setAmbiente(cfg.mpAmbiente);
    setAtivo(cfg.mpAtivo);
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, string | boolean> = { mpAmbiente: ambiente, mpAtivo: ativo };
      // Só envia segredos que o admin realmente digitou (vazio = mantém atual).
      for (const { key } of MP_FIELDS) {
        if (secrets[key].trim() !== "") payload[key] = secrets[key].trim();
      }
      return updateIntegrationConfig({ data: payload });
    },
    onSuccess: () => {
      setSecrets({
        mpAccessToken: "",
        mpPublicKey: "",
        mpAppId: "",
        mpAppSecret: "",
        mpWebhookSecret: "",
      });
      setDirty(false);
      void qc.invalidateQueries({ queryKey: ["integrationConfig"] });
    },
  });

  if (isLoading || !cfg) return <Centered />;

  return (
    <div className="space-y-6">
      <SectionHead
        title="Integrações"
        desc="Chaves de plataforma do Mercado Pago — assinaturas dos médicos e pagamentos dos pacientes"
      />

      {/* Status geral */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center gap-3 flex-wrap">
        <div
          className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${
            cfg.mpAtivo ? "bg-emerald-900/40" : "bg-slate-800"
          }`}
        >
          <Plug className={`h-5 w-5 ${cfg.mpAtivo ? "text-emerald-400" : "text-slate-500"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100">Mercado Pago</p>
          <p className="text-xs text-slate-500">
            {cfg.mpAccessToken.configured
              ? `Access Token configurado · ambiente ${cfg.mpAmbiente === "producao" ? "Produção" : "Teste"}`
              : "Access Token ainda não configurado"}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            cfg.mpAtivo
              ? "bg-emerald-900/40 text-emerald-300 ring-1 ring-emerald-700"
              : "bg-slate-800 text-slate-400 ring-1 ring-slate-700"
          }`}
        >
          {cfg.mpAtivo ? "● Ativo" : "○ Inativo"}
        </span>
      </div>

      {/* Aviso de segurança */}
      <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 p-3 flex items-start gap-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-200/80 leading-relaxed">
          Estas são chaves <strong>secretas da plataforma</strong>, guardadas no banco com acesso
          restrito ao admin. Nunca as compartilhe. Use as credenciais de <strong>Teste</strong> até
          validar o fluxo e só então troque para <strong>Produção</strong>.
        </p>
      </div>

      {/* Form de chaves */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        {/* Ambiente */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Ambiente
          </label>
          <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
            {(["test", "producao"] as const).map((amb) => (
              <button
                key={amb}
                onClick={() => {
                  setAmbiente(amb);
                  setDirty(true);
                }}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  ambiente === amb
                    ? "bg-slate-700 text-slate-100"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {amb === "test" ? "Teste" : "Produção"}
              </button>
            ))}
          </div>
        </div>

        {/* Campos de segredo */}
        {MP_FIELDS.map(({ key, label, hint }) => {
          const field = cfg[key];
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-[11px] font-medium text-slate-300">{label}</label>
                {field.configured ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> configurado
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">não configurado</span>
                )}
              </div>
              <div className="relative">
                <input
                  type={reveal[key] ? "text" : "password"}
                  value={secrets[key]}
                  onChange={(e) => {
                    setSecrets((s) => ({ ...s, [key]: e.target.value }));
                    setDirty(true);
                  }}
                  placeholder={
                    field.configured
                      ? `${field.masked} — cole nova chave para substituir`
                      : "Cole a chave aqui"
                  }
                  autoComplete="off"
                  className={`${inputCls} pr-9 font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setReveal((r) => ({ ...r, [key]: !r[key] }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  title={reveal[key] ? "Ocultar" : "Mostrar"}
                >
                  {reveal[key] ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{hint}</p>
            </div>
          );
        })}

        {/* Ativar */}
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => {
              setAtivo(e.target.checked);
              setDirty(true);
            }}
            className="size-4 rounded accent-emerald-500"
          />
          Integração ativa (libera cobrança de assinaturas e pagamentos)
        </label>

        {mutation.isError && (
          <p className="text-xs text-rose-400">
            {mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar."}
          </p>
        )}
        {mutation.isSuccess && !dirty && (
          <p className="text-xs text-emerald-400">Chaves salvas com sucesso.</p>
        )}

        <div className="flex justify-end">
          <button
            disabled={mutation.isPending || !dirty}
            onClick={() => mutation.mutate()}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-5 py-2 text-sm font-semibold text-white transition"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}{" "}
            Salvar chaves
          </button>
        </div>
      </div>

      {/* Guia passo a passo */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Como obter as chaves
        </h3>
        <ol className="space-y-2 text-xs text-slate-400 list-decimal list-inside">
          <li>
            Acesse o{" "}
            <a
              href="https://www.mercadopago.com.br/developers/panel/app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-teal-400 hover:text-teal-300"
            >
              painel de desenvolvedores do Mercado Pago <ExternalLink className="h-3 w-3" />
            </a>{" "}
            e crie uma aplicação (tipo: <strong>Pagamentos online · CheckoutPro/Assinaturas</strong>
            ).
          </li>
          <li>
            Em <strong>Credenciais de teste</strong>, copie o <strong>Access Token</strong> e a{" "}
            <strong>Public Key</strong> e cole acima (mantenha o ambiente em <strong>Teste</strong>
            ).
          </li>
          <li>
            Em <strong>Suas integrações → seu app</strong>, copie o <strong>Client ID</strong> e o{" "}
            <strong>Client Secret</strong> (necessários para conectar a conta MP de cada médico).
          </li>
          <li>
            Em <strong>Webhooks</strong>, configure a URL{" "}
            <code className="text-slate-300">/api/webhooks/mercadopago</code> e cole a{" "}
            <strong>assinatura secreta</strong> acima.
          </li>
          <li>
            Marque <strong>Integração ativa</strong> e salve. Teste uma assinatura no dashboard de
            um médico. Validado? Troque para credenciais de <strong>Produção</strong> e ambiente{" "}
            <strong>Produção</strong>.
          </li>
        </ol>
      </div>
    </div>
  );
}
