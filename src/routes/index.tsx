import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles,
  HeartPulse,
  Activity,
  Stethoscope,
  Baby,
  Apple,
  ArrowRight,
  Star,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  Video,
  Check,
  type LucideIcon,
} from "lucide-react";
import doctorBeatriz from "@/assets/doctor-beatriz.jpg";
import doctorRicardo from "@/assets/doctor-ricardo.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

type Specialty = {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  tone: string;
  iconBg: string;
  iconText: string;
  services: { name: string; price: number }[];
};

const specialties: Specialty[] = [
  { id: "odonto", name: "Odontologia", desc: "Checkups e estética", icon: Sparkles, tone: "teal", iconBg: "bg-teal-50", iconText: "text-teal-600",
    services: [
      { name: "Limpeza e profilaxia", price: 200 },
      { name: "Restauração", price: 280 },
      { name: "Tratamento de canal", price: 950 },
      { name: "Extração dentária", price: 350 },
      { name: "Clareamento dental", price: 1200 },
      { name: "Implante dentário", price: 3500 },
    ] },
  { id: "dermato", name: "Dermatologia", desc: "Saúde da pele", icon: HeartPulse, tone: "rose", iconBg: "bg-rose-50", iconText: "text-rose-600",
    services: [
      { name: "Consulta dermatológica", price: 380 },
      { name: "Tratamento de acne", price: 450 },
      { name: "Remoção de manchas e pintas", price: 550 },
      { name: "Toxina botulínica (Botox)", price: 1800 },
      { name: "Preenchimento facial", price: 2200 },
      { name: "Biópsia de pele", price: 480 },
    ] },
  { id: "cardio", name: "Cardiologia", desc: "Saúde do coração", icon: Activity, tone: "blue", iconBg: "bg-blue-50", iconText: "text-blue-600",
    services: [
      { name: "Consulta cardiológica", price: 450 },
      { name: "Eletrocardiograma (ECG)", price: 160 },
      { name: "Teste ergométrico", price: 380 },
      { name: "Ecocardiograma", price: 520 },
      { name: "Holter 24h", price: 480 },
      { name: "MAPA 24h", price: 360 },
    ] },
  { id: "geral", name: "Clínica Geral", desc: "Acompanhamento", icon: Stethoscope, tone: "slate", iconBg: "bg-slate-100", iconText: "text-slate-700",
    services: [
      { name: "Consulta de rotina", price: 250 },
      { name: "Check-up completo", price: 1100 },
      { name: "Avaliação pré-operatória", price: 320 },
      { name: "Atestados e laudos médicos", price: 180 },
      { name: "Vacinação adulto", price: 220 },
    ] },
  { id: "pedia", name: "Pediatria", desc: "Cuidado infantil", icon: Baby, tone: "amber", iconBg: "bg-amber-50", iconText: "text-amber-600",
    services: [
      { name: "Consulta pediátrica", price: 350 },
      { name: "Puericultura", price: 380 },
      { name: "Vacinação infantil", price: 250 },
      { name: "Acompanhamento de crescimento", price: 320 },
      { name: "Triagem neonatal", price: 420 },
      { name: "Orientação nutricional", price: 300 },
    ] },
  { id: "nutro", name: "Nutrologia", desc: "Performance", icon: Apple, tone: "indigo", iconBg: "bg-indigo-50", iconText: "text-indigo-600",
    services: [
      { name: "Avaliação nutrológica", price: 500 },
      { name: "Bioimpedância corporal", price: 200 },
      { name: "Plano alimentar personalizado", price: 480 },
      { name: "Suplementação e vitaminas", price: 420 },
      { name: "Acompanhamento de emagrecimento", price: 550 },
      { name: "Nutrição esportiva", price: 600 },
    ] },
];

const professionals = [
  { id: "bea", name: "Dra. Beatriz Mendes", crm: "CRM 123456-SP", reviews: 142, rating: 4.9, img: doctorBeatriz, specialtyIds: ["dermato", "geral", "pedia"] },
  { id: "ric", name: "Dr. Ricardo Fontes", crm: "CRM 789012-SP", reviews: 89, rating: 4.8, img: doctorRicardo, specialtyIds: ["cardio", "geral", "nutro"] },
  { id: "ana", name: "Dra. Ana Salgado", crm: "CRO 345678-SP", reviews: 211, rating: 5.0, img: doctorBeatriz, specialtyIds: ["odonto"] },
  { id: "lui", name: "Dr. Luiz Tavares", crm: "CRM 654321-SP", reviews: 67, rating: 4.7, img: doctorRicardo, specialtyIds: ["nutro", "geral"] },
];

