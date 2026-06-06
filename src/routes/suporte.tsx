import { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/tanstack-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LifeBuoy,
  BookOpen,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Settings,
  CalendarDays,
  LayoutDashboard,
  Stethoscope,
  Clock,
  Share2,
  Plus,
  Send,
  Ticket,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { PublicLinkBox } from "../components/PublicLinkBox";
import { fetchCurrentProfessional } from "../lib/auth";
import {
  fetchSupportConfig,
  fetchFaqs,
  fetchMyTickets,
  fetchTicketMessages,
  createTicket,
  sendTicketMessage,
  type SupportTicket,
  type TicketMessage,
  type TicketStatus,
} from "../lib/support";

export const Route = createFileRoute("/suporte")({
  head: () => ({ meta: [{ title: "Suporte — CuidandoVC" }] }),
  loader: () =>
    Promise.all([fetchCurrentProfessional(), fetchSupportConfig()]).then(([prof, cfg]) => ({
      prof,
      cfg,
    })),
  component: SuportePage,
});

// ─── Tutorial phases ──────────────────────────────────────────────────────────

const TUTORIAL_PHASES = [
  {
    id: "perfil",
    num: "01",
    title: "Configure seu Perfil",
    desc: "Preencha nome, especialidade, CRM, foto e bio. Defina também o seu slug — ele vira o endereço público da sua página.",
    tip: "Configurações → Aba Perfil",
    badge: "bg-teal-100 text-teal-700",
    dot: "bg-teal-500",
  },
  {
    id: "servicos",
    num: "02",
    title: "Cadastre seus Serviços",
    desc: "Adicione as consultas que você oferece com nome, preço e duração. Você pode ativar ou desativar serviços a qualquer momento.",
    tip: "Configurações → Aba Perfil → Serviços",
    badge: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500",
  },
  {
    id: "agenda",
    num: "03",
    title: "Configure sua Disponibilidade",
    desc: "Na Agenda, defina os dias da semana e horários em que você atende. Os pacientes só vão enxergar os slots que você liberar.",
    tip: "Menu → Agenda → Disponibilidade",
    badge: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500",
  },
  {
    id: "link",
    num: "04",
    title: "Compartilhe seu Link",
    desc: "Coloque seu link público na bio do Instagram ou envie pelo WhatsApp. Os pacientes acessam, escolhem serviço, horário e pagam.",
    tip: "Configurações → Ver perfil público",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  {
    id: "agendamento",
    num: "05",
    title: "Acompanhe os Agendamentos",
    desc: "No Dashboard você vê os agendamentos do dia e as métricas do mês. Na Agenda você gerencia, confirma e cancela consultas.",
    tip: "Menu → Dashboard / Agenda",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
  },
] as const;

// Fallback exibido quando o admin ainda não cadastrou nenhuma FAQ.
const DEFAULT_FAQ = [
  {
    q: "Como o paciente paga a consulta?",
    a: "O paciente paga diretamente pela sua página pública via Mercado Pago. O valor cai na sua conta automaticamente, com desconto da taxa da plataforma.",
  },
  {
    q: "Preciso criar uma conta separada para o Mercado Pago?",
    a: "Sim. Na aba Financeiro, clique em 'Conectar Mercado Pago' e siga o onboarding. Você só precisa fazer isso uma vez.",
  },
  {
    q: "Posso ter mais de um profissional na mesma conta?",
    a: "Sim, com o plano Clínica. Cada profissional ganha página, agenda e serviços independentes.",
  },
  {
    q: "Como o paciente recebe a confirmação?",
    a: "Assim que o pagamento é confirmado, o paciente recebe um e-mail com os dados da consulta.",
  },
  {
    q: "Posso bloquear dias de folga?",
    a: "Sim. Na Agenda, clique em 'Modo Folga' para bloquear dias específicos.",
  },
  {
    q: "O CuidandoVC funciona no celular?",
    a: "Sim. Tanto o painel do médico quanto a página do paciente são otimizados para mobile.",
  },
];

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CFG: Record<TicketStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> =
  {
    aberto: { label: "Aberto", cls: "bg-blue-50 text-blue-700 ring-blue-200", icon: AlertCircle },
    em_andamento: {
      label: "Em andamento",
      cls: "bg-amber-50 text-amber-700 ring-amber-200",
      icon: Clock,
    },
    resolvido: {
      label: "Resolvido",
      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      icon: CheckCircle2,
    },
    fechado: { label: "Fechado", cls: "bg-slate-100 text-slate-600 ring-slate-200", icon: XCircle },
  };

const CATEGORIA_LABEL: Record<string, string> = {
  financeiro: "💳 Financeiro",
  tecnico: "🔧 Técnico",
  conta: "👤 Conta",
  outro: "💬 Outro",
};

function formatRelative(d: Date | string) {
  const date = d instanceof Date ? d : new Date(String(d));
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}m atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SuportePage() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <SuporteContent />
      </SignedIn>
    </>
  );
}

