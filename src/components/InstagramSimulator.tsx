import { useState } from "react";
import { Check, GraduationCap, MessageCircle, MapPin, Award, Instagram, Grid3x3 } from "lucide-react";
import { buildPublicUrl } from "../lib/subdomain";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  nome: string;
  especialidade: string;
  slug: string;
  uf?: string;
}

// ─── Fake Instagram grid colors ───────────────────────────────────────────────

const GRID_COLORS = [
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

// ─── Component ────────────────────────────────────────────────────────────────

export function InstagramSimulator({ nome, especialidade, slug, uf }: Props) {
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

  // Headline: "Cuidado de saúde com Cardiologia."
  // Last word gets teal color
  const headlineWords = `Cuidado de saúde com ${especialidade || "Especialidade"}.`.split(" ");
  const headlineStart = headlineWords.slice(0, -1).join(" ");
  const headlineEnd = headlineWords[headlineWords.length - 1];

  // Info cards matching actual public page
  const infoCards = [
    { icon: GraduationCap, title: "Especialização:", value: especialidade || "—" },
    { icon: Award,         title: "Registro:",       value: `CRM${uf ? ` · ${uf}` : ""}` },
    { icon: MessageCircle, title: "Fale comigo",      value: "Enviar mensagem" },
    { icon: MapPin,        title: "Consultório",      value: "Localização" },
    { icon: Award,         title: "Médico certificado", value: "CRM 4567..." },
    { icon: Instagram,     title: "Siga no Insta...", value: `@${igUsername}` },
  ];

  return (
    <div className="flex flex-col items-center gap-3">

      {/* ── Phone frame ── */}
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

        {/* ── Instagram view ── */}
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
              {/* Avatar + stats */}
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

              {/* Bio */}
              <div className="mb-2 space-y-0.5">
                <p className="text-[11px] font-black text-slate-900 leading-tight">{nome || "Seu Nome"}</p>
                <p className="text-[10px] text-slate-600">🩺 {especialidade}{uf ? ` · ${uf}` : ""}</p>
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

              {/* Action buttons */}
              <div className="flex gap-1.5">
                <button className="flex-1 bg-slate-100 rounded-lg py-1 text-[10px] font-bold text-slate-800">Seguir</button>
                <button className="flex-1 bg-slate-100 rounded-lg py-1 text-[10px] font-bold text-slate-800">Mensagem</button>
                <button className="bg-slate-100 rounded-lg px-2 py-1">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none stroke-2 text-slate-800"><path d="M6 9l6 6 6-6" /></svg>
                </button>
              </div>
            </div>

            {/* Grid tab */}
            <div className="flex border-t border-slate-200 mb-0.5">
              <button className="flex-1 flex items-center justify-center py-2 border-b-2 border-slate-900">
                <Grid3x3 className="w-3.5 h-3.5 text-slate-900" />
              </button>
            </div>

            {/* Photo grid */}
            <div className="grid grid-cols-3 gap-[1.5px]">
              {GRID_COLORS.map((cls, i) => (
                <div key={i} className={`aspect-square bg-gradient-to-br ${cls}`} />
              ))}
            </div>
          </div>

        ) : (

          /* ── Booking page view — espelho da página pública real ── */
          <div className="bg-white overflow-y-auto" style={{ maxHeight: 480 }}>
            {/* Browser bar */}
            <div className="bg-white border-b border-slate-100 px-3 py-1.5 flex items-center gap-1.5 sticky top-0 z-10">
              <button onClick={() => setShowBooking(false)} className="text-[9px] text-blue-600 font-semibold shrink-0">
                ‹ Instagram
              </button>
              <div className="flex-1 bg-slate-100 rounded-full px-2 py-0.5 overflow-hidden">
                <p className="text-[8px] text-slate-400 truncate text-center">{publicUrl}</p>
              </div>
            </div>

            {/* Profile card */}
            <div className="px-5 pt-5 pb-4 text-center">
              {/* Avatar */}
              <div className="mx-auto mb-2 h-14 w-14 rounded-full bg-teal-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                {initials}
              </div>
              {/* Name */}
              <p className="text-[13px] font-black text-slate-900 leading-tight">{nome || "Seu Nome"}</p>
              {/* Specialty */}
              <p className="text-[10px] text-teal-600 font-semibold mt-0.5">{especialidade}</p>
              {/* Headline */}
              <p className="text-[11px] font-bold text-slate-800 mt-2 leading-snug">
                {headlineStart}{" "}
                <span className="text-teal-600">{headlineEnd}</span>
              </p>
              {/* Bio */}
              <p className="text-[9px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                Especialista em {especialidade.toLowerCase()} com foco em prevenção e qualidade de vida.
              </p>
            </div>

            {/* Info cards grid */}
            <div className="px-3 grid grid-cols-2 gap-1.5 mb-3">
              {infoCards.map((card, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                    <card.icon className="h-3 w-3 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] text-slate-400 truncate leading-none mb-0.5">{card.title}</p>
                    <p className="text-[9px] font-bold text-slate-800 truncate leading-none">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Service selector */}
            <div className="px-3 pb-4">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600">
                  <span className="text-[8px] font-black text-white">01</span>
                </div>
                <span className="text-[10px] text-slate-500">Escolha a especialidade</span>
              </div>
              <p className="text-center text-[8px] text-slate-400 mt-2">
                Preview em tempo real · salve para publicar
              </p>
            </div>
          </div>
        )}

        {/* Home indicator */}
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
