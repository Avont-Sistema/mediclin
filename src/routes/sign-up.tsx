import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "../components/AuthScreen";

export const Route = createFileRoute("/sign-up")({
  head: () => ({
    meta: [{ title: "Criar conta — CuidandoVC" }],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  return <AuthScreen mode="sign-up" />;
}
