import { useState } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  LayoutDashboard,
  CalendarDays,
  UserRound,
  Settings,
  Globe,
  Wallet,
  LifeBuoy,
  LogOut,
  Menu,
  X,
  Rocket,
  Copy,
  Check,
  Eye,
  ExternalLink,
  Image,
  FileText,
  Clock,
  CreditCard,
  Star,
  TrendingUp,
  QrCode,
  Share2,
  Edit3,
  GraduationCap,
  Award,
  MapPin,
} from "lucide-react";

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Visão geral", href: "/demo-dashboard" },
  { icon: CalendarDays, label: "Agenda", href: "/demo-agenda" },
  { icon: UserRound, label: "Pacientes", href: "/demo-pacientes" },
  { icon: Globe, label: "Página Pública", href: "/demo-pagina-publica" },
  { icon: Wallet, label: "Financeiro", href: "/demo-financeiro" },
  { icon: Settings, label: "Configurações", href: "#" },
  { icon: LifeBuoy, label: "Suporte", href: "#" },
];

const PUBLIC_URL = "dra-ana-beatriz.cuidandovc.com.br";

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function DemoSidebar({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  function handleNav(e: React.MouseEvent, href: string) {
    if (href === "#") {
      e.preventDefault();
      toast.info("Explore à vontade! Esta área estará disponível na sua conta.", { duration: 2500 });
    }
    onClose?.();
  }

  return (
    <>
      <div className={`px-6 py-5 border-b border-slate-100 ${mobile ? "flex items-center justify-between" : ""}`}>
        <Link to="/demo" className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="CuidandoVC" className="h-9 w-9 rounded-xl object-contain" />
          <div>
            <div className="text-sm font-semibold tracking-tight">CuidandoVC</div>
            <div className="text-[11px] text-slate-500">Painel do médico</div>
          </div>
        </Link>
        {mobile && (
          <button onClick={onClose} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-50">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href !== "#" && location.pathname.startsWith(item.href);
          return (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleNav(e, item.href)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                isActive
                  ? "bg-gradient-to-r from-teal-50 to-indigo-50 text-teal-700 font-medium ring-1 ring-teal-100"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </a>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition group">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 grid place-items-center text-white font-semibold text-sm shrink-0">AB</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Dra. Ana Beatriz Santos</div>
            <div className="text-xs text-slate-500 truncate">Psicologia Clínica · CRP 06/123456</div>
          </div>
          <button title="Demo — sair" onClick={() => void navigate({ to: "/demo" })} className="opacity-0 group-hover:opacity-100 transition">
            <LogOut className="h-4 w-4 text-slate-400 hover:text-rose-500 transition" />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Mini phone preview ───────────────────────────────────────────────────────

function PhonePreview() {
  const SERVICES = [
    { name: "Consulta Inicial", duration: "60 min", price: "R$ 180" },
    { name: "Sessão de Psicoterapia", duration: "50 min", price: "R$ 150" },
    { name: "Avaliação Psicológica", duration: "90 min", price: "R$ 250" },
  ];

  return (
    <div className="relative w-[200px] mx-auto rounded-[2rem] border-[5px] border-slate-800 bg-white shadow-2xl shadow-slate-400/20 overflow-hidden">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-800 rounded-b-xl z-10" />

      {/* Status bar */}
      <div className="bg-teal-600 pt-5 px-3 pb-3 text-white">
        <div className="flex justify-between items-center text-[8px] mb-3">
          <span>9:41</span>
          <div className="flex gap-1 items-center">
            <div className="flex gap-[1px] items-end h-2">
              {[1, 2, 3, 2].map((h, i) => (
                <div key={i} className="w-[2px] bg-white/80 rounded-sm" style={{ height: `${h * 4}px` }} />
              ))}
            </div>
            <div className="w-3.5 h-2 rounded-sm border border-white/60 relative">
              <div className="absolute inset-[1px] right-[2px] bg-white/80 rounded-sm" />
            </div>
          </div>
        </div>
        <div className="text-center">
          <div className="h-10 w-10 rounded-full bg-white/20 grid place-items-center text-sm font-bold mx-auto mb-1">AB</div>
          <div className="text-[10px] font-bold">Dra. Ana Beatriz Santos</div>
          <div className="text-[8px] text-teal-200 mt-0.5">Psicologia Clínica · CRP 06/123456</div>
        </div>
      </div>

      {/* Info chips */}
      <div className="bg-white px-2 py-2 grid grid-cols-2 gap-1">
        {[
          { icon: GraduationCap, text: "Psicologia Clínica" },
          { icon: Award, text: "CRP 06/123456" },
          { icon: MapPin, text: "São Paulo, SP" },
          { icon: Star, text: "4,9 (127 avaliações)" },
        ].map((c) => (
          <div key={c.text} className="flex items-center gap-1 rounded-lg border border-slate-100 px-1.5 py-1">
            <c.icon className="h-2.5 w-2.5 text-teal-600 shrink-0" />
            <span className="text-[7px] text-slate-600 truncate">{c.text}</span>
          </div>
        ))}
      </div>

      {/* Services */}
      <div className="px-2 pb-3 space-y-1">
        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider px-0.5 mb-1.5">Serviços</div>
        {SERVICES.map((s) => (
          <div key={s.name} className="border border-slate-200 rounded-lg px-2 py-1.5 flex items-center justify-between">
            <div>
              <div className="text-[8px] font-semibold text-slate-900 leading-tight">{s.name}</div>
              <div className="text-[7px] text-slate-400 mt-0.5">{s.duration}</div>
            </div>
            <div className="text-[8px] font-bold text-teal-700">{s.price}</div>
          </div>
        ))}
        <div className="mt-2 rounded-lg bg-teal-600 text-white text-center py-1.5">
          <span className="text-[9px] font-bold">Agendar consulta</span>
        </div>
      </div>

      {/* Home bar */}
      <div className="bg-white flex justify-center pb-2 pt-1">
        <div className="w-12 h-0.5 bg-slate-800 rounded-full" />
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function DemoPaginaPublicaContent() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    toast.success("Link copiado! Cole na bio do seu Instagram.", { duration: 2500 });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleEdit() {
    toast.info("Edite sua bio, foto e informações na sua conta real.", { duration: 2500 });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 h-14">
        <Link to="/demo" className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="CuidandoVC" className="h-8 w-8 rounded-lg object-contain" />
          <span className="text-sm font-semibold tracking-tight">CuidandoVC</span>
        </Link>
        <button onClick={() => setMobileOpen(true)} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl">
            <DemoSidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex">
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white min-h-screen sticky top-0">
          <DemoSidebar />
        </aside>

        <main className="flex-1 min-w-0">
          {/* Topbar */}
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
            <div className="px-6 py-4 flex items-center gap-4">
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Página Pública</h1>
                <p className="text-xs text-slate-500">Seu link na bio do Instagram</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <a
                  href="/demo-perfil"
                  target="_blank"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver ao vivo
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 transition shadow-sm"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Editar página</span>
                </button>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-6">
            {/* Stats */}
            <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { label: "Visualizações", value: "1.247", delta: "+18% este mês", icon: Eye, iconBg: "bg-indigo-50", iconText: "text-indigo-600" },
                { label: "Agendamentos via link", value: "89", delta: "+7 esta semana", icon: CalendarDays, iconBg: "bg-teal-50", iconText: "text-teal-600" },
                { label: "Taxa de conversão", value: "7,1%", delta: "Ótima performance", icon: TrendingUp, iconBg: "bg-emerald-50", iconText: "text-emerald-600" },
                { label: "Avaliação média", value: "4,9 ⭐", delta: "127 avaliações", icon: Star, iconBg: "bg-amber-50", iconText: "text-amber-600" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-white border border-slate-200 p-5 hover:shadow-md transition">
                  <div className={`h-10 w-10 rounded-xl grid place-items-center mb-4 ${s.iconBg}`}>
                    <s.icon className={`h-5 w-5 ${s.iconText}`} />
                  </div>
                  <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-1">{s.delta}</div>
                </div>
              ))}
            </section>

            {/* Main grid: link + sections + preview */}
            <section className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              {/* Left: link + sections */}
              <div className="xl:col-span-3 space-y-5">
                {/* URL card */}
                <div className="rounded-2xl bg-white border border-slate-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="h-4 w-4 text-teal-600" />
                    <h3 className="text-sm font-semibold">Seu link exclusivo</h3>
                    <span className="ml-auto text-[11px] bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-full">Online</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <Globe className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="flex-1 text-sm text-teal-700 font-medium truncate">🔗 {PUBLIC_URL}</span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition shrink-0"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={() => toast.info("Compartilhe via WhatsApp, e-mail ou redes sociais.", { duration: 2000 })}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Compartilhar
                    </button>
                    <button
                      onClick={() => toast.info("Baixe o QR Code para imprimir no consultório.", { duration: 2000 })}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      QR Code
                    </button>
                    <a
                      href="/demo-perfil"
                      target="_blank"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir página
                    </a>
                  </div>
                </div>

                {/* Sections */}
                <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-semibold">Seções da página</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Clique para editar cada seção</p>
                  </div>
                  <ul className="divide-y divide-slate-50">
                    {[
                      { icon: Image, label: "Foto e Bio", desc: "Dra. Ana Beatriz Santos — Psicologia Clínica", status: "Publicado" },
                      { icon: FileText, label: "Serviços", desc: "3 serviços configurados · R$ 150 a R$ 250", status: "Publicado" },
                      { icon: Clock, label: "Disponibilidade", desc: "Seg a Sex · 09:00 às 17:00", status: "Publicado" },
                      { icon: CreditCard, label: "Formas de pagamento", desc: "PIX, Cartão de Crédito e Débito", status: "Publicado" },
                      { icon: Star, label: "Avaliações", desc: "127 avaliações · Média 4,9 estrelas", status: "Publicado" },
                    ].map((section) => (
                      <li
                        key={section.label}
                        onClick={handleEdit}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition cursor-pointer group"
                      >
                        <div className="h-9 w-9 rounded-xl bg-teal-50 grid place-items-center shrink-0">
                          <section.icon className="h-4 w-4 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{section.label}</p>
                          <p className="text-xs text-slate-500 truncate">{section.desc}</p>
                        </div>
                        <span className="text-[11px] bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-full shrink-0">
                          {section.status}
                        </span>
                        <Edit3 className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition shrink-0" />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right: phone preview */}
              <div className="xl:col-span-2">
                <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-center h-full flex flex-col items-center justify-center gap-4 min-h-[400px]">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Preview ao vivo</div>
                  <PhonePreview />
                  <a
                    href="/demo-perfil"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir em tela cheia
                  </a>
                </div>
              </div>
            </section>

            {/* CTA */}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <Globe className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Quer ter sua própria página de agendamento?</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Crie sua conta e tenha seu link personalizado em menos de 5 minutos.</p>
              <a
                href="/sign-up"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 transition"
              >
                <Rocket className="h-4 w-4" />
                Criar minha conta grátis
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
