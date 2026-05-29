import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  Clock,
  Bell,
  ShieldCheck,
  Smartphone,
  BarChart3,
  ArrowRight,
  Star,
  Check,
  Stethoscope,
  Video,
  MessageCircle,
  Zap,
  Users,
} from "lucide-react";
import { fetchPublicProfile } from "../lib/subdomain";
import { ProfessionalPublicPage, ProfessionalNotFound } from "../components/ProfessionalPublicPage";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/")({
  loader: () => fetchPublicProfile(),
  head: () => ({
    meta: [
      { title: "CuidandoVC — Agendamento online para médicos e clínicas" },
      {
        name: "description",
        content:
          "Plataforma de agendamento que reduz faltas em até 67%, automatiza confirmações e permite que seus pacientes paguem na hora. Zero fricção.",
      },
      { property: "og:title", content: "CuidandoVC — Agendamento que cuida" },
      {
        property: "og:description",
        content:
          "Agenda inteligente, lembretes automáticos e pagamentos online para clínicas modernas.",
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
      <LogosStrip />
      <Stats />
      <Features />
      <HowItWorks />
      <ForWhom />
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
          <a href="#recursos" className="hover:text-foreground transition-colors">
            Recursos
          </a>
          <a href="#como-funciona" className="hover:text-foreground transition-colors">
            Como funciona
          </a>
          <a href="#depoimentos" className="hover:text-foreground transition-colors">
            Depoimentos
          </a>
          <a href="#faq" className="hover:text-foreground transition-colors">
            Perguntas
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/onboarding"
            className="hidden text-sm text-muted-foreground hover:text-foreground transition-colors sm:block"
          >
            Entrar
          </Link>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
          >
            Começar grátis <ArrowRight className="h-3.5 w-3.5" />
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

      <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 md:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
            </span>
            Novo · Confirmação automática por WhatsApp
          </div>

          <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            A agenda da sua clínica,{" "}
            <span className="bg-gradient-to-r from-brand to-brand/60 bg-clip-text text-transparent">
              finalmente sem faltas
            </span>
            .
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
            CuidandoVC é a plataforma de agendamento que cuida do trabalho chato — confirmações,
            lembretes e pagamentos — para você cuidar do que importa: seus pacientes.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/onboarding"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-sm font-medium text-brand-foreground shadow-lg shadow-brand/20 transition hover:shadow-xl hover:shadow-brand/30"
            >
              Experimente grátis por 14 dias <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-medium text-foreground hover:bg-accent transition"
            >
              Ver como funciona
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Sem cartão de crédito · Configuração em 5 minutos · Cancele quando quiser
          </p>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto mt-16 max-w-5xl">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-foreground/5">
        {/* Browser bar */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          <span className="ml-3 text-xs text-muted-foreground">cuidandovc.com.br/dashboard</span>
        </div>
        {/* Stats row */}
        <div className="grid gap-4 p-6 md:grid-cols-3">
          {[
            { h: "Hoje", n: "12", l: "consultas confirmadas", c: "text-brand" },
            { h: "Esta semana", n: "47", l: "novos agendamentos", c: "text-foreground" },
            { h: "Taxa de presença", n: "94%", l: "+18% vs último mês", c: "text-green-600" },
          ].map((k) => (
            <div key={k.h} className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.h}</p>
              <p className={`mt-2 text-3xl font-semibold ${k.c}`}>{k.n}</p>
              <p className="mt-1 text-xs text-muted-foreground">{k.l}</p>
            </div>
          ))}
        </div>
        {/* Appointments list */}
        <div className="space-y-2 px-6 pb-6">
          {[
            {
              t: "09:00",
              n: "Marina Costa",
              s: "Consulta cardiológica",
              st: "Confirmado",
              c: "bg-brand/10 text-brand",
            },
            {
              t: "10:30",
              n: "Rafael Souza",
              s: "Teleconsulta — Retorno",
              st: "Em sala",
              c: "bg-amber-100 text-amber-700",
            },
            {
              t: "14:00",
              n: "Júlia Almeida",
              s: "Check-up completo",
              st: "Aguardando",
              c: "bg-muted text-muted-foreground",
            },
          ].map((a) => (
            <div
              key={a.t}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-muted-foreground">{a.t}</span>
                <div>
                  <p className="font-medium">{a.n}</p>
                  <p className="text-xs text-muted-foreground">{a.s}</p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${a.c}`}>{a.st}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating notification card */}
      <div className="absolute -bottom-6 -right-6 hidden w-64 rotate-3 rounded-xl border border-border bg-card p-4 shadow-xl md:block">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bell className="h-3.5 w-3.5 text-brand" /> Lembrete enviado
        </div>
        <p className="mt-2 text-sm">"Olá Marina! Sua consulta é amanhã às 9h. Posso confirmar?"</p>
        <div className="mt-3 flex gap-2">
          <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-medium text-brand-foreground">
            Sim
          </span>
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px]">
            Remarcar
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── LogosStrip ───────────────────────────────────────────────────────────────

function LogosStrip() {
  const logos = [
    "Clínica Vita",
    "Odonto+",
    "DermaCare",
    "CardioRio",
    "Pediatra Hub",
    "Vivenda Saúde",
  ];
  return (
    <section className="border-y border-border/60 bg-muted/30 py-10">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
          Mais de 2.400 clínicas já confiam no CuidandoVC
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-60">
          {logos.map((l) => (
            <span key={l} className="text-sm font-semibold tracking-tight text-foreground/70">
              {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function Stats() {
  const stats = [
    { n: "67%", l: "menos faltas de pacientes" },
    { n: "8h", l: "economizadas por semana" },
    { n: "2.4k+", l: "clínicas ativas no Brasil" },
    { n: "4.9★", l: "média de avaliação" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="text-center">
            <p className="text-4xl font-semibold tracking-tight text-brand md:text-5xl">{s.n}</p>
            <p className="mt-2 text-sm text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Features ────────────────────────────────────────────────────────────────

function Features() {
  const features = [
    {
      icon: CalendarCheck,
      t: "Agenda inteligente",
      d: "Conflitos bloqueados automaticamente. Janelas livres preenchidas pela lista de espera.",
    },
    {
      icon: Bell,
      t: "Lembretes automáticos",
      d: "WhatsApp, SMS e e-mail. O paciente confirma com um toque — sem você levantar o telefone.",
    },
    {
      icon: Smartphone,
      t: "Sem cadastro para o paciente",
      d: "Link direto na bio do Instagram, agendamento em menos de 2 minutos. Zero atrito.",
    },
    {
      icon: Zap,
      t: "Pagamento na hora",
      d: "PIX, cartão e boleto. O dinheiro cai direto na sua conta via split automático.",
    },
    {
      icon: Video,
      t: "Atendimento Virtual integrado",
      d: "Gere links de videochamada para consultas online. Tudo dentro do CuidandoVC.",
    },
    {
      icon: ShieldCheck,
      t: "Seguro e LGPD",
      d: "Criptografia ponta a ponta. Seus dados e os do paciente, 100% protegidos.",
    },
  ];
  return (
    <section id="recursos" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-brand">Recursos</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          Tudo que sua clínica precisa. Nada que ela não precisa.
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Cada recurso foi desenhado para devolver tempo — para você, sua equipe e seus pacientes.
        </p>
      </div>
      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.t}
            className="group rounded-2xl border border-border bg-card p-6 transition hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-brand-foreground">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">{f.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── HowItWorks ───────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Configure em 5 minutos",
      d: "Cadastre seus serviços, preços, horários e foto. Personalize as cores do seu link.",
    },
    {
      n: "02",
      t: "Compartilhe seu link",
      d: "Cole na bio do Instagram. O paciente acessa, escolhe o serviço e agenda sozinho.",
    },
    {
      n: "03",
      t: "Atenda — a gente cuida do resto",
      d: "Confirmações, lembretes, pagamentos e remarcações: tudo no automático.",
    },
  ];
  return (
    <section id="como-funciona" className="bg-muted/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-brand">Como funciona</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Comece a usar hoje. Resultados na primeira semana.
          </h2>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-border bg-background p-8">
              <span className="text-5xl font-semibold text-brand/30">{s.n}</span>
              <h3 className="mt-4 text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── ForWhom ──────────────────────────────────────────────────────────────────

function ForWhom() {
  const pro = [
    "Link personalizado com sua marca e cores",
    "Agenda multi-serviço com bloqueio inteligente",
    "Recebimentos via PIX, cartão e boleto",
    "Atendimento Virtual integrado com Google Meet",
  ];
  const pat = [
    "Agendamento em menos de 2 minutos",
    "Lembretes por WhatsApp",
    "Pagamento seguro online",
    "Remarcação com um toque",
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            <Stethoscope className="h-3.5 w-3.5" /> Para médicos e clínicas
          </div>
          <h3 className="mt-5 text-3xl font-semibold tracking-tight">
            Sua agenda no piloto automático
          </h3>
          <p className="mt-3 text-muted-foreground">
            Pare de perder consultas por esquecimento. Pare de remarcar no WhatsApp pessoal.
          </p>
          <ul className="mt-6 space-y-3">
            {pro.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-sm">
                <Check className="h-4 w-4 text-brand" /> {p}
              </li>
            ))}
          </ul>
          <Link
            to="/onboarding"
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:gap-2.5 transition-all"
          >
            Criar minha conta grátis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-brand to-brand/70 p-10 text-brand-foreground">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Users className="h-3.5 w-3.5" /> Para pacientes
          </div>
          <h3 className="mt-5 text-3xl font-semibold tracking-tight">
            Marcar consulta nunca foi tão simples
          </h3>
          <p className="mt-3 text-brand-foreground/80">
            Escolha o horário. Confirme. Pague. Pronto. Sem ligações, sem cadastros, sem espera.
          </p>
          <ul className="mt-6 space-y-3">
            {pat.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-sm">
                <Check className="h-4 w-4" /> {p}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-brand-foreground/70">
            Acesse o link do seu médico no Instagram para agendar.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials() {
  const items = [
    {
      q: "Reduzi minhas faltas de 22% para 6% em dois meses. O CuidandoVC se pagou na primeira semana.",
      n: "Dra. Beatriz Carvalho",
      r: "Cardiologista · Clínica Vita",
    },
    {
      q: "Minha recepcionista voltou a sorrir. O WhatsApp dela parou de tocar às 22h com pedidos de agendamento.",
      n: "Dr. Ricardo Mendes",
      r: "Odontologia · Odonto+",
    },
    {
      q: "Os pacientes amam o link da bio. Marco em 30 segundos pelo Instagram — simplesmente virou rotina.",
      n: "Dra. Carolina Lima",
      r: "Dermatologia · DermaCare",
    },
  ];
  return (
    <section id="depoimentos" className="bg-muted/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-brand">Depoimentos</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Quem usa, não volta atrás.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {items.map((t) => (
            <figure
              key={t.n}
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
                <p className="text-sm font-semibold">{t.n}</p>
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
    {
      q: "Preciso instalar alguma coisa?",
      a: "Não. CuidandoVC funciona direto no navegador, no computador ou no celular. Acesse de qualquer lugar.",
    },
    {
      q: "Como funciona o período grátis?",
      a: "14 dias com todos os recursos liberados. Sem cartão de crédito. Cancele quando quiser.",
    },
    {
      q: "Como os pacientes me encontram?",
      a: "Você recebe um link personalizado (ex: cuidandovc.com.br/dr-nome) que pode colocar na bio do Instagram ou WhatsApp. O paciente acessa, escolhe o serviço e agenda sozinho.",
    },
    {
      q: "Como recebo os pagamentos?",
      a: "Conectando sua conta Mercado Pago. O dinheiro vai direto para você via PIX, cartão ou boleto. CuidandoVC retém apenas a taxa de plataforma (≈ 5%) automaticamente.",
    },
    {
      q: "Funciona para clínicas com vários médicos?",
      a: "Sim. No plano Clinic você cadastra toda a equipe, cada profissional com seus próprios serviços e agenda. Um link, múltiplos profissionais.",
    },
  ];
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-brand">
          Perguntas frequentes
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
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
          <Clock className="h-8 w-8 text-brand" />
          <h2 className="mt-6 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            Quanto vale recuperar 8 horas da sua semana?
          </h2>
          <p className="mt-4 text-lg text-background/70">
            Comece grátis hoje. Em 14 dias, sua agenda será outra.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/onboarding"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-sm font-medium text-brand-foreground hover:opacity-90 transition"
            >
              Começar grátis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/onboarding"
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
          <a href="#" className="hover:text-foreground transition-colors">
            Privacidade
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Termos
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Suporte
          </a>
          <Link to="/onboarding" className="hover:text-foreground transition-colors">
            Entrar
          </Link>
          <Link
            to="/onboarding"
            className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background hover:opacity-80 transition"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </footer>
  );
}
