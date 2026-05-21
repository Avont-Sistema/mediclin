import { createFileRoute, notFound } from "@tanstack/react-router";
import { fetchProfessionalBySlug } from "../lib/availability";
import { ProfessionalPublicPage, ProfessionalNotFound } from "../components/ProfessionalPublicPage";

export const Route = createFileRoute("/$slug")({
  head: () => ({
    meta: [{ title: "MediClin — Agendar consulta" }],
  }),
  loader: async ({ params }) => {
    const prof = await fetchProfessionalBySlug({ data: { slug: params.slug } });
    if (!prof) throw notFound();
    return prof;
  },
  notFoundComponent: ProfessionalNotFound,
  component: SlugPage,
});

function SlugPage() {
  const professional = Route.useLoaderData()!;
  return <ProfessionalPublicPage professional={professional} homeUrl={`/${professional.slug}`} />;
}
