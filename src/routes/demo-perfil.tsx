import { createFileRoute } from "@tanstack/react-router";
import { DemoPublicPage } from "../components/DemoPublicPage";

export const Route = createFileRoute("/demo-perfil")({
  head: () => ({
    meta: [
      { title: "Dra. Ana Beatriz Santos — Psicologia Clínica" },
      {
        name: "description",
        content: "Agende sua consulta de psicologia online ou presencial. Demonstração CuidandoVC.",
      },
    ],
  }),
  component: DemoPerfilPage,
});

function DemoPerfilPage() {
  return <DemoPublicPage />;
}