type MainTab = "ajuda" | "tickets";

function SuporteContent() {
  const { prof: professional } = Route.useLoaderData() as {
    prof: Awaited<ReturnType<typeof fetchCurrentProfessional>>;
    cfg: Awaited<ReturnType<typeof fetchSupportConfig>>;
  };

  const [tab, setTab] = useState<MainTab>("ajuda");

  const slug = professional?.slug ?? "";
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // FAQs gerenciadas pelo admin (fallback para a lista padrão se vazio)
  const { data: dbFaqs = [] } = useQuery({
    queryKey: ["faqs"],
    queryFn: () => fetchFaqs(),
    staleTime: 60_000,
  });
  const faqList =
    dbFaqs.length > 0 ? dbFaqs.map((f) => ({ q: f.pergunta, a: f.resposta })) : DEFAULT_FAQ;

  return (
    <DashboardLayout>
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="px-6 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-100 grid place-items-center">
            <LifeBuoy className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Suporte</h1>
            <p className="text-xs text-slate-500">Tutorial, FAQ, contato e seus chamados</p>
          </div>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="px-6 pt-5">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          {(
            [
              { id: "ajuda" as const, label: "Ajuda & Contato", icon: BookOpen },
              { id: "tickets" as const, label: "Meus Chamados", icon: Ticket },
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
      </div>

      <div className="p-6 max-w-3xl space-y-6">
        {tab === "ajuda" && (
          <>
            {/* Seu link público */}
            <PublicLinkBox slug={slug} />

            {/* Tutorial */}
            <PhoneTutorial />

            {/* FAQ */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-4">
                <LayoutDashboard className="h-4 w-4 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-800">Perguntas frequentes</h3>
              </div>
              <div className="space-y-1">
                {faqList.map((item, i) => (
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
                      <div className="px-4 pb-3 pt-2 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/60">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Contato — chat interno de suporte */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-1">
                <LifeBuoy className="h-4 w-4 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-800">Fale com a equipe</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Abra um chamado e converse diretamente com a nossa equipe de suporte pelo chat.
              </p>
              <button
                onClick={() => setTab("tickets")}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition"
              >
                <Ticket className="h-4 w-4" />
                Abrir chamado de suporte
              </button>
            </div>
          </>
        )}

        {tab === "tickets" && <TicketsSection />}
      </div>
    </DashboardLayout>
  );
}

// ─── TicketsSection ───────────────────────────────────────────────────────────

function TicketsSection() {
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "new" | "chat">("list");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["myTickets"],
    queryFn: () => fetchMyTickets(),
    staleTime: 30_000,
  });

  const handleOpenTicket = (id: string) => {
    setActiveTicketId(id);
    setView("chat");
  };

  const handleTicketCreated = (ticketId: string) => {
    void qc.invalidateQueries({ queryKey: ["myTickets"] });
    setActiveTicketId(ticketId);
    setView("chat");
  };

  if (view === "new") {
    return <NewTicketForm onBack={() => setView("list")} onCreated={handleTicketCreated} />;
  }

  if (view === "chat" && activeTicketId) {
    const ticket = tickets.find((t) => t.id === activeTicketId);
    return (
      <TicketChat
        ticketId={activeTicketId}
        ticket={ticket ?? null}
        onBack={() => setView("list")}
      />
    );
  }

  // ── Lista de tickets ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Meus chamados</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Histórico de suporte com a equipe CuidandoVC
          </p>
        </div>
        <button
          onClick={() => setView("new")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo chamado
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <Ticket className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Nenhum chamado aberto</p>
          <p className="text-xs text-slate-400 mt-1">
            Clique em "Novo chamado" para falar com o suporte
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => {
            const cfg = STATUS_CFG[t.status];
            const StatusIcon = cfg.icon;
            return (
              <button
                key={t.id}
                onClick={() => handleOpenTicket(t.id)}
                className="w-full text-left rounded-2xl border border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/30 p-4 transition group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">{t.titulo}</p>
                      {!t.lidoAdmin && t.status !== "fechado" && (
                        <span
                          className="shrink-0 h-2 w-2 rounded-full bg-teal-500"
                          title="Resposta pendente"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${cfg.cls}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                      {t.categoria && (
                        <span className="text-[10px] text-slate-400">
                          {CATEGORIA_LABEL[t.categoria] ?? t.categoria}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {formatRelative(t.criadoEm)}
                      </span>
                    </div>
                    {t.lastMessage && (
                      <p className="text-xs text-slate-500 mt-1.5 truncate">{t.lastMessage}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-teal-400 shrink-0 mt-1 transition" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── NewTicketForm ────────────────────────────────────────────────────────────

function NewTicketForm({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (id: string) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<"financeiro" | "tecnico" | "conta" | "outro">("outro");
  const [prioridade, setPrioridade] = useState<"baixa" | "normal" | "alta" | "urgente">("normal");
  const [mensagem, setMensagem] = useState("");

  const mutation = useMutation({
    mutationFn: () => createTicket({ data: { titulo, categoria, prioridade, mensagem } }),
    onSuccess: (result) => onCreated(result.ticketId),
  });

  const canSubmit = titulo.length >= 3 && mensagem.length >= 10 && !mutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-500"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Novo chamado</h2>
          <p className="text-xs text-slate-500">Descreva seu problema e entraremos em contato</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        {/* Título */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Assunto *</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Problema ao conectar Mercado Pago"
            maxLength={255}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />
        </div>

        {/* Categoria + Prioridade */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as typeof categoria)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none bg-white"
            >
              <option value="financeiro">💳 Financeiro</option>
              <option value="tecnico">🔧 Técnico</option>
              <option value="conta">👤 Conta</option>
              <option value="outro">💬 Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Prioridade</label>
            <select
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as typeof prioridade)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none bg-white"
            >
              <option value="baixa">🟢 Baixa</option>
              <option value="normal">🔵 Normal</option>
              <option value="alta">🟡 Alta</option>
              <option value="urgente">🔴 Urgente</option>
            </select>
          </div>
        </div>

        {/* Mensagem */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Descrição *{" "}
            <span className="text-slate-400 font-normal">— descreva o problema com detalhes</span>
          </label>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Descreva o que está acontecendo, quando ocorreu e o que você já tentou..."
            rows={5}
            maxLength={5000}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none resize-none"
          />
          <p className="text-[10px] text-slate-400 text-right mt-0.5">{mensagem.length}/5000</p>
        </div>

        {mutation.isError && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            Erro ao criar chamado. Tente novamente.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
          >
            Cancelar
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 px-5 py-2 text-sm font-semibold text-white transition"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar chamado
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TicketChat ───────────────────────────────────────────────────────────────

function TicketChat({
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
    refetchInterval: 15_000, // poll a cada 15s
  });

  const sendMutation = useMutation({
    mutationFn: () => sendTicketMessage({ data: { ticketId, conteudo: text } }),
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: ["ticketMessages", ticketId] });
      void qc.invalidateQueries({ queryKey: ["myTickets"] });
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const cfg = ticket ? STATUS_CFG[ticket.status] : null;
  const StatusIcon = cfg?.icon ?? AlertCircle;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-500 shrink-0 mt-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {ticket?.titulo ?? "Chamado"}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {cfg && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${cfg.cls}`}
              >
                <StatusIcon className="h-3 w-3" />
                {cfg.label}
              </span>
            )}
            {ticket?.categoria && (
              <span className="text-[10px] text-slate-400">
                {CATEGORIA_LABEL[ticket.categoria] ?? ticket.categoria}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
        <div className="flex-1 p-4 space-y-3 min-h-[300px] max-h-[480px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Nenhuma mensagem ainda</p>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {ticket?.status !== "fechado" && ticket?.status !== "resolvido" ? (
          <div className="border-t border-slate-100 p-3 flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (text.trim()) sendMutation.mutate();
                }
              }}
              placeholder="Digite sua mensagem... (Enter para enviar)"
              rows={2}
              maxLength={5000}
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none resize-none"
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
          <div className="border-t border-slate-100 p-3 text-center text-xs text-slate-400">
            Este chamado está {ticket.status}. Abra um novo chamado se precisar de mais ajuda.
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: TicketMessage }) {
  const isAdmin = msg.autorRole === "admin";
  return (
    <div className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isAdmin
            ? "bg-slate-100 text-slate-800 rounded-tl-sm"
            : "bg-teal-600 text-white rounded-tr-sm"
        }`}
      >
        {isAdmin && (
          <p className="text-[10px] font-semibold text-teal-700 mb-1">Equipe CuidandoVC</p>
        )}
        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.conteudo}</p>
        <p
          className={`text-[10px] mt-1 ${isAdmin ? "text-slate-400" : "text-teal-200"} text-right`}
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

// ─── Animated phone tutorial (inalterado) ────────────────────────────────────

function PhoneTutorial() {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(true);
  const phase = TUTORIAL_PHASES[idx];

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % TUTORIAL_PHASES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 180);
    return () => clearTimeout(t);
  }, [idx]);

  const goPrev = () => {
    setPlaying(false);
    setIdx((i) => (i - 1 + TUTORIAL_PHASES.length) % TUTORIAL_PHASES.length);
  };
  const goNext = () => {
    setPlaying(false);
    setIdx((i) => (i + 1) % TUTORIAL_PHASES.length);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-5">
        <BookOpen className="h-4 w-4 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-800">Como usar o CuidandoVC</h3>
      </div>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-7">
        <div className="shrink-0 mx-auto sm:mx-0">
          <div className="relative w-[220px]">
            <div className="relative rounded-[2rem] border-[8px] border-slate-800 bg-slate-800 shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-5 bg-slate-800 rounded-b-2xl z-10" />
              <div className="relative h-[400px] overflow-hidden">
                <div
                  className="absolute inset-0 overflow-y-auto bg-slate-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-6 transition-opacity duration-200"
                  style={{ opacity: visible ? 1 : 0 }}
                >
                  {phase.id === "perfil" && <PerfilPhoneScreen />}
                  {phase.id === "servicos" && <ServicosPhoneScreen />}
                  {phase.id === "agenda" && <AgendaPhoneScreen />}
                  {phase.id === "link" && <LinkPhoneScreen />}
                  {phase.id === "agendamento" && <AgendamentoPhoneScreen />}
                </div>
              </div>
              <div className="bg-slate-800 flex justify-center py-1.5">
                <div className="w-12 h-0.5 bg-white/30 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold mb-3 w-fit ${phase.badge}`}
          >
            {phase.num} / {TUTORIAL_PHASES.length}
          </div>
          <div className="transition-opacity duration-200" style={{ opacity: visible ? 1 : 0 }}>
            <h4 className="text-base font-bold text-slate-900 mb-2 leading-snug">{phase.title}</h4>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">{phase.desc}</p>
            <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
              {phase.tip}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-8">
            <button
              onClick={goPrev}
              className="size-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-500 transition shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 flex-1">
              {TUTORIAL_PHASES.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPlaying(false);
                    setIdx(i);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === idx ? `w-6 ${p.dot}` : "w-2 bg-slate-200 hover:bg-slate-300"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={goNext}
              className="size-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-500 transition shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="size-8 rounded-full bg-teal-600 hover:bg-teal-700 flex items-center justify-center text-white transition shrink-0"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Phone screens (inalterados) ─────────────────────────────────────────────

function PerfilPhoneScreen() {
  return (
    <div className="px-2.5 pb-4">
      <div className="flex items-center gap-1.5 mb-3 px-0.5">
        <Settings className="h-3 w-3 text-slate-400" />
        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
          Configurações · Perfil
        </span>
      </div>
      <div className="flex justify-center mb-3">
        <div className="size-14 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center shadow-md">
          <span className="text-sm font-black text-white">DR</span>
        </div>
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-[8px] text-slate-400 mb-0.5 font-medium">Nome completo</p>
          <div className="rounded-lg border border-teal-300 bg-white px-2 py-1.5 text-[9px] text-slate-800 font-semibold ring-2 ring-teal-100">
            Dr. João Silva
          </div>
        </div>
        <div>
          <p className="text-[8px] text-slate-400 mb-0.5 font-medium">Especialidade</p>
          <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] text-slate-600">
            Cardiologia
          </div>
        </div>
        <div>
          <p className="text-[8px] text-slate-400 mb-0.5 font-medium">Seu link (slug)</p>
          <div className="rounded-lg border border-slate-200 bg-teal-50 px-2 py-1.5 flex items-center gap-1.5">
            <LinkIcon className="h-2.5 w-2.5 text-teal-500 shrink-0" />
            <span className="text-[9px] text-teal-700 font-mono font-bold">dr-joao</span>
          </div>
        </div>
      </div>
      <button className="mt-3 w-full rounded-xl bg-teal-600 py-2 text-[9px] font-bold text-white">
        Salvar perfil ✓
      </button>
    </div>
  );
}

function ServicosPhoneScreen() {
  return (
    <div className="px-2.5 pb-4">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-1.5">
          <Stethoscope className="h-3 w-3 text-slate-400" />
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
            Serviços
          </span>
        </div>
        <div className="rounded-lg bg-teal-50 border border-teal-200 px-1.5 py-0.5 text-[8px] font-bold text-teal-700">
          + Novo
        </div>
      </div>
      {[
        { nome: "Consulta Inicial", preco: "R$ 300", min: "60 min" },
        { nome: "Retorno", preco: "R$ 150", min: "30 min" },
        { nome: "Avaliação Online", preco: "R$ 200", min: "45 min" },
      ].map((s, i) => (
        <div
          key={i}
          className="mb-2 rounded-xl border border-slate-100 bg-white px-2.5 py-2 flex items-center gap-2 shadow-sm"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-slate-900 truncate">{s.nome}</p>
            <p className="text-[8px] text-slate-400 mt-0.5">
              {s.preco} · {s.min}
            </p>
          </div>
          <div className="relative inline-flex h-3.5 w-6 items-center rounded-full bg-teal-500 shrink-0">
            <span className="inline-block h-2.5 w-2.5 translate-x-3 rounded-full bg-white shadow" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AgendaPhoneScreen() {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const active = [true, true, true, true, true, false, false];
  return (
    <div className="px-2.5 pb-4">
      <div className="flex items-center gap-1.5 mb-3 px-0.5">
        <CalendarDays className="h-3 w-3 text-slate-400" />
        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
          Disponibilidade
        </span>
      </div>
      <div className="mb-3">
        <p className="text-[8px] text-slate-400 mb-1.5 font-medium">Dias de atendimento</p>
        <div className="flex flex-wrap gap-1">
          {days.map((d, i) => (
            <div
              key={d}
              className={`rounded-lg px-1.5 py-1 text-[8px] font-bold ${active[i] ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-400"}`}
            >
              {d}
            </div>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <p className="text-[8px] text-slate-400 mb-1.5 font-medium">Horário de atendimento</p>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-teal-300 bg-white px-2.5 py-1.5 text-[9px] font-black text-slate-800 shadow-sm">
            08:00
          </div>
          <div className="flex-1 h-0.5 bg-teal-200 rounded" />
          <div className="rounded-lg border border-teal-300 bg-white px-2.5 py-1.5 text-[9px] font-black text-slate-800 shadow-sm">
            18:00
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-sky-50 border border-sky-100 px-2.5 py-2 flex items-center gap-1.5 mb-3">
        <Clock className="h-2.5 w-2.5 text-sky-500 shrink-0" />
        <p className="text-[8px] text-sky-700 font-semibold">Intervalo: 30 min por consulta</p>
      </div>
      <button className="w-full rounded-xl bg-teal-600 py-2 text-[9px] font-bold text-white">
        Salvar disponibilidade
      </button>
    </div>
  );
}

function LinkPhoneScreen() {
  return (
    <div className="px-2.5 pb-4">
      <div className="flex items-center gap-1.5 mb-3 px-0.5">
        <Share2 className="h-3 w-3 text-slate-400" />
        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
          Link público
        </span>
      </div>
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-2.5 mb-3">
        <p className="text-[8px] text-teal-600 font-medium mb-1.5">Seu link de agendamento:</p>
        <div className="flex items-center gap-1.5">
          <code className="flex-1 text-[8px] font-mono text-teal-800 truncate font-bold">
            cuidandovc.com.br/dr-joao
          </code>
          <div className="shrink-0 rounded-md bg-teal-600 px-1.5 py-0.5 text-[8px] text-white font-bold">
            Copiar
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <p className="text-[7px] text-slate-400 font-semibold mb-2 uppercase tracking-wide">
          Exemplo: Bio do Instagram
        </p>
        <div className="flex items-center gap-1.5 mb-2">
          <div className="size-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-400 p-0.5 shrink-0">
            <div className="size-full rounded-full bg-white flex items-center justify-center">
              <span className="text-[7px] font-black text-pink-600">DR</span>
            </div>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-900">@drjoaosilva</p>
            <p className="text-[7px] text-slate-500">Cardiologista · São Paulo</p>
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5 flex items-center gap-1">
          <LinkIcon className="h-2.5 w-2.5 text-blue-500 shrink-0" />
          <span className="text-[8px] text-blue-600 font-semibold">cuidandovc.com.br/dr-joao</span>
        </div>
      </div>
    </div>
  );
}

function AgendamentoPhoneScreen() {
  return (
    <div className="px-2.5 pb-4">
      <div className="flex items-center gap-1.5 mb-3 px-0.5">
        <LayoutDashboard className="h-3 w-3 text-slate-400" />
        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
          Dashboard · Hoje
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <div className="rounded-xl bg-teal-50 border border-teal-100 p-2 text-center shadow-sm">
          <p className="text-xl font-black text-teal-700 leading-none">3</p>
          <p className="text-[7px] text-teal-600 mt-0.5">consultas hoje</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2 text-center shadow-sm">
          <p className="text-sm font-black text-slate-800 leading-none">R$750</p>
          <p className="text-[7px] text-slate-500 mt-0.5">este mês</p>
        </div>
      </div>
      <p className="text-[8px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
        Próximas consultas
      </p>
      {[
        { time: "14:00", service: "Consulta Inicial", patient: "Maria Rodrigues" },
        { time: "15:30", service: "Retorno", patient: "Carlos Souza" },
      ].map((a, i) => (
        <div
          key={i}
          className="mb-1.5 rounded-xl border border-slate-100 bg-white px-2 py-1.5 flex items-center gap-2 shadow-sm"
        >
          <div className="text-[9px] font-black text-teal-600 shrink-0 w-8 leading-none">
            {a.time}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-slate-900 truncate leading-none">{a.service}</p>
            <p className="text-[7px] text-slate-400 mt-0.5 truncate">{a.patient}</p>
          </div>
          <div className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
        </div>
      ))}
    </div>
  );
}
