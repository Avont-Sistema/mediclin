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
  Palette,
  Video,
  Globe,
  Eye,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { buildPublicUrl } from "../lib/subdomain";
import {
  fetchSettingsData,
  updateProfile,
  updatePageCustomization,
  upsertService,
  toggleServiceActive,
  addAvailabilityRule,
  deleteAvailabilityRule,
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

type Tab = "perfil" | "pagina" | "agenda" | "equipe";
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

  const isClinic = data.professional.plano === "clinic";

  const tabs = [
    { id: "perfil" as const, label: "Perfil", icon: User },
    { id: "pagina" as const, label: "Página Pública", icon: Globe },
    { id: "agenda" as const, label: "Serviços & Agenda", icon: CalendarDays },
    { id: "equipe" as const, label: "Equipe", icon: Users },
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
        {tab === "pagina" && <PageCustomizationTab data={data} onSaved={() => router.invalidate()} />}
        {tab === "agenda" && <AgendaTab data={data} onSaved={() => router.invalidate()} />}
        {tab === "equipe" && (
          isClinic
            ? <TeamTab data={data} onSaved={() => router.invalidate()} />
            : <ClinicUpgradePrompt onUpgrade={() => setTab("perfil")} />
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
          {field("WhatsApp", "telefoneWhatsapp", {
            placeholder: "+5511999990000",
            hint: "Exibido no link público para reagendamentos",
          })}
          {field("Foto (URL)", "fotoUrl", {
            placeholder: "https://...",
            hint: "URL pública de uma imagem (JPEG/PNG)",
          })}
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

// ─── PageCustomizationTab ─────────────────────────────────────────────────────

function PageCustomizationTab({ data, onSaved }: { data: SettingsData; onSaved: () => void }) {
  const p = data.professional;
  const [form, setForm] = useState({
    corMarca: p.corMarca ?? "#0d9488",
    corTexto: p.corTexto ?? "#0f172a",
    heroTitulo: p.heroTitulo ?? "",
    heroSubtitulo: p.heroSubtitulo ?? "",
    heroImageUrl: p.heroImageUrl ?? "",
    telemedicinaAtivo: p.telemedicinaAtivo ?? false,
    meetLink: p.meetLink ?? "",
  });
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => updatePageCustomization({ data: form }),
    onSuccess: () => {
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const publicUrl = buildPublicUrl(p.slug);

  return (
    <div className="space-y-5">
      {/* Color section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Cores da marca</h3>
        </div>
        <p className="text-xs text-slate-500 -mt-3">
          As cores escolhidas serão aplicadas em todos os botões, destaques e painel da sua página pública.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Cor principal */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Cor principal da marca</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.corMarca}
                onChange={(e) => setForm((f) => ({ ...f, corMarca: e.target.value }))}
                className="h-10 w-16 cursor-pointer rounded-lg border border-slate-200 p-0.5"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={form.corMarca}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setForm((f) => ({ ...f, corMarca: v }));
                  }}
                  maxLength={7}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                  placeholder="#0d9488"
                />
              </div>
            </div>
            <div
              className="mt-3 rounded-xl p-3 flex items-center gap-3 text-white text-sm font-medium"
              style={{ background: form.corMarca }}
            >
              <div className="h-8 w-8 rounded-lg bg-white/20 grid place-items-center">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs opacity-70">Preview</p>
                <p>Botão de agendamento</p>
              </div>
            </div>
          </div>

          {/* Cor de texto */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Cor do texto principal</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.corTexto}
                onChange={(e) => setForm((f) => ({ ...f, corTexto: e.target.value }))}
                className="h-10 w-16 cursor-pointer rounded-lg border border-slate-200 p-0.5"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={form.corTexto}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setForm((f) => ({ ...f, corTexto: v }));
                  }}
                  maxLength={7}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                  placeholder="#0f172a"
                />
              </div>
            </div>
            <div
              className="mt-3 rounded-xl border border-slate-200 p-3 text-sm"
              style={{ color: form.corTexto }}
            >
              <p className="font-bold">Título da página</p>
              <p className="opacity-70 text-xs mt-0.5">Subtítulo e textos secundários</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hero content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Conteúdo da página pública</h3>
        </div>
        <p className="text-xs text-slate-500 -mt-3">
          Personalize o que seus pacientes verão ao acessar seu link. Deixe em branco para usar os valores padrão.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Título principal
            </label>
            <input
              type="text"
              value={form.heroTitulo}
              onChange={(e) => setForm((f) => ({ ...f, heroTitulo: e.target.value }))}
              placeholder={`Cuidado de saúde com ${p.especialidade}.`}
              maxLength={255}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              💡 A <strong>última palavra</strong> do título será destacada na cor da sua marca.
              Ex: "Cuidado de saúde com <em>longevidade.</em>"
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Subtítulo / chamada{" "}
              <span className="text-xs font-normal text-slate-400">(padrão: sua bio)</span>
            </label>
            <textarea
              rows={3}
              value={form.heroSubtitulo}
              onChange={(e) => setForm((f) => ({ ...f, heroSubtitulo: e.target.value }))}
              placeholder="Escolha o serviço, data e horário. Confirmação imediata."
              maxLength={500}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Foto / imagem de destaque{" "}
              <span className="text-xs font-normal text-slate-400">(aparece no lado direito do hero)</span>
            </label>
            <input
              type="url"
              value={form.heroImageUrl}
              onChange={(e) => setForm((f) => ({ ...f, heroImageUrl: e.target.value }))}
              placeholder="https://minha-foto.com/capa.jpg"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            />
            {form.heroImageUrl && (
              <img
                src={form.heroImageUrl}
                alt="Preview capa"
                className="mt-2 h-20 w-full rounded-lg object-cover border border-slate-200"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
          </div>
        </div>
      </div>

      {/* Telemedicina */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Telemedicina</h3>
          </div>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, telemedicinaAtivo: !f.telemedicinaAtivo }))}
            className="transition"
          >
            {form.telemedicinaAtivo ? (
              <ToggleRight className="h-7 w-7 text-teal-600" />
            ) : (
              <ToggleLeft className="h-7 w-7 text-slate-400" />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Quando ativado, aparece o badge "Telemedicina" no seu perfil público e o link da consulta online é exibido após a confirmação do agendamento.
        </p>

        {form.telemedicinaAtivo && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Link Google Meet (ou Zoom)
            </label>
            <input
              type="url"
              value={form.meetLink}
              onChange={(e) => setForm((f) => ({ ...f, meetLink: e.target.value }))}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver página pública
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

// ─── AgendaTab (Serviços + Disponibilidade combinados) ────────────────────────

function AgendaTab({ data, onSaved }: { data: SettingsData; onSaved: () => void }) {
  return (
    <div className="space-y-10">
      {/* ── Serviços ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-slate-100 grid place-items-center">
            <Briefcase className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Serviços</p>
            <p className="text-xs text-slate-500">Configure os serviços oferecidos e seus preços</p>
          </div>
        </div>
        <ServicesTab data={data} onSaved={onSaved} />
      </div>

      {/* ── Divider ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-slate-200" />
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
          Disponibilidade
        </span>
        <div className="flex-1 border-t border-slate-200" />
      </div>

      {/* ── Horários ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-slate-100 grid place-items-center">
            <CalendarDays className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Horários de atendimento</p>
            <p className="text-xs text-slate-500">
              Regras semanais recorrentes — quando você está disponível para atender
            </p>
          </div>
        </div>
        <AvailabilityTab data={data} onSaved={onSaved} />
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
                  setNewRule((r) => ({ ...r, diaSemana: e.target.value as DiaSemana }))
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
