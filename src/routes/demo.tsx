import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { InstagramSimulator } from "../components/InstagramSimulator";
import { ArrowRight, CalendarCheck, CreditCard, LayoutDashboard, Sparkles } from "lucide-react";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo — CuidandoVC" },
      {
        name: "description",
        content:
          "Experimente como seus pacientes agendariam e pagariam consultas diretamente pelo link na bio.",
      },
    ],
  }),
  component: DemoPage,
});

const STEPS = [
  {
    icon: CalendarCheck,
    color: "bg-teal-50 text-teal-600",
    title: "Paciente clica no link",
    desc: "Direto da bio do Instagram para a sua página de agendamento.",
  },
  {
    icon: CreditCard,
    color: "bg-indigo-50 text-indigo-600",
    title: "Escolhe e paga na hora",
    desc: "Serviço, data, horário e pagamento em menos de 2 minutos.",
  },
  {
    icon: LayoutDashboard,
    color: "bg-emerald-50 text-emerald-600",
    title: "Você vê tudo no painel",
    desc: "Agenda, faturamento e histórico dos pacientes centralizados.",
  },
];

function DemoPage() {
  const navigate = useNavigate();

  function goToPerfil() {
    void navigate({ to: "/demo-perfil" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-indigo-50/40">
      {/* Nav */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="CuidandoVC" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-sm font-semibold tracking-tight">CuidandoVC</span>
          </div>
          <a
            href="/sign-up"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 transition shadow-sm"
          >
            Criar minha conta
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            Demonstração interativa
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — phone */}
          <div className="flex justify-center">
            <InstagramSimulator
              nome="Dra. Ana Beatriz Santos"
              especialidade="Psicologia Clínica"
              slug="dra-ana-beatriz"
              uf="SP"
              onLinkClick={goToPerfil}
            />
          </div>

          {/* Right — copy */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                Veja como seus pacientes{" "}
                <span className="bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent">
                  agendam e pagam
                </span>{" "}
                pelo Instagram
              </h1>
              <p className="text-lg text-slate-500 leading-relaxed">
                Clique no link da bio do Instagram da Dra. Ana Beatriz ao lado e percorra o fluxo
                completo — da primeira visita até o agendamento pago.
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {STEPS.map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div
                    className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${step.color}`}
                  >
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={goToPerfil}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 text-white hover:from-teal-700 hover:to-indigo-700 transition shadow-md hover:shadow-lg"
              >
                Explorar como paciente
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              >
                Quero criar minha conta
              </a>
            </div>

            <p className="text-xs text-slate-400">
              Todos os dados desta demonstração são fictícios. Nenhuma conta ou pagamento real é
              criado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
