import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/tanstack-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
  Settings,
  User,
  Briefcase,
  Save,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Users,
  ChevronDown,
  ChevronUp,
  LifeBuoy,
  MessageCircle,
  Mail,
  BookOpen,
  LayoutDashboard,
  CalendarDays,
  Share2,
  Bell,
  Link as LinkIcon,
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { PhotoUpload } from "../components/PhotoUpload";
import { buildPublicUrl } from "../lib/subdomain";
import {
  fetchSettingsData,
  updateProfile,
  upsertService,
  toggleServiceActive,
  addClinicMember,
  updateClinicMember,
  removeClinicMember,
  slugify,
  type SettingsData,
  type ClinicMember,
} from "../lib/settings";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Configurações — MediClin" }] }),
  loader: () => fetchSettingsData(),
  component: SettingsPage,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(v: string | number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Tab = "perfil" | "equipe" | "suporte";

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

  const isClinic = data.professional.plano === "clinic";

  const tabs = [
    { id: "perfil" as const, label: "Perfil", icon: User },
    { id: "equipe" as const, label: "Equipe", icon: Users },
    { id: "suporte" as const, label: "Suporte", icon: LifeBuoy },
  ];

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
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl mb-6 w-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              } ${id === "equipe" && !isClinic ? "opacity-50" : ""}`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === "equipe" && !isClinic && (
                <span className="ml-1 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600 uppercase">
                  Clinic
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "perfil" && <ProfileTab data={data} onSaved={() => router.invalidate()} />}
        {tab === "equipe" && (
          isClinic
            ? <TeamTab data={data} onSaved={() => router.invalidate()} />
            : <ClinicUpgradePrompt onUpgrade={() => setTab("perfil")} />
        )}
        {tab === "suporte" && <SupportTab slug={data.professional.slug} />}
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
    uf: p.uf ?? "",
    bio: p.bio ?? "",
    fotoUrl: p.fotoUrl ?? "",
    telefoneWhatsapp: p.telefoneWhatsapp ?? "",
    slug: p.slug,
    plano: p.plano as "free" | "pro" | "clinic",
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
          value={form[key] as string}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={opts.placeholder}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition resize-none"
        />
      ) : (
        <input
          type={opts?.type ?? "text"}
          value={form[key] as string}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={opts?.placeholder}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
        />
      )}
      {opts?.hint && <p className="text-xs text-slate-500 mt-1">{opts.hint}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {field("Nome completo", "nomeCompleto", { placeholder: "Dr. João Silva" })}
          {field("Especialidade", "especialidade", { placeholder: "Cardiologia" })}
          {field("Registro (CRM/CRO)", "registro", { placeholder: "CRM 123456-SP" })}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estado (UF)</label>
            <select
              value={form.uf}
              onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition bg-white"
            >
              <option value="">Selecione...</option>
              {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {field("WhatsApp", "telefoneWhatsapp", {
            placeholder: "+5511999990000",
            hint: "Exibido no link público para reagendamentos",
          })}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-3">Foto de perfil</label>
            <PhotoUpload
              currentUrl={form.fotoUrl || null}
              name={form.nomeCompleto}
              size="sm"
              onUploaded={(url) => setForm((f) => ({ ...f, fotoUrl: url }))}
              onRemove={() => setForm((f) => ({ ...f, fotoUrl: "" }))}
            />
          </div>
          {field("Slug (URL pública)", "slug", {
            hint: `Seu link: ${buildPublicUrl(form.slug || "seu-nome")}`,
          })}
        </div>
        {field("Bio / Apresentação", "bio", {
          textarea: true,
          placeholder: "Breve apresentação exibida no seu perfil público...",
        })}

        {/* Plano */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Plano MediClin</label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: "free", label: "Gratuito", desc: "1 profissional, serviços ilimitados" },
                { value: "pro", label: "Pro", desc: "Tudo do gratuito + pagamentos online" },
                { value: "clinic", label: "Clínica", desc: "Múltiplos profissionais na equipe" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, plano: opt.value }))}
                className={`rounded-xl border p-3 text-left transition ${
                  form.plano === opt.value
                    ? "border-teal-400 bg-teal-50 ring-2 ring-teal-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <a
            href={buildPublicUrl(form.slug || "seu-nome")}
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
  modalidade: "presencial" | "online" | "ambos";
};