const days = [
  { d: 22, dow: "Seg", disabled: true },
  { d: 23, dow: "Ter", disabled: true },
  { d: 24, dow: "Qua", disabled: true },
  { d: 25, dow: "Qui", disabled: true },
  { d: 26, dow: "Sex", disabled: false },
  { d: 27, dow: "Sáb", disabled: false },
  { d: 28, dow: "Dom", disabled: false },
];

const slots = ["08:30", "09:15", "10:00", "11:30", "14:00", "15:45", "16:30", "17:15"];

function Index() {
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [service, setService] = useState<string | null>(null);
  const [professional, setProfessional] = useState<string | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const selectedSpec = specialty ? specialties.find((s) => s.id === specialty)! : null;
  const selectedService = selectedSpec && service ? selectedSpec.services.find((sv) => sv.name === service) ?? null : null;
  const selectedProf = professional ? professionals.find((p) => p.id === professional)! : null;
  const filteredProfs = specialty
    ? professionals.filter((p) => p.specialtyIds.includes(specialty))
    : [];

  const handleSpecialty = (id: string) => {
    setSpecialty(id);
    setService(null);
    setProfessional(null);
    setDay(null);
    setSlot(null);
  };
  const handleService = (name: string) => {
    setService(name);
    setProfessional(null);
    setDay(null);
    setSlot(null);
  };
  const handleProfessional = (id: string) => {
    setProfessional(id);
    setDay(null);
    setSlot(null);
  };
  const handleDay = (d: number) => {
    setDay(d);
    setSlot(null);
  };

  const canConfirm = !!(specialty && service && professional && day && slot);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-50 text-slate-900 antialiased selection:bg-teal-100">
      {/* Atmospheric background */}
      <div aria-hidden className="pointer-events-none fixed -top-32 -right-32 -z-10 h-[520px] w-[520px] rounded-full bg-teal-400/10 blur-[120px]" />
      <div aria-hidden className="pointer-events-none fixed -bottom-32 -left-32 -z-10 h-[520px] w-[520px] rounded-full bg-indigo-400/10 blur-[120px]" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(15 23 42 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(15 23 42 / 0.06) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at top, black 30%, transparent 70%)",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <a href="#" className="group flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/30 transition-transform group-hover:rotate-6">
              <div className="size-3.5 rounded-sm rotate-45 bg-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">Ânima Clínica</span>
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#agendar" className="text-sm font-medium text-slate-600 transition-colors hover:text-teal-600">Especialidades</a>
            <a href="#agendar" className="text-sm font-medium text-slate-600 transition-colors hover:text-teal-600">Profissionais</a>
            <a href="#convenios" className="text-sm font-medium text-slate-600 transition-colors hover:text-teal-600">Convênios</a>
            <a
              href="#agendar"
              className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 active:scale-[0.97]"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-teal-400" />
              </span>
              Agendar consulta
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="mx-auto max-w-7xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 backdrop-blur">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Mais de 12.000 consultas agendadas em 2026
          </span>
          <h1 className="mt-6 max-w-[18ch] text-balance text-5xl font-bold leading-[1.05] tracking-tight text-slate-900 md:text-7xl">
            Cuidado de saúde focado na sua{" "}
            <span className="bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              longevidade.
            </span>
          </h1>
          <p className="mt-6 max-w-[56ch] text-pretty text-lg leading-relaxed text-slate-500">
            Agende consultas presenciais ou telemedicina com especialistas renomados. Um ecossistema de saúde completo, do diagnóstico ao tratamento.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href="#agendar"
              className="group inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-7 py-4 text-sm font-semibold text-white shadow-xl shadow-slate-900/10 transition-all hover:bg-slate-800"
            >
              Ver horários hoje
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#convenios"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-teal-500 hover:text-teal-700"
            >
              Nossos serviços
            </a>
          </div>

          {/* Trust strip */}
          <div className="mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, label: "Médicos certificados", sub: "Verificação CRM/CRO" },
              { icon: Clock, label: "Confirmação em 2 min", sub: "Sem fila de espera" },
              { icon: Video, label: "Telemedicina", sub: "Atendimento online seguro" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-3 backdrop-blur">
                <div className="grid size-9 place-items-center rounded-xl bg-teal-50 text-teal-600">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking */}
      <section id="agendar" className="px-6 pb-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="space-y-14 lg:col-span-8">
            {/* Step 1 */}
            <div>
              <StepHeader n="01" label="Escolha a especialidade" hint="Comece selecionando o cuidado desejado" active />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {specialties.map((s) => {
                  const Icon = s.icon;
                  const active = specialty === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSpecialty(s.id)}
                      className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-0.5 ${
                        active
                          ? "border-teal-500 bg-white shadow-xl shadow-teal-500/10"
                          : "border-slate-200/70 bg-white hover:border-teal-400 hover:shadow-xl hover:shadow-teal-500/5"
                      }`}
                    >
                      {active && (
                        <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-teal-600 text-white shadow-md shadow-teal-600/30">
                          <Check className="size-3.5" strokeWidth={3} />
                        </span>
                      )}
                      <div className={`mb-4 grid size-11 place-items-center rounded-xl ${s.iconBg} ${s.iconText} transition-transform group-hover:scale-110`}>
                        <Icon className="size-5" />
                      </div>
                      <h3 className="font-bold text-slate-900">{s.name}</h3>
                      <p className="mt-0.5 text-sm text-slate-500">{s.desc}</p>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                        <span className="text-slate-400">A partir de</span>
                        <span className="font-bold text-slate-700">R$ {Math.min(...s.services.map((sv) => sv.price))}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedSpec && (
                <div className="mt-5 animate-in fade-in slide-in-from-top-2 duration-300 rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50/80 to-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`grid size-8 place-items-center rounded-lg ${selectedSpec.iconBg} ${selectedSpec.iconText}`}>
                      <selectedSpec.icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-teal-700">Selecione o serviço</p>
                      <p className="text-sm font-semibold text-slate-900">{selectedSpec.name} · valores de referência do mercado</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {selectedSpec.services.map((srv) => {
                      const active = service === srv.name;
                      return (
                        <button
                          key={srv.name}
                          onClick={() => handleService(srv.name)}
                          className={`group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                            active
                              ? "bg-teal-600 text-white shadow-md shadow-teal-600/30 ring-1 ring-teal-600"
                              : "bg-white/80 text-slate-700 ring-1 ring-slate-200/70 hover:bg-white hover:ring-teal-300"
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <Check className={`size-4 shrink-0 ${active ? "text-white" : "text-teal-600"}`} strokeWidth={3} />
                            <span className="truncate font-medium">{srv.name}</span>
                          </span>
                          <span className={`shrink-0 text-xs font-bold ${active ? "text-white" : "text-slate-900"}`}>
                            R$ {srv.price}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2 */}
            {service && (
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                <StepHeader n="02" label="Selecione o profissional" hint={`${filteredProfs.length} profissionais para ${selectedSpec?.name}`} active />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredProfs.map((p) => {
                    const active = professional === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleProfessional(p.id)}
                        className={`group flex items-start gap-4 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                          active
                            ? "border-teal-500 bg-white shadow-xl shadow-teal-500/10"
                            : "border-slate-200/70 bg-white hover:border-teal-400 hover:shadow-xl hover:shadow-teal-500/5"
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={p.img}
                            alt={p.name}
                            loading="lazy"
                            width={72}
                            height={72}
                            className="size-[72px] shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                          />
                          <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
                            <Check className="size-3" strokeWidth={3} />
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.crm}</p>
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5">
                            <Star className="size-3 fill-amber-500 text-amber-500" />
                            <span className="text-xs font-semibold text-amber-700">{p.rating.toFixed(1)}</span>
                            <span className="text-[10px] text-amber-700/70">({p.reviews})</span>
                          </div>
                        </div>
                        {active && (
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-teal-600 text-white">
                            <Check className="size-3.5" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3 */}
            {professional && (
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                <StepHeader n="03" label="Horários disponíveis" hint="Selecione data e horário" active />
                <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Maio</p>
                      <p className="text-lg font-bold text-slate-800">2026</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-teal-600">
                        <ChevronLeft className="size-4" />
                      </button>
                      <button className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-teal-600">
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-2 grid grid-cols-7 gap-2 text-center">
                    {days.map((dd) => (
                      <span key={dd.dow} className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {dd.dow}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {days.map((dd) => {
                      const active = day === dd.d;
                      return (
                        <button
                          key={dd.d}
                          disabled={dd.disabled}
                          onClick={() => handleDay(dd.d)}
                          className={`aspect-square rounded-xl text-sm font-medium transition-all ${
                            dd.disabled
                              ? "cursor-not-allowed text-slate-300"
                              : active
                              ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {dd.d}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className={`mt-6 border-t border-slate-100 pt-6 transition-opacity ${
                      day ? "opacity-100" : "pointer-events-none opacity-40"
                    }`}
                  >
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                      {day ? `Horários para ${day} de Maio` : "Selecione um dia"}
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {slots.map((t) => {
                        const active = slot === t;
                        return (
                          <button
                            key={t}
                            onClick={() => setSlot(t)}
                            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                              active
                                ? "border-teal-600 bg-teal-600 text-white shadow-md shadow-teal-500/30"
                                : "border-slate-200 bg-white text-slate-700 hover:border-teal-400 hover:text-teal-700"
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <aside className="lg:col-span-4">
            <div className="sticky top-28 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-2xl shadow-slate-300/30">
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-7 py-6 text-white">
                <div className="absolute -right-10 -top-10 size-40 rounded-full bg-teal-500/30 blur-2xl" />
                <p className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">Sua reserva</p>
                <h3 className="relative mt-1 text-lg font-bold">Resumo do agendamento</h3>
              </div>

              <div className="space-y-4 px-7 py-6">
                <Row label="Especialidade" value={selectedSpec?.name ?? "—"} muted={!selectedSpec} />
                <Row label="Serviço" value={selectedService?.name ?? "—"} muted={!selectedService} />
                <Row label="Profissional" value={selectedProf?.name ?? "—"} muted={!selectedProf} />
                <Row
                  label="Data e hora"
                  value={day && slot ? `${day} Mai, ${slot}` : "—"}
                  muted={!(day && slot)}
                />
                <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-teal-700">Valor total</span>
                  <span className="text-2xl font-bold text-teal-700">
                    {selectedService ? `R$ ${selectedService.price}` : "—"}
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  <Field label="Nome completo" placeholder="Como está no RG" type="text" />
                  <Field label="Celular / WhatsApp" placeholder="(11) 99999-9999" type="tel" />
                </div>

                <button
                  disabled={!canConfirm}
                  className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-600 hover:to-emerald-700 hover:shadow-xl active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-none disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                >
                  Confirmar Agendamento
                  <ArrowRight className="size-4 transition-transform group-enabled:group-hover:translate-x-1" />
                </button>
                <p className="text-center text-[10px] leading-relaxed text-slate-400">
                  Ao confirmar, você aceita nossos termos de uso e política de privacidade.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Insurances */}
      <section id="convenios" className="border-y border-slate-200/70 bg-white py-16 px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center">
          <span className="mb-10 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Convênios aceitos
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-6 opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0">
            {["Unimed", "Bradesco Saúde", "SulAmérica", "Amil", "Porto Seguro"].map((b) => (
              <span key={b} className="text-lg font-bold tracking-tight text-slate-700">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 px-6 pt-20 pb-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            <div>
              <div className="mb-4 flex items-center gap-2.5">
                <div className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600">
                  <div className="size-2.5 rounded-sm rotate-45 bg-white" />
                </div>
                <span className="text-base font-bold tracking-tight text-slate-800">Ânima Clínica</span>
              </div>
              <p className="max-w-[32ch] text-sm leading-relaxed text-slate-500">
                Transformando a experiência de saúde através de dados, cuidado humano e eficiência tecnológica.
              </p>
            </div>
            <div>
              <h4 className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-800">Localização</h4>
              <p className="text-sm leading-relaxed text-slate-500">
                Av. Brigadeiro Faria Lima, 2000<br />
                Jardim Paulistano, São Paulo - SP
              </p>
            </div>
            <div>
              <h4 className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-800">Contato</h4>
              <p className="text-sm leading-relaxed text-slate-500">
                contato@animaclinica.com.br<br />
                +55 11 4003-0000
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 md:flex-row">
            <span className="text-xs text-slate-400">© 2026 Ânima Clínica de Saúde. Todos os direitos reservados.</span>
            <div className="flex gap-6">
              <a href="#" className="text-xs font-medium text-slate-500 transition-colors hover:text-teal-600">Privacidade</a>
              <a href="#" className="text-xs font-medium text-slate-500 transition-colors hover:text-teal-600">Termos</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepHeader({
  n,
  label,
  hint,
  active,
}: {
  n: string;
  label: string;
  hint?: string;
  active: boolean;
}) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span
        className={`grid size-11 place-items-center rounded-2xl text-sm font-bold transition-colors ${
          active
            ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {n}
      </span>
      <div>
        <h2 className={`text-xl font-bold tracking-tight ${active ? "text-slate-800" : "text-slate-400"}`}>
          {label}
        </h2>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-right text-sm font-semibold ${muted ? "text-slate-400" : "text-slate-800"}`}>
        {value}
      </span>
    </div>
  );
}

function Field({ label, placeholder, type }: { label: string; placeholder: string; type: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
      />
    </div>
  );
}
