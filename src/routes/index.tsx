import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Play,
  Check,
  X,
  Instagram,
  MousePointerClick,
  CalendarClock,
  CreditCard,
  CheckCircle2,
  CalendarCheck,
  Smartphone,
  Users,
  BarChart3,
  Bell,
  Star,
  Stethoscope,
  Sparkles,
} from "lucide-react";
import { fetchPublicProfile } from "../lib/subdomain";
import { ProfessionalPublicPage, ProfessionalNotFound } from "../components/ProfessionalPublicPage";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/")({
  loader: () => fetchPublicProfile(),
  head: () => ({
    meta: [
      { title: "CuidandoVC — O link na bio que cuida de tudo para você" },
      {
        name: "description",
        content:
          "Transforme seu link na bio em uma central de agendamentos. Seus pacientes escolhem o serviço, agendam o horário e pagam online em poucos cliques.",
      },
      { property: "og:title", content: "CuidandoVC — O link na bio que cuida de tudo" },
      {
        property: "og:description",
        content:
          "Agendamento, pagamento e agenda inteligente em um único link para colocar na bio do Instagram.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  const ctx = Route.useLoaderData();
  if (ctx.mode === "not_found") return <ProfessionalNotFound />;
  if (ctx.mode === "professional")
    return <ProfessionalPublicPage professional={ctx.professional} />;
  return <LandingPage />;
}

// ─── Landing ──────────────────────────────────────────────────────────────────

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Problema />
      <Solucao />
      <HowItWorks />
      <Features />
      <ForWhom />
      <Demonstracao />
      <Comparacao />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/logo-icon.png"
            alt="CuidandoVC"
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="text-lg font-semibold tracking-tight">CuidandoVC</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#como-funciona" className="hover:text-foreground transition-colors">
            Como funciona
          </a>
          <a href="#recursos" className="hover:text-foreground transition-colors">
            Recursos
          </a>
          <a href="#demonstracao" className="hover:text-foreground transition-colors">
            Demonstração
          </a>
          <a href="#faq" className="hover:text-foreground transition-colors">
            Perguntas
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/sign-in"
            className="hidden text-sm text-muted-foreground hover:text-foreground transition-colors sm:block"
          >
            Entrar
          </Link>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
          >
            Criar minha página <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand/5 via-background to-background" />
      <div
        className="absolute left-1/2 top-0 -z-10 h-[600px] w-[1200px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--brand), transparent)" }}
      />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-16 md:pt-24 lg:grid-cols-2">
        {/* Texto */}
        <div className="text-center lg:text-left">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground lg:mx-0">
            <Instagram className="h-3.5 w-3.5 text-brand" />
            Feito para o seu link na bio
          </div>

          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl">
            O link na bio que{" "}
            <span className="bg-gradient-to-r from-brand to-brand/60 bg-clip-text text-transparent">
              cuida de tudo
            </span>{" "}
            para você.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-muted-foreground lg:mx-0">
            Transforme seu link na bio em uma central de agendamentos completa. Seus pacientes
            escolhem o serviço, agendam o horário e pagam online em poucos cliques.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Link
              to="/onboarding"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-sm font-medium text-brand-foreground shadow-lg shadow-brand/20 transition hover:shadow-xl hover:shadow-brand/30"
            >
              Criar minha página grátis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/demo"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-medium text-foreground hover:bg-accent transition"
            >
              <Play className="h-4 w-4" /> Ver demonstração
            </Link>
          </div>

          {/* Benefícios rápidos */}
          <ul className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-x-5 gap-y-2 lg:mx-0 lg:justify-start">
            {[
              "Agendamento online",
              "Pagamento integrado",
              "Agenda inteligente",
              "Sem mensalidade para testar",
            ].map((b) => (
              <li key={b} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-brand" /> {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Animação do fluxo de agendamento */}
        <div className="flex justify-center lg:justify-end">
          <AnimatedFlow />
        </div>
      </div>
    </section>
  );
}

// ─── Animação do fluxo (iframe standalone) ────────────────────────────────────
// Animação do fluxo de agendamento exportada como app autocontido em
// public/fluxo-mobile.html. Embutida via iframe para isolar runtime/estilos.

function AnimatedFlow() {
  return (
    <div className="w-full max-w-[390px]">
      <iframe
        src="/fluxo-mobile.html"
        title="Demonstração do fluxo de agendamento CuidandoVC"
        loading="lazy"
        scrolling="no"
        className="h-[760px] w-full rounded-[2.5rem] border-0 bg-transparent"
      />
    </div>
  );
}

// ─── Phone mockup (página do médico) ──────────────────────────────────────────

function PhoneMockup() {
  const services = [
    { nome: "Consulta", preco: "R$ 250", dur: "50 min" },
    { nome: "Retorno", preco: "R$ 150", dur: "30 min" },
    { nome: "Avaliação", preco: "R$ 320", dur: "60 min" },
    { nome: "Teleconsulta", preco: "R$ 200", dur: "40 min" },
  ];
  return (
    <div className="relative w-[300px]">
      {/* Floating badge */}
      <div className="absolute -left-6 top-24 z-10 hidden rotate-[-6deg] rounded-xl border border-border bg-card p-3 shadow-xl sm:block">
        <div className="flex items-center gap-2 text-xs font-medium">
          <CreditCard className="h-4 w-4 text-brand" /> Pagamento confirmado
        </div>
      </div>
      <div className="absolute -right-4 bottom-28 z-10 hidden rotate-[5deg] rounded-xl border border-border bg-card p-3 shadow-xl sm:block">
        <div className="flex items-center gap-2 text-xs font-medium">
          <CalendarCheck className="h-4 w-4 text-green-600" /> Novo agendamento
        </div>
      </div>

      {/* Phone shell */}
      <div className="relative rounded-[2.5rem] border-[10px] border-foreground/90 bg-foreground/90 shadow-2xl">
        <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-foreground/90" />
        <div className="h-[560px] overflow-hidden rounded-[1.8rem] bg-slate-50">
          <div className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Perfil */}
            <div className="bg-gradient-to-b from-brand/10 to-transparent px-5 pt-8 pb-4 text-center">
              <div className="mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br from-brand to-brand/60 text-2xl font-bold text-brand-foreground shadow-lg ring-4 ring-white">
                DR
              </div>
              <p className="mt-3 text-sm font-bold text-slate-900">Dra. Marina Alves</p>
              <p className="text-xs text-brand">Dermatologia · CRM 00000</p>
              <p className="mt-2 text-[11px] leading-snug text-slate-500">
                Cuidando da sua pele com ciência e carinho.
              </p>
            </div>

            {/* Serviços */}
            <div className="px-4 pb-6">
              <p className="mb-2 px-1 text-[11px] font-semibold text-slate-500">
                Escolha o atendimento
              </p>
              <div className="grid grid-cols-2 gap-2">
                {services.map((s) => (
                  <div
                    key={s.nome}
                    className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
                  >
                    <div className="mb-2 grid size-8 place-items-center rounded-lg bg-brand/10 text-brand">
                      <Stethoscope className="h-4 w-4" />
                    </div>
                    <p className="text-[12px] font-bold text-slate-900">{s.nome}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{s.dur}</p>
                    <p className="mt-1 text-[12px] font-black text-slate-900">{s.preco}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-2xl bg-brand py-3 text-center text-[13px] font-bold text-brand-foreground shadow-lg shadow-brand/30">
                Agendar agora →
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Problema ─────────────────────────────────────────────────────────────────

function Problema() {
  const itens = [
    "Responde mensagens manualmente",
    "Precisa confirmar horários no WhatsApp",
    "Envia chave Pix toda hora",
    "Faz controle da agenda em planilhas",
    "Depende de várias ferramentas diferentes",
  ];
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-rose-500">O problema</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          Você perde pacientes quando…
        </h2>
      </div>
      <div className="mx-auto mt-10 grid max-w-2xl gap-3">
        {itens.map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-500">
              <X className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-foreground">{i}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Solução (fluxo) ──────────────────────────────────────────────────────────

function Solucao() {
  const fluxo = [
    { icon: Instagram, label: "Instagram", sub: "link na bio" },
    { icon: Smartphone, label: "Página profissional", sub: "sua clínica digital" },
    { icon: MousePointerClick, label: "Escolha do serviço", sub: "preço e duração" },
    { icon: CalendarClock, label: "Escolha do horário", sub: "agenda em tempo real" },
    { icon: CreditCard, label: "Pagamento", sub: "Pix ou cartão" },
    { icon: CheckCircle2, label: "Agendamento confirmado", sub: "automático" },
  ];
  return (
    <section className="bg-muted/30 py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-brand">A solução</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
            Tudo em um único link
          </h2>
        </div>

        {/* Fluxo animado */}
        <div className="mt-14 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-center">
          {fluxo.map((f, i) => (
            <div key={f.label} className="flex flex-col items-center gap-3 md:flex-row">
              <div
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 shadow-sm md:w-auto md:flex-col md:px-5 md:py-4 md:text-center animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                  <f.icon className="h-5 w-5" />
                </span>
                <div className="md:mt-1">
                  <p className="text-sm font-semibold leading-tight">{f.label}</p>
                  <p className="text-[11px] text-muted-foreground">{f.sub}</p>
                </div>
              </div>
              {i < fluxo.length - 1 && (
                <ArrowRight className="hidden h-5 w-5 shrink-0 animate-pulse text-brand md:block" />
              )}
            </div>
          ))}
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-lg text-muted-foreground">
          Enquanto você atende pacientes, o{" "}
          <span className="font-semibold text-foreground">CuidandoVC</span> organiza sua agenda
          automaticamente.
        </p>
      </div>
    </section>
  );
}

// ─── HowItWorks ───────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: "1",
      t: "Crie sua página",
      d: "Adicione foto, especialidades, serviços e preços.",
    },
    {
      n: "2",
      t: "Compartilhe seu link",
      d: "Coloque na bio do Instagram, WhatsApp ou Google.",
    },
    {
      n: "3",
      t: "Receba agendamentos",
      d: "Os pacientes escolhem data e horário disponíveis.",
    },
    {
      n: "4",
      t: "Receba pagamentos",
      d: "Tudo acontece em um único fluxo.",
    },
  ];
  return (
    <section id="como-funciona" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-brand">Como funciona</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
          Comece em minutos, sem complicação.
        </h2>
      </div>
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div
            key={s.n}
            className="relative rounded-2xl border border-border bg-card p-7 transition hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
          >
            <span className="grid size-10 place-items-center rounded-full bg-brand text-sm font-bold text-brand-foreground">
              {s.n}
            </span>
            <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function Features() {
  const features = [
    { icon: CalendarCheck, t: "Agenda Inteligente", d: "Controle total dos horários." },
    { icon: CreditCard, t: "Pagamentos Online", d: "Receba sem complicações." },
    { icon: Smartphone, t: "Link na Bio Profissional", d: "Sua clínica digital." },
    { icon: Users, t: "Gestão de Pacientes", d: "Histórico e organização." },
    { icon: BarChart3, t: "Dashboard Completo", d: "Visualize agendamentos e resultados." },
    { icon: Bell, t: "Lembretes Automáticos", d: "Reduza faltas." },
  ];
  return (
    <section id="recursos" className="bg-muted/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-brand">Recursos</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
            Tudo que você precisa para crescer.
          </h2>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.t}
              className="group rounded-2xl border border-border bg-background p-6 transition hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-brand-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── ForWhom ──────────────────────────────────────────────────────────────────

function ForWhom() {
  const grupos = [
    { emoji: "👨‍⚕️", label: "Médicos" },
    { emoji: "😁", label: "Dentistas" },
    { emoji: "🧠", label: "Psicólogos" },
    { emoji: "🏃", label: "Fisioterapeutas" },
    { emoji: "💉", label: "Esteticistas" },
    { emoji: "🥗", label: "Nutricionistas" },
    { emoji: "👩‍⚕️", label: "Clínicas" },
    { emoji: "✨", label: "E muito mais" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-brand">Para quem é</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
          Feito para profissionais de saúde.
        </h2>
      </div>
      <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {grupos.map((g) => (
          <div
            key={g.label}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-4 py-6 text-center transition hover:border-brand/40 hover:shadow-md"
          >
            <span className="text-3xl">{g.emoji}</span>
            <span className="text-sm font-semibold">{g.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Demonstração ─────────────────────────────────────────────────────────────

function Demonstracao() {
  const itens = [
    "Foto do profissional",
    "Especialidades",
    "Serviços e preços",
    "Agenda disponível",
    "Pagamento online",
  ];
  return (
    <section id="demonstracao" className="bg-muted/30 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2">
        <div className="flex justify-center lg:order-2">
          <PhoneMockup />
        </div>
        <div className="lg:order-1">
          <p className="text-sm font-medium uppercase tracking-widest text-brand">Demonstração</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            O que o paciente vê
          </h2>
          <p className="mt-4 text-muted-foreground">
            Uma página linda e profissional, otimizada para o celular — onde o paciente resolve tudo
            sem sair do link.
          </p>
          <ul className="mt-6 space-y-3">
            {itens.map((i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-brand" /> {i}
              </li>
            ))}
          </ul>
          <Link
            to="/demo"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-sm font-medium text-brand-foreground shadow-lg shadow-brand/20 transition hover:shadow-xl hover:shadow-brand/30"
          >
            Testar demonstração <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Comparação ───────────────────────────────────────────────────────────────

function Comparacao() {
  const rows = [
    { recurso: "Link na bio", linktree: "yes", whatsapp: "no", cuidando: "yes" },
    { recurso: "Agendamento", linktree: "no", whatsapp: "manual", cuidando: "yes" },
    { recurso: "Pagamento", linktree: "no", whatsapp: "manual", cuidando: "yes" },
    { recurso: "Agenda", linktree: "no", whatsapp: "no", cuidando: "yes" },
    { recurso: "Gestão de pacientes", linktree: "no", whatsapp: "no", cuidando: "yes" },
  ];

  const Cell = ({ v }: { v: string }) => {
    if (v === "yes")
      return (
        <span className="mx-auto grid size-6 place-items-center rounded-full bg-brand/10 text-brand">
          <Check className="h-4 w-4" />
        </span>
      );
    if (v === "no")
      return (
        <span className="mx-auto grid size-6 place-items-center rounded-full bg-rose-50 text-rose-400">
          <X className="h-4 w-4" />
        </span>
      );
    return <span className="text-xs text-muted-foreground">Manual</span>;
  };

  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-brand">Comparação</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
          Por que escolher o CuidandoVC.
        </h2>
      </div>
      <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-4 py-4 font-semibold">Recurso</th>
              <th className="px-2 py-4 text-center font-medium text-muted-foreground">Linktree</th>
              <th className="px-2 py-4 text-center font-medium text-muted-foreground">WhatsApp</th>
              <th className="px-2 py-4 text-center font-bold text-brand">CuidandoVC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.recurso} className="border-b border-border last:border-0">
                <td className="px-4 py-3.5 font-medium">{r.recurso}</td>
                <td className="px-2 py-3.5 text-center">
                  <Cell v={r.linktree} />
                </td>
                <td className="px-2 py-3.5 text-center">
                  <Cell v={r.whatsapp} />
                </td>
                <td className="bg-brand/5 px-2 py-3.5 text-center">
                  <Cell v={r.cuidando} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials() {
  const items = [
    { q: "Meus pacientes estão agendando enquanto eu durmo kkk.", r: "Profissional de saúde" },
    { q: "Agora meus pacientes conseguem agendar sozinhos.", r: "Profissional de saúde" },
    { q: "Finalmente tenho tudo em um único lugar.", r: "Profissional de saúde" },
  ];
  return (
    <section id="depoimentos" className="bg-muted/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-brand">Depoimentos</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
            Quem usa, recomenda.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {items.map((t) => (
            <figure
              key={t.q}
              className="flex flex-col rounded-2xl border border-border bg-background p-7"
            >
              <div className="flex gap-0.5 text-brand">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4" fill="currentColor" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-base leading-relaxed text-foreground">
                "{t.q}"
              </blockquote>
              <figcaption className="mt-6 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">{t.r}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FAQ() {
  const faqs = [
    { q: "Preciso de site?", a: "Não. Seu link já é a sua página completa de agendamentos." },
    {
      q: "Funciona no Instagram?",
      a: "Sim. Foi feito para colocar na bio do Instagram (também funciona no WhatsApp e Google).",
    },
    {
      q: "Preciso instalar algo?",
      a: "Não. Tudo acontece no navegador, no celular ou no computador.",
    },
    {
      q: "Posso receber pagamentos?",
      a: "Sim. Conecte sua conta Mercado Pago e receba via Pix ou cartão direto na sua conta.",
    },
    { q: "Posso usar no WhatsApp?", a: "Sim. É só compartilhar o seu link em qualquer lugar." },
  ];
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-brand">
          Perguntas frequentes
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
          As respostas que você procura.
        </h2>
      </div>
      <div className="mt-12 divide-y divide-border rounded-2xl border border-border bg-card">
        {faqs.map((f) => (
          <details key={f.q} className="group p-6 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium">
              {f.q}
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ─── FinalCTA ─────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">
      <div className="relative overflow-hidden rounded-3xl bg-foreground p-12 text-background md:p-16">
        <div
          className="absolute -right-20 -top-20 h-80 w-80 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--brand)" }}
        />
        <div className="relative max-w-2xl">
          <Sparkles className="h-8 w-8 text-brand" />
          <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Pronto para transformar seu Instagram em uma máquina de agendamentos?
          </h2>
          <p className="mt-4 text-lg text-background/70">
            O link na bio que cuida de tudo para você.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/onboarding"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-sm font-medium text-brand-foreground hover:opacity-90 transition"
            >
              Criar minha página gratuitamente <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/sign-in"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-background/20 px-6 text-sm font-medium text-background hover:bg-background/10 transition"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-2">
          <img
            src="/logo-icon.png"
            alt="CuidandoVC"
            className="h-7 w-7 rounded-md object-contain"
          />
          <span className="text-sm font-semibold">CuidandoVC</span>
          <span className="text-xs text-muted-foreground">© 2026</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <a href="#como-funciona" className="hover:text-foreground transition-colors">
            Como funciona
          </a>
          <a href="#recursos" className="hover:text-foreground transition-colors">
            Recursos
          </a>
          <Link to="/sign-in" className="hover:text-foreground transition-colors">
            Entrar
          </Link>
          <Link
            to="/onboarding"
            className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background hover:opacity-80 transition"
          >
            Criar minha página
          </Link>
        </div>
      </div>
    </footer>
  );
}
