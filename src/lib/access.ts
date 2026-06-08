import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { users } from "../db/schema";

// ─── Nível de acesso do profissional ──────────────────────────────────────────
// "active" = assinatura paga ativa → acesso total
// "trial"  = em período de teste (ainda dentro da validade) → acesso total
// "free"   = teste encerrado, cancelado, inadimplente ou sem assinatura → bloqueado
//
// No modo "free": a página pública mostra só identidade + cards (sem serviços,
// agenda, pagamento ou checkout) e o painel do médico fica bloqueado, exceto a
// personalização da página pública (identidade e cards).

export type AccessLevel = "active" | "trial" | "free";

type SubLike = { status: string; trialFimEm: Date | string | null } | null | undefined;

/** Função pura (usável no servidor e no cliente). */
export function computeAccessLevel(sub: SubLike): AccessLevel {
  if (!sub) return "free";
  if (sub.status === "ativa") return "active";
  if (sub.status === "trial") {
    const fim = sub.trialFimEm ? new Date(sub.trialFimEm) : null;
    return fim && fim.getTime() > Date.now() ? "trial" : "free";
  }
  // cancelada / inadimplente / qualquer outro
  return "free";
}

/** true quando o profissional está no modo Free (bloqueado). */
export function isFree(level: AccessLevel): boolean {
  return level === "free";
}

// ─── Server function: nível de acesso do médico autenticado ───────────────────

export const fetchMyAccess = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ level: AccessLevel }> => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) return { level: "free" };
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, auth.userId),
      with: { professional: { with: { subscription: true } } },
    });
    return { level: computeAccessLevel(user?.professional?.subscription) };
  },
);
