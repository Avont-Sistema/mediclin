import { createFileRoute, notFound } from "@tanstack/react-router";
import { fetchProfessionalBySlug } from "../lib/availability";
import { ProfessionalPublicPage, ProfessionalNotFound } from "../components/ProfessionalPublicPage";

export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => {
    const prof = await fetchProfessionalBySlug({ data: { slug: params.slug } });
    if (!prof) throw notFound();
    return prof;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.nomeCompleto} — Agendar consulta`
          : "CuidandoVC — Agendar consulta",
      },
      ...(loaderData?.bio ? [{ name: "description", content: loaderData.bio }] : []),
    ],
  }),
  notFoundComponent: ProfessionalNotFound,
  component: SlugPage,
});

function SlugPage() {
  const professional = Route.useLoaderData()!;
  return <ProfessionalPublicPage professional={professional} homeUrl={`/${professional.slug}`} />;
}
