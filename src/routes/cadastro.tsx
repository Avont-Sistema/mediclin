import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

// Redirect transparente: /cadastro?ref=CODIGO → /onboarding?ref=CODIGO
// Links antigos já distribuídos continuam funcionando.
export const Route = createFileRoute("/cadastro")({
  validateSearch: z.object({ ref: z.string().optional() }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/onboarding", search: { ref: search.ref } });
  },
  component: () => null,
});
