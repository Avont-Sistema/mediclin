import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Plus, Trash2, Pencil, Check, X, GripVertical,
  Award, GraduationCap, Sparkles, MessageCircle,
  Instagram, MapPin, Phone, Mail, ExternalLink,
  Clock, Stethoscope, Monitor, MapPinned, ChevronDown,
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { PhotoUpload } from "../components/PhotoUpload";
import { fetchCurrentProfessional } from "../lib/auth";
import {
  listCards, createCard, updateCard, deleteCard, reorderCards,
  updatePageIdentity, CARD_TYPES,
  type ProfessionalCard, type CardType,
} from "../lib/cards";
import {
  listServices, createService, updateService, deleteService,
  type Service,
} from "../lib/services";

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/pagina-publica")({
  beforeLoad: async () => {
    const prof = await fetchCurrentProfessional();
    if (!prof) throw redirect({ to: "/sign-in" });
  },
  head: () => ({ meta: [{ title: "MediClin — Página Pública" }] }),
  component: PaginaPublicaPage,
});

// ─── Color system ─────────────────────────────────────────────────────────────

const ALL_COLORS = [
  { key: "teal",    hex: "#14b8a6", label: "Teal"     },
  { key: "emerald", hex: "#10b981", label: "Esmeralda"},
  { key: "cyan",    hex: "#06b6d4", label: "Ciano"    },
  { key: "sky",     hex: "#0ea5e9", label: "Céu"      },
  { key: "blue",    hex: "#3b82f6", label: "Azul"     },
  { key: "indigo",  hex: "#6366f1", label: "Índigo"   },
  { key: "violet",  hex: "#8b5cf6", label: "Violeta"  },
  { key: "purple",  hex: "#a855f7", label: "Roxo"     },
  { key: "fuchsia", hex: "#d946ef", label: "Fúcsia"   },
  { key: "pink",    hex: "#ec4899", label: "Rosa"     },
  { key: "rose",    hex: "#f43f5e", label: "Vermelho" },
  { key: "orange",  hex: "#f97316", label: "Laranja"  },
  { key: "amber",   hex: "#f59e0b", label: "Âmbar"    },
  { key: "yellow",  hex: "#eab308", label: "Amarelo"  },
  { key: "lime",    hex: "#84cc16", label: "Lima"     },
] as const;

type ColorKey = (typeof ALL_COLORS)[number]["key"];

// All Tailwind classes must be present in source for JIT to include them
const COLOR_MAP_PREVIEW: Record<ColorKey, { text: string; gradient: string; badge: string; soft: string }> = {
  teal:    { text: "text-teal-600",    gradient: "from-teal-500 to-teal-700",    badge: "bg-teal-600",    soft: "bg-teal-50"    },
  emerald: { text: "text-emerald-600", gradient: "from-emerald-500 to-emerald-700", badge: "bg-emerald-600", soft: "bg-emerald-50" },
  cyan:    { text: "text-cyan-600",    gradient: "from-cyan-500 to-cyan-700",    badge: "bg-cyan-600",    soft: "bg-cyan-50"    },
  sky:     { text: "text-sky-600",     gradient: "from-sky-500 to-sky-700",     badge: "bg-sky-600",     soft: "bg-sky-50"     },
  blue:    { text: "text-blue-600",    gradient: "from-blue-500 to-blue-700",   badge: "bg-blue-600",    soft: "bg-blue-50"    },
  indigo:  { text: "text-indigo-600",  gradient: "from-indigo-500 to-indigo-700", badge: "bg-indigo-600", soft: "bg-indigo-50"  },
  violet:  { text: "text-violet-600",  gradient: "from-violet-500 to-violet-700", badge: "bg-violet-600", soft: "bg-violet-50"  },
  purple:  { text: "text-purple-600",  gradient: "from-purple-500 to-purple-700", badge: "bg-purple-600", soft: "bg-purple-50"  },
  fuchsia: { text: "text-fuchsia-600", gradient: "from-fuchsia-500 to-fuchsia-700", badge: "bg-fuchsia-600", soft: "bg-fuchsia-50" },
  pink:    { text: "text-pink-600",    gradient: "from-pink-500 to-pink-700",   badge: "bg-pink-600",    soft: "bg-pink-50"    },
  rose:    { text: "text-rose-600",    gradient: "from-rose-500 to-rose-700",   badge: "bg-rose-600",    soft: "bg-rose-50"    },
  orange:  { text: "text-orange-600",  gradient: "from-orange-500 to-orange-700", badge: "bg-orange-600", soft: "bg-orange-50"  },
  amber:   { text: "text-amber-600",   gradient: "from-amber-500 to-amber-700", badge: "bg-amber-600",   soft: "bg-amber-50"   },
  yellow:  { text: "text-yellow-600",  gradient: "from-yellow-500 to-yellow-700", badge: "bg-yellow-600", soft: "bg-yellow-50"  },
  lime:    { text: "text-lime-600",    gradient: "from-lime-500 to-lime-700",   badge: "bg-lime-600",    soft: "bg-lime-50"    },
};

