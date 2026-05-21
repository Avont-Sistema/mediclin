import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/tanstack-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
  Settings,
  User,
  Briefcase,
  CalendarDays,
  Save,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import {
  fetchSettingsData,
  updateProfile,
  upsertService,
  toggleServiceActive,
  addAvailabilityRule,
  deleteAvailabilityRule,
  type SettingsData,
} from "../lib/settings";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Configurações — MediClin" }] }),
  loader: () => fetchSettingsData(),
  component: SettingsPage,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIA_LABELS: Record<string, string> = {
  domingo: "Domingo",
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
};

const DIA_ORDER = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];

function formatCurrency(v: string | number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Tab = "perfil" | "servicos" | "disponibilidade";
type DiaSemana = "domingo" | "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado";

// ─── Page ─────────────────────────────────────────────────────────────────────

function SettingsPage() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <SettingsContent />
      </SignedIn>
    </>
  );
}

function SettingsContent() {
  const data = Route.useLoaderData() as SettingsData | null;
  const [tab, setTab] = useState<Tab>("perfil");
  const router = useRouter();

  if (!data) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center text-slate-500 text-sm">
          Profissional não encontrado.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Topbar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="px-6 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-100 grid place-items-center">
            <Settings className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Configurações</h1>
            <p className="text-xs text-slate-500">
              Gerencie seu perfil, serviços e disponibilidade
            </p>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-3xl">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl mb-6 w-fit">
          {(
            [
              { id: "perfil", label: "Perfil", icon: User },
              { id: "servicos", label: "Serviços", icon: Briefcase },
              { id: "disponibilidade", label: "Disponibilidade", icon: CalendarDays },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "perfil" && <ProfileTab data={data} onSaved={() => router.invalidate()} />}
        {tab === "servicos" && <ServicesTab data={data} onSaved={() => router.invalidate()} />}
        {tab === "disponibilidade" && (
          <AvailabilityTab data={data} onSaved={() => router.invalidate()} />
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── ProfileTab ───────────────────────────────────────────────────────────────

function ProfileTab({ data, onSaved }: { data: SettingsData; onSaved: () => void }) {
  const p = data.professional;
  const [form, setForm] = useState({
    nomeCompleto: p.nomeCompleto,
    especialidade: p.especialidade,
    registro: p.registro,
    bio: p.bio ?? "",
    fotoUrl: p.fotoUrl ?? "",
    telefoneWhatsapp: p.telefoneWhatsapp ?? "",
    slug: p.slug,
  });
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => updateProfile({ data: form }),
    onSuccess: () => {
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const field = (
    label: string,
    key: keyof typeof form,
    opts?: { type?: string; placeholder?: string; hint?: string; textarea?: boolean },
  ) => (
    <div key={key}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {opts?.textarea ? (
        <textarea
          rows={3}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={opts.placeholder}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition resize-none"
        />
      ) : (
        <input
          type={opts?.type ?? "text"}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={opts?.placeholder}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
        />
      )}
      {opts?.hint && <p className="text-xs text-slate-500 mt-1">{opts.hint}</p>}
    </div>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {field("Nome completo", "nomeCompleto", { placeholder: "Dr. João Silva" })}
        {field("Especialidade", "especialidade", { placeholder: "Cardiologia" })}
        {field("Registro (CRM/CRO)", "registro", { placeholder: "CRM 123456-SP" })}
        {field("WhatsApp", "telefoneWhatsapp", {
          placeholder: "+5511999990000",
          hint: "Exibido no link público para reagendamentos",
        })}
        {field("Foto (URL)", "fotoUrl", {
          placeholder: "https://...",
          hint: "URL pública de uma imagem (JPEG/PNG)",
        })}
        {field("Slug (URL pública)", "slug", {
          hint: `Link: ${typeof window !== "undefined" ? window.location.origin : "https://mediclin.app"}/${form.slug}`,
        })}
      </div>
      {field("Bio / Apresentação", "bio", {
        textarea: true,
        placeholder: "Breve apresentação exibida no seu perfil público...",
      })}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <a
          href={`/${form.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver perfil público
        </a>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 px-5 py-2.5 text-sm font-semibold text-white transition"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Salvo!
            </>
          ) : mutation.isPending ? (
            "Salvando..."
          ) : (
            <>
              <Save className="h-4 w-4" /> Salvar alterações
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── ServicesTab ──────────────────────────────────────────────────────────────

type ServiceForm = {
  id?: string;
  nome: string;
  descricao: string;
  preco: string;
  duracaoMinutos: number;
};

const emptyService = (): ServiceForm => ({
  nome: "",
  descricao: "",
  preco: "",
  duracaoMinutos: 30,
});

function ServicesTab({ data, onSaved }: { data: SettingsData; onSaved: () => void }) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyService());

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertService({
        data: {
          id: form.id,
          nome: form.nome,
          descricao: form.descricao || undefined,
          preco: form.preco,
          duracaoMinutos: form.duracaoMinutos,
        },
      }),
    onSuccess: () => {
      setEditingId(null);
      setForm(emptyService());
      onSaved();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ serviceId, ativo }: { serviceId: string; ativo: boolean }) =>
      toggleServiceActive({ data: { serviceId, ativo } }),
    onSuccess: onSaved,
  });

  return (
    <div className="space-y-3">
      {data.services.map((svc) => {
        const isEditing = editingId === svc.id;
        return (
          <div
            key={svc.id}
            className={`rounded-2xl border bg-white p-4 transition ${
              svc.ativo ? "border-slate-200" : "border-slate-100 opacity-60"
            }`}
          >
            {isEditing ? (
              <ServiceForm
                form={form}
                onChange={setForm}
                onSave={() => saveMutation.mutate()}
                onCancel={() => {
                  setEditingId(null);
                  setForm(emptyService());
                }}
                isPending={saveMutation.isPending}
              />
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{svc.nome}</p>
                    {!svc.ativo && (
                      <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        Inativo
                      </span>
                    )}
                  </div>
                  {svc.descricao && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{svc.descricao}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>{formatCurrency(svc.preco)}</span>
                    <span>·</span>
                    <span>{svc.duracaoMinutos} min</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditingId(svc.id);
                      setForm({
                        id: svc.id,
                        nome: svc.nome,
                        descricao: svc.descricao ?? "",
                        preco: svc.preco,
                        duracaoMinutos: svc.duracaoMinutos,
                      });
                    }}
                    className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-500"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    disabled={toggleMutation.isPending}
                    onClick={() => toggleMutation.mutate({ serviceId: svc.id, ativo: !svc.ativo })}
                    className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition"
                    title={svc.ativo ? "Desativar" : "Ativar"}
                  >
                    {svc.ativo ? (
                      <ToggleRight className="h-5 w-5 text-teal-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add new */}
      {editingId === "new" ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
          <ServiceForm
            form={form}
            onChange={setForm}
            onSave={() => saveMutation.mutate()}
            onCancel={() => {
              setEditingId(null);
              setForm(emptyService());
            }}
            isPending={saveMutation.isPending}
          />
        </div>
      ) : (
        <button
          onClick={() => {
            setEditingId("new");
            setForm(emptyService());
          }}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/50 py-4 text-sm font-medium text-slate-500 hover:text-teal-700 transition"
        >
          <Plus className="h-4 w-4" />
          Adicionar serviço
        </button>
      )}
    </div>
  );
}

function ServiceForm({
  form,
  onChange,
  onSave,
  onCancel,
  isPending,
}: {
  form: ServiceForm;
  onChange: (f: ServiceForm) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Nome do serviço</label>
          <input
            value={form.nome}
            onChange={(e) => onChange({ ...form, nome: e.target.value })}
            placeholder="Consulta Cardiológica"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Preço (R$)</label>
          <input
            value={form.preco}
            onChange={(e) => onChange({ ...form, preco: e.target.value })}
            placeholder="250.00"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Duração (minutos)</label>
          <input
            type="number"
            value={form.duracaoMinutos}
            onChange={(e) => onChange({ ...form, duracaoMinutos: Number(e.target.value) })}
            min={5}
            max={480}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Descrição (opcional)
          </label>
          <input
            value={form.descricao}
            onChange={(e) => onChange({ ...form, descricao: e.target.value })}
            placeholder="Breve descrição do serviço..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="h-3.5 w-3.5" /> Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={isPending || !form.nome || !form.preco}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white transition"
        >
          <Save className="h-3.5 w-3.5" />
          {isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}

// ─── AvailabilityTab ──────────────────────────────────────────────────────────

function AvailabilityTab({ data, onSaved }: { data: SettingsData; onSaved: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [newRule, setNewRule] = useState({
    diaSemana: "segunda" as DiaSemana,
    horaInicio: "08:00",
    horaFim: "18:00",
  });

  const addMutation = useMutation({
    mutationFn: () => addAvailabilityRule({ data: newRule }),
    onSuccess: () => {
      setShowForm(false);
      onSaved();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => deleteAvailabilityRule({ data: { ruleId } }),
    onSuccess: onSaved,
  });

  const sorted = [...data.availabilityRules].sort(
    (a, b) => DIA_ORDER.indexOf(a.diaSemana) - DIA_ORDER.indexOf(b.diaSemana),
  );

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {sorted.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            Nenhuma regra de disponibilidade configurada.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sorted.map((rule) => (
              <li key={rule.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {DIA_LABELS[rule.diaSemana] ?? rule.diaSemana}
                  </p>
                  <p className="text-xs text-slate-500">
                    {rule.horaInicio} – {rule.horaFim}
                  </p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(rule.id)}
                  disabled={deleteMutation.isPending}
                  className="h-8 w-8 grid place-items-center rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition disabled:opacity-50"
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showForm ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-800">Nova regra de disponibilidade</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Dia da semana</label>
              <select
                value={newRule.diaSemana}
                onChange={(e) =>
                  setNewRule((r) => ({
                    ...r,
                    diaSemana: e.target.value as DiaSemana,
                  }))
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none bg-white"
              >
                {DIA_ORDER.map((d) => (
                  <option key={d} value={d}>
                    {DIA_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Início</label>
              <input
                type="time"
                value={newRule.horaInicio}
                onChange={(e) => setNewRule((r) => ({ ...r, horaInicio: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fim</label>
              <input
                type="time"
                value={newRule.horaFim}
                onChange={(e) => setNewRule((r) => ({ ...r, horaFim: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
            <button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white transition"
            >
              <Plus className="h-3.5 w-3.5" />
              {addMutation.isPending ? "Adicionando..." : "Adicionar"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/50 py-4 text-sm font-medium text-slate-500 hover:text-teal-700 transition"
        >
          <Plus className="h-4 w-4" />
          Adicionar regra
        </button>
      )}
    </div>
  );
}
