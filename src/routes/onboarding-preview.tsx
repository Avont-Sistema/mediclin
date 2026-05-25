/**
 * Rota de preview do onboarding — SEM autenticação, dados de exemplo.
 * Acessível em /onboarding/preview para demonstração interna.
 * Remover antes do go-live se quiser.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Stethoscope, Grid3x3 } from "lucide-react";
import { buildPublicUrl } from "../lib/subdomain";

export const Route = createFileRoute("/onboarding-preview")({
  head: () => ({ meta: [{ title: "Preview — Onboarding MediClin" }] }),
  component: OnboardingPreviewPage,
});

// Dados de exemplo
const DEMO = {
  nome: "Dr. João Silva",
  especialidade: "Cardiologista",
  slug: "dr-joao-silva",
  uf: "SP",
};

function OnboardingPreviewPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12 gap-8">
      {/* Header */}
      <div className="text-center">
        <span className="inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700 mb-3">
          Preview interno — Step 4 do Onboarding
        </span>
        <h1 className="text-2xl font-black text-slate-900">Simulador do Instagram</h1>
        <p className="text-sm text-slate-500 mt-1">
          É o que o médico vê no último passo — com os dados que ele preencheu.
        </p>
      </div>

      {/* Simulator */}
      <InstagramSimulator
        nome={DEMO.nome}
        especialidade={DEMO.especialidade}
        slug={DEMO.slug}
        uf={DEMO.uf}
      />

      {/* CTA igual ao real */}
      <div className="w-full max-w-sm">
        <button className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white">
          <Stethoscope className="size-4" /> Quero isso! Criar meu perfil
        </button>
        <p className="text-center text-xs text-slate-400 mt-3">
          14 dias gratuitos · Sem dados bancários agora · Cancele quando quiser
        </p>
      </div>
    </div>
  );
}

// ─── Instagram Simulator (cópia local para o preview) ────────────────────────