const emptyService = (): ServiceForm => ({
  nome: "",
  descricao: "",
  preco: "",
  duracaoMinutos: 30,
  modalidade: "presencial",
});

function ServicesTab({
  data,
  onSaved,
  targetProfessionalId,
  services: servicesProp,
}: {
  data: SettingsData;
  onSaved: () => void;
  targetProfessionalId?: string;
  services?: SettingsData["services"];
}) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyService());

  const displayServices = servicesProp ?? data.services;

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertService({
        data: {
          targetProfessionalId,
          id: form.id,
          nome: form.nome,
          descricao: form.descricao || undefined,
          preco: form.preco,
          duracaoMinutos: form.duracaoMinutos,
          modalidade: form.modalidade,
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
      toggleServiceActive({ data: { targetProfessionalId, serviceId, ativo } }),
    onSuccess: onSaved,
  });

  return (
    <div className="space-y-3">
      {displayServices.map((svc) => {
        const isEditing = editingId === svc.id;
        return (
          <div
            key={svc.id}
            className={`rounded-2xl border bg-white p-4 transition ${
              svc.ativo ? "border-slate-200" : "border-slate-100 opacity-60"
            }`}
          >
            {isEditing ? (
              <ServiceFormWidget
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
                    <span>·</span>
                    <span className={`font-medium ${
                      svc.modalidade === "online"
                        ? "text-sky-600"
                        : svc.modalidade === "ambos"
                          ? "text-violet-600"
                          : "text-emerald-600"
                    }`}>
                      {svc.modalidade === "online"
                        ? "Telemedicina"
                        : svc.modalidade === "ambos"
                          ? "Presencial+Online"
                          : "Presencial"}
                    </span>
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
                        modalidade: svc.modalidade ?? "presencial",
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
          <ServiceFormWidget
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

function ServiceFormWidget({
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
            Modalidade de atendimento
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: "presencial", label: "🏥 Presencial", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
                { value: "online", label: "💻 Telemedicina", cls: "border-sky-200 bg-sky-50 text-sky-700" },
                { value: "ambos", label: "🔀 Ambos", cls: "border-violet-200 bg-violet-50 text-violet-700" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...form, modalidade: opt.value })}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition ${
                  form.modalidade === opt.value
                    ? opt.cls
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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

// ─── TeamTab ──────────────────────────────────────────────────────────────────

type MemberForm = {
  nomeCompleto: string;
  especialidade: string;
  registro: string;
  bio: string;
  fotoUrl: string;
  slug: string;
  corMarca: string;
};

const emptyMember = (parentBrand = "#0d9488"): MemberForm => ({
  nomeCompleto: "",
  especialidade: "",
  registro: "",
  bio: "",
  fotoUrl: "",
  slug: "",
  corMarca: parentBrand,
});

function TeamTab({ data, onSaved }: { data: SettingsData; onSaved: () => void }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<MemberForm>(emptyMember(data.professional.corMarca ?? "#0d9488"));
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<Record<string, MemberForm>>({});

  const addMutation = useMutation({
    mutationFn: () =>
      addClinicMember({
        data: {
          nomeCompleto: addForm.nomeCompleto,
          especialidade: addForm.especialidade,
          registro: addForm.registro,
          bio: addForm.bio || undefined,
          fotoUrl: addForm.fotoUrl || undefined,
          slug: addForm.slug,
          corMarca: addForm.corMarca as `#${string}`,
        },
      }),
    onSuccess: () => {
      setShowAddForm(false);
      setAddForm(emptyMember(data.professional.corMarca ?? "#0d9488"));
      onSaved();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (memberId: string) => {
      const f = editForms[memberId];
      return updateClinicMember({
        data: {
          memberId,
          nomeCompleto: f.nomeCompleto,
          especialidade: f.especialidade,
          registro: f.registro,
          bio: f.bio || undefined,
          fotoUrl: f.fotoUrl || undefined,
          slug: f.slug,
          corMarca: f.corMarca as `#${string}`,
        },
      });
    },
    onSuccess: () => {
      setEditingMemberId(null);
      onSaved();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeClinicMember({ data: { memberId } }),
    onSuccess: onSaved,
  });

  const autoSlug = (name: string) => slugify(name);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Equipe da clínica</h3>
        </div>
        <p className="text-xs text-slate-500">
          Cada profissional adicionado aparece na página da clínica. Os pacientes escolhem o profissional e os serviços, tudo em um único link.
        </p>
      </div>

      {/* Member list */}
      {data.members.length === 0 && !showAddForm && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <Users className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Nenhum profissional na equipe</p>
          <p className="text-xs text-slate-400 mt-1">Clique em "Adicionar profissional" para começar</p>
        </div>
      )}

      {data.members.map((member) => {
        const isExpanded = expandedMemberId === member.id;
        const isEditing = editingMemberId === member.id;
        const editForm = editForms[member.id] ?? {
          nomeCompleto: member.nomeCompleto,
          especialidade: member.especialidade,
          registro: member.registro,
          bio: member.bio ?? "",
          fotoUrl: member.fotoUrl ?? "",
          slug: member.slug,
          corMarca: member.corMarca ?? "#0d9488",
        };

        return (
          <div
            key={member.id}
            className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
          >
            {/* Member header */}
            <div className="flex items-center gap-3 p-4">
              {/* Avatar */}
              {member.fotoUrl ? (
                <img
                  src={member.fotoUrl}
                  alt={member.nomeCompleto}
                  className="h-11 w-11 rounded-xl object-cover ring-1 ring-slate-100 shrink-0"
                />
              ) : (
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ background: member.corMarca ?? data.professional.corMarca ?? "#0d9488" }}
                >
                  {member.nomeCompleto.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{member.nomeCompleto}</p>
                <p className="text-xs text-slate-500">{member.especialidade} · {member.registro}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-400">/{member.slug}</span>
                  <a
                    href={buildPublicUrl(member.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-[10px] text-teal-600 hover:text-teal-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    ver página
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditingMemberId(isEditing ? null : member.id);
                    setEditForms((f) => ({ ...f, [member.id]: editForm }));
                  }}
                  className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-500"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                  className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-500"
                  title={isExpanded ? "Recolher" : "Gerenciar serviços"}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Remover ${member.nomeCompleto} da equipe?`)) {
                      removeMutation.mutate(member.id);
                    }
                  }}
                  disabled={removeMutation.isPending}
                  className="h-8 w-8 grid place-items-center rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition disabled:opacity-50"
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Edit form */}
            {isEditing && (
              <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                <p className="text-xs font-semibold text-slate-700 mb-3">Editar profissional</p>
                <MemberFormWidget
                  form={editForms[member.id] ?? editForm}
                  onChange={(f) => setEditForms((prev) => ({ ...prev, [member.id]: f }))}
                  onSave={() => updateMutation.mutate(member.id)}
                  onCancel={() => setEditingMemberId(null)}
                  isPending={updateMutation.isPending}
                  autoSlug={autoSlug}
                />
              </div>
            )}

            {/* Services section */}
            {isExpanded && (
              <div className="border-t border-slate-100 p-4 bg-slate-50/30">
                <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  Serviços de {member.nomeCompleto.split(" ")[0]}
                </p>
                <ServicesTab
                  data={data}
                  onSaved={onSaved}
                  targetProfessionalId={member.id}
                  services={member.services}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Add member form */}
      {showAddForm ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/30 p-5">
          <p className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-violet-600" />
            Novo profissional
          </p>
          <MemberFormWidget
            form={addForm}
            onChange={setAddForm}
            onSave={() => addMutation.mutate()}
            onCancel={() => {
              setShowAddForm(false);
              setAddForm(emptyMember(data.professional.corMarca ?? "#0d9488"));
            }}
            isPending={addMutation.isPending}
            autoSlug={autoSlug}
            error={addMutation.error instanceof Error ? addMutation.error.message : undefined}
          />
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-300 hover:border-violet-400 hover:bg-violet-50/50 py-4 text-sm font-medium text-violet-600 hover:text-violet-800 transition"
        >
          <Plus className="h-4 w-4" />
          Adicionar profissional
        </button>
      )}
    </div>
  );
}

function MemberFormWidget({
  form,
  onChange,
  onSave,
  onCancel,
  isPending,
  autoSlug,
  error,
}: {
  form: MemberForm;
  onChange: (f: MemberForm) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
  autoSlug: (name: string) => string;
  error?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Nome completo *</label>
          <input
            value={form.nomeCompleto}
            onChange={(e) => {
              const name = e.target.value;
              onChange({
                ...form,
                nomeCompleto: name,
                // Auto-fill slug if it hasn't been manually changed
                slug: form.slug === autoSlug(form.nomeCompleto) || form.slug === ""
                  ? autoSlug(name)
                  : form.slug,
              });
            }}
            placeholder="Dra. Ana Cardoso"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Especialidade *</label>
          <input
            value={form.especialidade}
            onChange={(e) => onChange({ ...form, especialidade: e.target.value })}
            placeholder="Cardiologia"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Registro (CRM/CRO) *</label>
          <input
            value={form.registro}
            onChange={(e) => onChange({ ...form, registro: e.target.value })}
            placeholder="CRM 123456-SP"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Slug (URL pública){" "}
            <span className="text-slate-400 font-normal">— preenchido automaticamente</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 shrink-0">mediclin.vercel.app/</span>
            <input
              value={form.slug}
              onChange={(e) => onChange({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
              placeholder="dra-ana-cardoso"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none font-mono"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Foto (URL)</label>
          <input
            value={form.fotoUrl}
            onChange={(e) => onChange({ ...form, fotoUrl: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Cor da marca</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={form.corMarca}
              onChange={(e) => onChange({ ...form, corMarca: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 p-0.5"
            />
            <input
              type="text"
              value={form.corMarca}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange({ ...form, corMarca: v });
              }}
              maxLength={7}
              className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Bio (opcional)</label>
          <textarea
            rows={2}
            value={form.bio}
            onChange={(e) => onChange({ ...form, bio: e.target.value })}
            placeholder="Breve apresentação do profissional..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none resize-none"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="h-3.5 w-3.5" /> Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={isPending || !form.nomeCompleto || !form.especialidade || !form.registro || !form.slug}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition"
        >
          <Save className="h-3.5 w-3.5" />
          {isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}

// ─── SupportTab ───────────────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    icon: User,
    color: "bg-teal-100 text-teal-700",
    title: "Configure seu Perfil",
    desc: "Preencha nome, especialidade, CRM, foto e bio. Defina também o seu slug — ele vira o endereço público da sua página.",
    tip: "Aba Perfil → Salvar alterações",
  },
  {
    icon: Briefcase,
    color: "bg-violet-100 text-violet-700",
    title: "Cadastre seus Serviços",
    desc: "Adicione as consultas que você oferece com nome, preço e duração. Você pode ativar ou desativar serviços a qualquer momento.",
    tip: "Aba Perfil → Serviços",
  },
  {
    icon: CalendarDays,
    color: "bg-sky-100 text-sky-700",
    title: "Configure sua Disponibilidade",
    desc: "Na Agenda, defina os dias da semana e horários em que você atende. Os pacientes só vão enxergar os slots que você liberar.",
    tip: "Menu → Agenda → Disponibilidade",
  },
  {
    icon: Share2,
    color: "bg-amber-100 text-amber-700",
    title: "Compartilhe seu Link",
    desc: "Coloque seu link público na bio do Instagram ou envie pelo WhatsApp. Os pacientes acessam, escolhem serviço, horário e pagam — tudo no celular.",
    tip: "Aba Perfil → Ver perfil público",
  },
  {
    icon: Bell,
    color: "bg-rose-100 text-rose-700",
    title: "Acompanhe os Agendamentos",
    desc: "No Dashboard você vê os agendamentos do dia e as métricas do mês. Na Agenda você gerencia, confirma e cancela consultas.",
    tip: "Menu → Dashboard / Agenda",
  },
];

const FAQ = [
  {
    q: "Como o paciente paga a consulta?",
    a: "O paciente paga diretamente pela sua página pública via Mercado Pago. O valor cai na sua conta automaticamente, com desconto da taxa da plataforma.",
  },
  {
    q: "Preciso criar uma conta separada para o Mercado Pago?",
    a: "Sim. No Dashboard, clique em 'Conectar Mercado Pago' e siga o onboarding. Você só precisa fazer isso uma vez.",
  },
  {
    q: "Posso ter mais de um profissional na mesma conta?",
    a: "Sim, com o plano Clínica. Cada profissional ganha página, agenda e serviços independentes, tudo gerenciado por uma única conta.",
  },
  {
    q: "Como o paciente recebe a confirmação?",
    a: "Assim que o agendamento é criado, o paciente recebe um e-mail de confirmação com os dados da consulta.",
  },
  {
    q: "Posso bloquear dias de folga?",
    a: "Sim. Na Agenda, clique no botão 'Modo Folga' para bloquear dias específicos com uma mensagem personalizada para os pacientes.",
  },
];

function SupportTab({ slug }: { slug: string }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const publicUrl = buildPublicUrl(slug);

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">

      {/* ── Seu link público ── */}
      <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
        <div className="flex items-center gap-2 mb-1">
          <LinkIcon className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-semibold text-teal-900">Seu link público</h3>
        </div>
        <p className="text-xs text-teal-700 mb-3">
          Este é o link que você coloca na bio do Instagram para seus pacientes agendarem.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs text-teal-800 font-mono">
            {publicUrl}
          </code>
          <button
            onClick={copyLink}
            className="shrink-0 flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-teal-200 bg-white hover:bg-teal-50 px-3 py-2 text-xs font-medium text-teal-700 transition"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir
          </a>
        </div>
      </div>

      {/* ── Tutorial ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-800">Como usar o MediClin</h3>
        </div>
        <ol className="space-y-0">
          {TUTORIAL_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === TUTORIAL_STEPS.length - 1;
            return (
              <li key={i} className="flex gap-4">
                {/* Connector column */}
                <div className="flex flex-col items-center">
                  <div className={`h-9 w-9 shrink-0 rounded-xl grid place-items-center ${step.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-slate-100 my-1" />}
                </div>
                {/* Content */}
                <div className={`flex-1 ${isLast ? "pb-0" : "pb-5"}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold text-slate-400">0{i + 1}</span>
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.desc}</p>
                  <span className="inline-block mt-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    {step.tip}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── FAQ ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <LayoutDashboard className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-800">Perguntas frequentes</h3>
        </div>
        <div className="space-y-1">
          {FAQ.map((item, i) => (
            <div key={i} className="rounded-xl border border-slate-100 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
              >
                <span className="text-sm font-medium text-slate-800">{item.q}</span>
                {openFaq === i ? (
                  <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                )}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2 bg-slate-50/60">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Contato ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-1">
          <LifeBuoy className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-800">Fale com a equipe</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Respondemos em até 24h em dias úteis. Prefira o WhatsApp para respostas mais rápidas.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="https://wa.me/5511999999999?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20MediClin"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-4 py-3.5 transition group"
          >
            <div className="h-9 w-9 shrink-0 rounded-xl bg-emerald-500 grid place-items-center">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">WhatsApp</p>
              <p className="text-xs text-emerald-700">Suporte via mensagem</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-emerald-500 ml-auto opacity-0 group-hover:opacity-100 transition" />
          </a>
          <a
            href="mailto:suporte@cuidandovc.com.br"
            className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 px-4 py-3.5 transition group"
          >
            <div className="h-9 w-9 shrink-0 rounded-xl bg-sky-500 grid place-items-center">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-sky-900">E-mail</p>
              <p className="text-xs text-sky-700">suporte@cuidandovc.com.br</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-sky-500 ml-auto opacity-0 group-hover:opacity-100 transition" />
          </a>
        </div>
        <p className="mt-4 text-center text-[11px] text-slate-400">
          MediClin · versão 1.0 · Desenvolvido por{" "}
          <a
            href="https://avontsistemas.com.br"
            target="_blank"
            rel="noreferrer"
            className="text-teal-600 hover:underline"
          >
            Avont Sistemas
          </a>
        </p>
      </div>

    </div>
  );
}

// ─── ClinicUpgradePrompt ──────────────────────────────────────────────────────

function ClinicUpgradePrompt({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
        <Users className="h-7 w-7 text-violet-600" />
      </div>
      <h3 className="text-base font-bold text-slate-900">Plano Clínica</h3>
      <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
        Adicione toda a sua equipe de profissionais. Cada um ganha sua própria página pública, serviços e agenda.
      </p>
      <ul className="mt-4 space-y-1.5 text-xs text-slate-600 text-left max-w-xs mx-auto">
        {[
          "Múltiplos profissionais em uma conta",
          "Cada profissional com página própria",
          "Serviços e agenda independentes",
          "Página da clínica com grid da equipe",
          "Cores personalizáveis por profissional",
        ].map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onUpgrade}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-6 py-2.5 text-sm font-semibold text-white transition"
      >
        Ativar plano Clínica →
      </button>
      <p className="mt-2 text-xs text-slate-400">
        Acesse a aba Perfil e selecione "Clínica"
      </p>
    </div>
  );
}
