/**
 * Rota de preview do onboarding — SEM autenticação, dados de exemplo.
 * Acessível em /onboarding/preview para demonstração interna.
 * Remover antes do go-live se quiser.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import { InstagramSimulator } from "../components/InstagramSimulator";

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