function InstagramSimulator({
  nome,
  especialidade,
  slug,
  uf,
}: {
  nome: string;
  especialidade: string;
  slug: string;
  uf?: string;
}) {
  const [showBooking, setShowBooking] = useState(false);

  const initials = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

  const igUsername = slug || "seu-perfil";
  const publicUrl = buildPublicUrl(slug);

  const gridColors = [
    "from-teal-200 to-emerald-300",
    "from-sky-200 to-blue-300",
    "from-violet-200 to-purple-300",
    "from-teal-100 to-cyan-200",
    "from-emerald-200 to-teal-300",
    "from-blue-200 to-indigo-300",
    "from-cyan-200 to-teal-200",
    "from-purple-200 to-violet-300",
    "from-indigo-200 to-blue-300",
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phone frame */}
      <div className="relative w-[230px] rounded-[2.2rem] border-[5px] border-slate-800 bg-white shadow-2xl shadow-slate-400/30 overflow-hidden select-none">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-800 rounded-b-2xl z-10" />

        {/* Status bar */}
        <div className="bg-white pt-6 px-5 pb-1 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-900">9:41</span>
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5 items-end h-3">
              {[2, 3, 4, 3].map((h, i) => (
                <div key={i} className="w-0.5 bg-slate-900 rounded-sm" style={{ height: `${h * 3}px` }} />
              ))}
            </div>
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-slate-900">
              <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 0 0-6 0zm-4-4 2 2a7.074 7.074 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
            </svg>
            <div className="w-5 h-2.5 rounded-sm border border-slate-900 relative">
              <div className="absolute inset-[2px] right-[3px] bg-slate-900 rounded-sm" />
              <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[3px] h-1.5 bg-slate-900 rounded-r-sm" />
            </div>
          </div>
        </div>

        {!showBooking ? (
          <div className="bg-white">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
              <span className="text-[11px] font-black text-slate-900 tracking-tight">{igUsername}</span>
              <div className="flex items-center gap-2 text-slate-800">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                </svg>
              </div>
            </div>

            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative shrink-0">
                  <div className="h-14 w-14 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                    <div className="h-full w-full rounded-full bg-teal-600 flex items-center justify-center text-white font-black text-base">
                      {initials}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-1 justify-around text-center">
                  {[["12", "posts"], ["1.4k", "seguid."], ["312", "seguindo"]].map(([n, l]) => (
                    <div key={l}>
                      <p className="text-[11px] font-black text-slate-900">{n}</p>
                      <p className="text-[9px] text-slate-500">{l}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-2 space-y-0.5">
                <p className="text-[11px] font-black text-slate-900 leading-tight">{nome}</p>
                <p className="text-[10px] text-slate-600">
                  🩺 {especialidade}{uf ? ` · ${uf}` : ""}
                </p>
                <p className="text-[10px] text-slate-600">Agende sua consulta online 👇</p>
              </div>

              {/* Link in bio */}
              <button
                onClick={() => setShowBooking(true)}
                className="w-full text-left bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all rounded-lg px-2.5 py-1.5 mb-2 group"
              >
                <span className="text-[10px] font-bold text-blue-600 group-hover:underline break-all">
                  🔗 {publicUrl}
                </span>
              </button>

              <div className="flex gap-1.5">
                <button className="flex-1 bg-slate-100 rounded-lg py-1 text-[10px] font-bold text-slate-800">Seguir</button>
                <button className="flex-1 bg-slate-100 rounded-lg py-1 text-[10px] font-bold text-slate-800">Mensagem</button>
                <button className="bg-slate-100 rounded-lg px-2 py-1">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none stroke-2 text-slate-800">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex border-t border-slate-200 mb-0.5">
              <button className="flex-1 flex items-center justify-center py-2 border-b-2 border-slate-900">
                <Grid3x3 className="w-3.5 h-3.5 text-slate-900" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-[1.5px]">
              {gridColors.map((cls, i) => (
                <div key={i} className={`aspect-square bg-gradient-to-br ${cls}`} />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 min-h-[380px]">
            <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2">
              <button
                onClick={() => setShowBooking(false)}
                className="text-[10px] text-blue-600 font-semibold"
              >
                ‹ Instagram
              </button>
              <div className="flex-1 bg-slate-100 rounded-full px-2 py-0.5 text-center">
                <span className="text-[9px] text-slate-500 truncate">{publicUrl}</span>
              </div>
            </div>

            <div className="bg-teal-600 px-4 py-4">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-sm shrink-0">
                  {initials}
                </div>
                <div>
                  <p className="text-xs font-black text-white leading-tight">{nome}</p>
                  <p className="text-[10px] text-white/80">{especialidade}{uf ? ` · ${uf}` : ""}</p>
                </div>
              </div>
              <p className="text-[10px] text-white/70 mt-2">Agende sua consulta online</p>
            </div>

            <div className="px-3 pt-3 space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Serviços</p>
              {[
                { nome: "Consulta", dur: "30 min", preco: "R$ 250" },
                { nome: "Retorno", dur: "20 min", preco: "R$ 150" },
              ].map((svc, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-2.5 flex items-center justify-between ${
                    i === 0 ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div>
                    <p className={`text-[11px] font-bold ${i === 0 ? "text-teal-800" : "text-slate-800"}`}>{svc.nome}</p>
                    <p className={`text-[9px] ${i === 0 ? "text-teal-600" : "text-slate-500"}`}>{svc.dur}</p>
                  </div>
                  <span className={`text-[10px] font-bold ${i === 0 ? "text-teal-700" : "text-slate-700"}`}>{svc.preco}</span>
                </div>
              ))}

              <button className="w-full bg-teal-600 text-white text-[11px] font-bold py-2 rounded-xl mt-1">
                Agendar agora →
              </button>
              <p className="text-center text-[9px] text-slate-400 pt-1">
                Pagamento seguro · Confirmação imediata
              </p>
            </div>
          </div>
        )}

        <div className="bg-white flex justify-center pb-2 pt-1">
          <div className="w-16 h-1 bg-slate-800 rounded-full" />
        </div>
      </div>

      {/* Caption */}
      <div className="text-center transition-all duration-300">
        {showBooking ? (
          <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5 justify-center">
            <Check className="size-4" /> É exatamente isso que seu paciente vê!
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            👆 Toque no link para ver sua página de agendamento
          </p>
        )}
      </div>
    </div>
  );
}