// ─── Card icon map ────────────────────────────────────────────────────────────

const CARD_ICON_MAP: Record<CardType, React.ElementType> = {
  certificacao: Award,
  qualificacao: GraduationCap,
  servico_extra: Sparkles,
  whatsapp: MessageCircle,
  instagram: Instagram,
  localizacao: MapPin,
  telefone: Phone,
  email: Mail,
};

// ─── Page component ───────────────────────────────────────────────────────────

function PaginaPublicaPage() {
  const qc = useQueryClient();

  const { data: prof, isLoading: profLoading } = useQuery({
    queryKey: ["currentProfessional"],
    queryFn: () => fetchCurrentProfessional(),
    staleTime: 30_000,
  });

  const { data: cards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ["myCards"],
    queryFn: () => listCards(),
  });

  const { data: svcs = [], isLoading: svcsLoading } = useQuery({
    queryKey: ["myServices"],
    queryFn: () => listServices(),
  });

  // ── Identity form state ─────────────────────────────────────────────────────
  const [fotoUrl, setFotoUrl] = useState<string>("");
  const [headline, setHeadline] = useState("");
  const [headlineDestaque, setHeadlineDestaque] = useState("");
  const [bio, setBio] = useState("");
  const [corPrimaria, setCorPrimaria] = useState<ColorKey>("teal");
  const [corDestaque, setCorDestaque] = useState<ColorKey | null>(null);
  const [identitySaved, setIdentitySaved] = useState(false);

  // Populate form once professional loads
  useEffect(() => {
    if (!prof) return;
    setFotoUrl(prof.fotoUrl ?? "");
    setHeadline(prof.headline ?? "");
    setHeadlineDestaque(prof.headlineDestaque ?? "");
    setBio(prof.bio ?? "");
    setCorPrimaria((prof.corPrimaria as ColorKey) ?? "teal");
    setCorDestaque((prof.corDestaque as ColorKey) ?? null);
  }, [prof]);

  const identityMutation = useMutation({
    mutationFn: () =>
      updatePageIdentity({
        data: { headline, headlineDestaque, bio, corPrimaria, corDestaque, fotoUrl },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["currentProfessional"] });
      setIdentitySaved(true);
      setTimeout(() => setIdentitySaved(false), 2500);
    },
  });

  // ── Card state ──────────────────────────────────────────────────────────────
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<ProfessionalCard | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCard({ data: { id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["myCards"] }),
  });

  // ── Drag-and-drop reorder ───────────────────────────────────────────────────
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[]>([]);

  // Sync local order from server (but not while dragging)
  useEffect(() => {
    if (!draggingId) setLocalOrder(cards.map((c) => c.id));
  }, [cards, draggingId]);

  const sortedCards =
    localOrder.length > 0
      ? localOrder
          .map((id) => cards.find((c) => c.id === id))
          .filter((c): c is ProfessionalCard => c != null)
      : cards;

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => reorderCards({ data: { ids } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["myCards"] }),
  });

  function handleDragStart(id: string) {
    setDraggingId(id);
  }

  function handleDragOver(targetId: string) {
    if (targetId === draggingId || targetId === dragOverId) return;
    setDragOverId(targetId);
    const from = localOrder.indexOf(draggingId!);
    const to = localOrder.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...localOrder];
    next.splice(from, 1);
    next.splice(to, 0, draggingId!);
    setLocalOrder(next);
  }

  function handleDrop() {
    setDraggingId(null);
    setDragOverId(null);
    if (localOrder.length > 0) reorderMutation.mutate(localOrder);
  }

  function handleDragEnd() {
    // Fired if dropped outside a valid target — reset without saving
    setDraggingId(null);
    setDragOverId(null);
  }

  // ── Services state ──────────────────────────────────────────────────────────
  const [showSvcForm, setShowSvcForm] = useState(false);
  const [editingSvc, setEditingSvc] = useState<Service | null>(null);

  const deleteSvcMutation = useMutation({
    mutationFn: (id: string) => deleteService({ data: { id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["myServices"] }),
  });

  const toggleSvcMutation = useMutation({
    mutationFn: (svc: Service) =>
      updateService({
        data: {
          id: svc.id,
          nome: svc.nome,
          descricao: svc.descricao ?? undefined,
          preco: Number(svc.preco),
          duracaoMinutos: svc.duracaoMinutos,
          modalidade: svc.modalidade as "presencial" | "online" | "ambos",
          ativo: !svc.ativo,
        },
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["myServices"] }),
  });

  // ── Preview data (real-time) ────────────────────────────────────────────────
  const colors = COLOR_MAP_PREVIEW[corPrimaria] ?? COLOR_MAP_PREVIEW.teal;
  const destaqueColors = COLOR_MAP_PREVIEW[corDestaque ?? corPrimaria] ?? colors;
  const previewName = prof?.nomeCompleto ?? "";
  const previewSpecialty = prof?.especialidade ?? "";
  const previewInitials = previewName.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  function renderPreviewHeadline() {
    if (!headline) return null;
    if (!headlineDestaque) return <span>{headline}</span>;
    const idx = headline.toLowerCase().indexOf(headlineDestaque.toLowerCase());
    if (idx === -1) return <span>{headline}</span>;
    return (
      <>
        {headline.slice(0, idx)}
        <span className={destaqueColors.text}>{headline.slice(idx, idx + headlineDestaque.length)}</span>
        {headline.slice(idx + headlineDestaque.length)}
      </>
    );
  }

  const publicUrl = prof?.slug ? `/${prof.slug}` : null;

  if (profLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Página Pública</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Personalize o que seus pacientes veem ao acessar seu link
            </p>
          </div>
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ExternalLink className="size-4" />
              Ver página
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">

          {/* ── LEFT: Editor ──────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Section: Foto & Identidade */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-6">Foto & Identidade</h2>

              {/* Photo upload */}
              <div className="flex justify-center mb-6">
                <PhotoUpload
                  currentUrl={fotoUrl || null}
                  name={previewName}
                  onUploaded={(url) => setFotoUrl(url)}
                  onRemove={() => setFotoUrl("")}
                />
              </div>

              <div className="space-y-4">
                {/* Headline */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Frase de impacto
                  </label>
                  <input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    maxLength={160}
                    placeholder="Ex: Cuidando da sua saúde com Cardiologia."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  />
                  <p className="text-xs text-slate-400 mt-1">{headline.length}/160 caracteres</p>
                </div>

                {/* Headline highlight */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Palavra destacada{" "}
                    <span className="text-xs font-normal text-slate-400">(aparece colorida)</span>
                  </label>
                  <input
                    value={headlineDestaque}
                    onChange={(e) => setHeadlineDestaque(e.target.value)}
                    maxLength={60}
                    placeholder="Ex: Cardiologia"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Apresentação curta sobre você e seu atendimento…"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition resize-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">{bio.length}/500 caracteres</p>
                </div>

                {/* Color pickers */}
                <div className="space-y-4">
                  <ColorPicker
                    label="Cor tema"
                    description="avatar, cards, botões"
                    value={corPrimaria}
                    onChange={setCorPrimaria}
                  />
                  <ColorPicker
                    label="Cor da palavra destacada"
                    description="a palavra colorida na frase de impacto"
                    value={corDestaque ?? corPrimaria}
                    onChange={(k) => setCorDestaque(k === corPrimaria ? null : k)}
                    showSameAsTheme={corDestaque !== null}
                    onSameAsTheme={() => setCorDestaque(null)}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={() => identityMutation.mutate()}
                  disabled={identityMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                >
                  {identityMutation.isPending ? "Salvando..." : "Salvar identidade"}
                </button>
                {identitySaved && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                    <Check className="size-4" /> Salvo!
                  </span>
                )}
                {identityMutation.error && (
                  <span className="text-sm text-rose-500">
                    {identityMutation.error instanceof Error
                      ? identityMutation.error.message
                      : "Erro ao salvar"}
                  </span>
                )}
              </div>
            </section>

            {/* Section: Cards */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Cards</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Aparecem em grade 2 colunas abaixo do seu perfil
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingCard(null);
                    setShowCardForm(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors"
                >
                  <Plus className="size-4" /> Adicionar card
                </button>
              </div>

              {cardsLoading ? (
                <p className="text-sm text-slate-400 py-4 text-center">Carregando cards…</p>
              ) : cards.length === 0 && !showCardForm ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-400">Nenhum card adicionado ainda.</p>
                  <button
                    onClick={() => setShowCardForm(true)}
                    className="mt-3 text-sm text-teal-600 hover:underline font-medium"
                  >
                    + Adicionar o primeiro card
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedCards.map((card) => (
                    <CardRow
                      key={card.id}
                      card={card}
                      isDragging={draggingId === card.id}
                      isDragOver={dragOverId === card.id}
                      onEdit={() => {
                        setEditingCard(card);
                        setShowCardForm(true);
                      }}
                      onDelete={() => deleteMutation.mutate(card.id)}
                      deleting={deleteMutation.isPending}
                      onDragStart={() => handleDragStart(card.id)}
                      onDragOver={() => handleDragOver(card.id)}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              )}

              {showCardForm && (
                <CardForm
                  initial={editingCard}
                  nextOrdem={cards.length}
                  onSave={() => {
                    void qc.invalidateQueries({ queryKey: ["myCards"] });
                    setShowCardForm(false);
                    setEditingCard(null);
                  }}
                  onCancel={() => {
                    setShowCardForm(false);
                    setEditingCard(null);
                  }}
                />
              )}
            </section>

            {/* Section: Especialidades / Serviços */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Especialidades &amp; Serviços</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cada serviço vira uma opção de agendamento para o paciente
                  </p>
                </div>
                <button
                  onClick={() => { setEditingSvc(null); setShowSvcForm(true); }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors"
                >
                  <Plus className="size-4" /> Adicionar
                </button>
              </div>

              <div className="mt-4">
                {svcsLoading ? (
                  <p className="text-sm text-slate-400 py-4 text-center">Carregando…</p>
                ) : svcs.length === 0 && !showSvcForm ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                    <Stethoscope className="size-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Nenhum serviço adicionado ainda.</p>
                    <button
                      onClick={() => setShowSvcForm(true)}
                      className="mt-3 text-sm text-teal-600 hover:underline font-medium"
                    >
                      + Adicionar o primeiro serviço
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {svcs.map((svc) => (
                      <ServiceRow
                        key={svc.id}
                        svc={svc}
                        onEdit={() => { setEditingSvc(svc); setShowSvcForm(true); }}
                        onDelete={() => deleteSvcMutation.mutate(svc.id)}
                        onToggle={() => toggleSvcMutation.mutate(svc)}
                        deleting={deleteSvcMutation.isPending}
                      />
                    ))}
                  </div>
                )}

                {showSvcForm && (
                  <ServiceForm
                    initial={editingSvc}
                    onSave={() => {
                      void qc.invalidateQueries({ queryKey: ["myServices"] });
                      setShowSvcForm(false);
                      setEditingSvc(null);
                    }}
                    onCancel={() => { setShowSvcForm(false); setEditingSvc(null); }}
                  />
                )}
              </div>
            </section>
          </div>

          {/* ── RIGHT: Phone mockup preview ──────────────────────────────── */}
          <div className="xl:sticky xl:top-8">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Preview ao vivo
            </p>

            {/* Phone frame */}
            <div className="relative mx-auto w-[280px]">
              {/* Phone shell */}
              <div className="relative rounded-[2.5rem] border-[10px] border-slate-800 bg-slate-800 shadow-2xl overflow-hidden">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-800 rounded-b-2xl z-10" />

                {/* Screen — fixed height, scrollable */}
                <div className="relative h-[540px] overflow-hidden">
                  <div className="absolute inset-0 overflow-y-auto bg-slate-50 pt-6 pb-6 px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

                    {/* Profile card */}
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 mb-3 text-center">
                      <div className="mx-auto mb-3">
                        {fotoUrl ? (
                          <img src={fotoUrl} alt={previewName} className="mx-auto size-16 rounded-full object-cover ring-2 ring-white shadow" />
                        ) : (
                          <div className={`mx-auto size-16 rounded-full bg-gradient-to-br ${colors.gradient} ring-2 ring-white shadow grid place-items-center`}>
                            <span className="text-lg font-bold text-white">{previewInitials}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-900">{previewName || "Seu nome"}</p>
                      <p className={`text-[11px] ${colors.text} mt-0.5`}>{previewSpecialty || "Especialidade"}</p>
                      {headline && (
                        <p className="mt-3 text-sm font-extrabold text-slate-900 leading-tight">
                          {renderPreviewHeadline()}
                        </p>
                      )}
                      {bio && (
                        <p className="mt-2 text-[11px] text-slate-500 leading-snug line-clamp-2">{bio}</p>
                      )}
                    </div>

                    {/* Cards grid */}
                    {sortedCards.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {sortedCards.slice(0, 6).map((card) => {
                          const Icon = CARD_ICON_MAP[card.tipo as CardType] ?? Sparkles;
                          return (
                            <div key={card.id} className="rounded-xl border border-slate-200 bg-white p-2">
                              <div className="flex items-start gap-1.5">
                                <div className={`grid size-7 place-items-center rounded-lg ${colors.soft} ${colors.text} shrink-0`}>
                                  <Icon className="size-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[9px] text-slate-500 leading-tight truncate">{card.titulo}</p>
                                  {card.subtitulo && (
                                    <p className="text-[10px] font-bold text-slate-900 truncate">{card.subtitulo}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Services section */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`size-5 rounded-full ${colors.badge} flex items-center justify-center shrink-0`}>
                          <span className="text-[8px] font-black text-white">01</span>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-700">Escolha a especialidade</p>
                      </div>
                      {svcs.filter((s) => s.ativo).length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 text-center opacity-50">
                          <p className="text-[9px] text-slate-400">Seus serviços aparecerão aqui</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {svcs.filter((s) => s.ativo).map((svc) => (
                            <div key={svc.id} className="rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
                              <p className="text-[10px] font-bold text-slate-900 leading-tight truncate">{svc.nome}</p>
                              {svc.descricao && (
                                <p className={`text-[9px] mt-0.5 truncate ${colors.text}`}>{svc.descricao}</p>
                              )}
                              <div className="mt-1.5 border-t border-slate-100 pt-1 flex items-center justify-between">
                                <span className="text-[8px] text-slate-400">{svc.duracaoMinutos} min</span>
                                <span className="text-[10px] font-black text-slate-900">
                                  {Number(svc.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Gradient fade at bottom — scroll hint */}
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-slate-800/60 to-transparent flex items-end justify-center pb-2">
                    <div className="flex items-center gap-1 text-white/70">
                      <ChevronDown className="size-3 animate-bounce" />
                      <span className="text-[9px] font-medium">role para ver mais</span>
                    </div>
                  </div>
                </div>

                {/* Home indicator */}
                <div className="bg-slate-800 flex justify-center py-2">
                  <div className="w-16 h-1 bg-white/30 rounded-full" />
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-slate-400 mt-3">
              Preview em tempo real · salve para publicar
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ─── Service Row ─────────────────────────────────────────────────────────────

const MODALIDADE_LABEL: Record<string, string> = {
  presencial: "Presencial",
  online: "Online",
  ambos: "Presencial + Online",
};

const MODALIDADE_ICON: Record<string, React.ElementType> = {
  presencial: MapPinned,
  online: Monitor,
  ambos: Stethoscope,
};

function ServiceRow({
  svc,
  onEdit,
  onDelete,
  onToggle,
  deleting,
}: {
  svc: Service;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  deleting: boolean;
}) {
  const MIcon = MODALIDADE_ICON[svc.modalidade] ?? Stethoscope;
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${svc.ativo ? "border-slate-100 bg-slate-50" : "border-slate-100 bg-white opacity-60"}`}>
      <div className="size-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
        <MIcon className="size-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{svc.nome}</p>
        <p className="text-xs text-slate-400 truncate">
          {Number(svc.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          {" · "}{svc.duracaoMinutos} min
          {" · "}{MODALIDADE_LABEL[svc.modalidade]}
        </p>
      </div>

      {/* Active toggle */}
      <button
        onClick={onToggle}
        title={svc.ativo ? "Desativar" : "Ativar"}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${svc.ativo ? "bg-teal-500" : "bg-slate-200"}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${svc.ativo ? "translate-x-4" : "translate-x-1"}`} />
      </button>

      <div className="flex gap-1 shrink-0">
        <button onClick={onEdit} className="size-8 rounded-lg hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-500 hover:text-slate-700" title="Editar">
          <Pencil className="size-3.5" />
        </button>
        <button onClick={onDelete} disabled={deleting} className="size-8 rounded-lg hover:bg-rose-50 flex items-center justify-center transition-colors text-slate-400 hover:text-rose-500" title="Excluir">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Service Form ─────────────────────────────────────────────────────────────

function ServiceForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Service | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [preco, setPreco] = useState(initial ? String(Number(initial.preco).toFixed(2)) : "");
  const [duracao, setDuracao] = useState(initial?.duracaoMinutos ?? 30);
  const [modalidade, setModalidade] = useState<"presencial" | "online" | "ambos">(
    (initial?.modalidade as "presencial" | "online" | "ambos") ?? "presencial",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!nome.trim()) { setError("Nome obrigatório"); return; }
    const precoNum = parseFloat(preco.replace(",", "."));
    if (isNaN(precoNum) || precoNum < 0) { setError("Preço inválido"); return; }
    setSaving(true);
    setError(null);
    try {
      if (initial) {
        await updateService({
          data: { id: initial.id, nome, descricao: descricao || undefined, preco: precoNum, duracaoMinutos: duracao, modalidade, ativo: initial.ativo },
        });
      } else {
        await createService({
          data: { nome, descricao: descricao || undefined, preco: precoNum, duracaoMinutos: duracao, modalidade },
        });
      }
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border-2 border-teal-200 bg-teal-50/50 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">{initial ? "Editar serviço" : "Novo serviço"}</h3>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Nome do serviço *</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={255}
          placeholder="Ex: Consulta, Retorno, Avaliação…"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none" />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Descrição <span className="font-normal text-slate-400">(opcional)</span></label>
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={200}
          placeholder="Ex: Avaliação inicial com anamnese completa"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Preço (R$) *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
            <input type="number" min="0" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)}
              placeholder="250,00"
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Duração (min) *</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input type="number" min="5" max="480" step="5" value={duracao} onChange={(e) => setDuracao(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2.5 text-sm text-slate-900 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Modalidade</label>
        <div className="flex gap-2">
          {(["presencial", "online", "ambos"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setModalidade(m)}
              className={`flex-1 rounded-xl border py-2 text-xs font-medium transition-colors ${modalidade === m ? "border-teal-400 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
              {m === "presencial" ? "Presencial" : m === "online" ? "Online" : "Ambos"}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-rose-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60">
          <Check className="size-3.5" />{saving ? "Salvando…" : "Salvar serviço"}
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 transition-colors">
          <X className="size-3.5" />Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Color Picker ────────────────────────────────────────────────────────────

function ColorPicker({
  label,
  description,
  value,
  onChange,
  showSameAsTheme,
  onSameAsTheme,
}: {
  label: string;
  description: string;
  value: ColorKey;
  onChange: (k: ColorKey) => void;
  showSameAsTheme?: boolean;
  onSameAsTheme?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <span className="ml-1.5 text-xs text-slate-400">({description})</span>
        </div>
        {showSameAsTheme && onSameAsTheme && (
          <button
            type="button"
            onClick={onSameAsTheme}
            className="text-xs text-teal-600 hover:underline font-medium"
          >
            Usar cor do tema
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {ALL_COLORS.map((c) => {
          const active = value === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onChange(c.key as ColorKey)}
              title={c.label}
              className="size-7 rounded-full transition-all hover:scale-110 focus:outline-none"
              style={{
                background: c.hex,
                outline: active ? `3px solid ${c.hex}` : "none",
                outlineOffset: "2px",
                opacity: active ? 1 : 0.65,
                transform: active ? "scale(1.2)" : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Card Row ─────────────────────────────────────────────────────────────────

function CardRow({
  card,
  isDragging,
  isDragOver,
  onEdit,
  onDelete,
  deleting,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  card: ProfessionalCard;
  isDragging: boolean;
  isDragOver: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const Icon = CARD_ICON_MAP[card.tipo as CardType] ?? Sparkles;
  const typeLabel = CARD_TYPES.find((t) => t.value === card.tipo)?.label ?? card.tipo;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all select-none ${
        isDragging
          ? "opacity-40 border-slate-200 bg-slate-50"
          : isDragOver
            ? "border-teal-400 bg-teal-50 shadow-sm"
            : "border-slate-100 bg-slate-50 hover:border-slate-200"
      }`}
    >
      <GripVertical className="size-4 text-slate-400 shrink-0 cursor-grab active:cursor-grabbing" />
      <div className="size-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
        <Icon className="size-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{card.titulo}</p>
        <p className="text-xs text-slate-400 truncate">
          {typeLabel}{card.subtitulo ? ` · ${card.subtitulo}` : ""}
        </p>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="size-8 rounded-lg hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-500 hover:text-slate-700"
          title="Editar"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="size-8 rounded-lg hover:bg-rose-50 flex items-center justify-center transition-colors text-slate-400 hover:text-rose-500"
          title="Excluir"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Card Form ────────────────────────────────────────────────────────────────

function CardForm({
  initial,
  nextOrdem,
  onSave,
  onCancel,
}: {
  initial: ProfessionalCard | null;
  nextOrdem: number;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [tipo, setTipo] = useState<CardType>((initial?.tipo as CardType) ?? "qualificacao");
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [subtitulo, setSubtitulo] = useState(initial?.subtitulo ?? "");
  const [valor, setValor] = useState(initial?.valor ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsValor = ["whatsapp", "instagram", "localizacao", "telefone", "email"].includes(tipo);
  const valorLabel: Record<string, string> = {
    whatsapp: "Número WhatsApp (+5511...)",
    instagram: "Usuário ou URL do Instagram",
    localizacao: "Link do Google Maps",
    telefone: "Número de telefone",
    email: "Endereço de e-mail",
  };

  async function handleSave() {
    if (!titulo.trim()) { setError("Título obrigatório"); return; }
    setSaving(true);
    setError(null);
    try {
      if (initial) {
        await updateCard({ data: { id: initial.id, tipo, titulo, subtitulo: subtitulo || undefined, valor: valor || undefined, ordem: initial.ordem } });
      } else {
        await createCard({ data: { tipo, titulo, subtitulo: subtitulo || undefined, valor: valor || undefined, ordem: nextOrdem } });
      }
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border-2 border-teal-200 bg-teal-50/50 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">
        {initial ? "Editar card" : "Novo card"}
      </h3>

      {/* Type selector */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo</label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as CardType)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
        >
          {CARD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Título</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={80}
          placeholder="Ex: Especialização:"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Subtítulo</label>
        <input
          value={subtitulo}
          onChange={(e) => setSubtitulo(e.target.value)}
          maxLength={120}
          placeholder="Ex: Cardiologia Intervencionista"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
        />
      </div>

      {/* Value (conditional) */}
      {needsValor && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            {valorLabel[tipo] ?? "Valor / Link"}
          </label>
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={valorLabel[tipo]}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />
        </div>
      )}

      {error && <p className="text-xs text-rose-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
        >
          <Check className="size-3.5" />
          {saving ? "Salvando…" : "Salvar card"}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 transition-colors"
        >
          <X className="size-3.5" />
          Cancelar
        </button>
      </div>
    </div>
  );
}
