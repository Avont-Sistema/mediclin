import { SignIn } from "@clerk/tanstack-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [{ title: "Entrar — CuidandoVC" }],
  }),
  component: SignInPage,
});

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <SignIn routing="path" path="/sign-in" forceRedirectUrl="/onboarding" />
    </div>
  );
}
