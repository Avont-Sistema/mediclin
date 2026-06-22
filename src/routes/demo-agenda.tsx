import { createFileRoute } from "@tanstack/react-router";
import { DemoAgendaContent } from "../components/DemoAgendaContent";
import { Rocket, X } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/demo-agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — CuidandoVC Demo" },
      { name: "description", content: "Demonstração da agenda de consultas no CuidandoVC." },
    ],
  }),
  component: DemoAgendaPage,
});

function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="sticky top-0 z-50 bg-amber-400 text-amber-950 px-4 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm font-semibold flex-1 min-w-0">
        <span className="shrink-0">🎯 Modo demonstração</span>
        <span className="hidden sm:inline font-normal text-amber-800">— Dados fictícios para você explorar o painel.</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a href="/sign-up" className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-amber-950 text-amber-50 hover:bg-amber-800 transition">
          <Rocket className="h-3 w-3" />
          Criar minha conta
        </a>
        <button onClick={() => setDismissed(true)} className="grid place-items-center h-6 w-6 rounded text-amber-800 hover:text-amber-950 hover:bg-amber-300 transition" aria-label="Fechar aviso">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function DemoAgendaPage() {
  return (
    <div>
      <DemoBanner />
      <DemoAgendaContent />
    </div>
  );
}
