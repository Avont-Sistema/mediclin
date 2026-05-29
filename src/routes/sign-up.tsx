import { SignUp } from "@clerk/tanstack-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-up")({
  head: () => ({
    meta: [{ title: "Criar conta — CuidandoVC" }],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <SignUp routing="path" path="/sign-up" forceRedirectUrl="/onboarding" />
    </div>
  );
}
