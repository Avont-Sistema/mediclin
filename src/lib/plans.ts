import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { plans, subscriptions } from "../db/schema";

// Resolve a linha do plano (tabela plans) que o profissional assina, via
// subscriptions.planId. Retorna null se não houver plano vinculado.
// Reutilizado para taxa (comissaoPct) e métodos de pagamento (teto).
export async function getProfessionalPlan(professionalId: string) {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.professionalId, professionalId),
  });
  if (!sub?.planId) return null;
  return (await db.query.plans.findFirst({ where: eq(plans.id, sub.planId) })) ?? null;
}

// Métodos liberados pelo plano do médico (teto). Sem plano vinculado → todos.
const TODOS_METODOS = ["credito", "debito", "pix", "dinheiro"];
export async function getPlanMetodosPagamento(professionalId: string): Promise<string[]> {
  const plan = await getProfessionalPlan(professionalId);
  return plan?.metodosPagamento ?? TODOS_METODOS;
}

// Planos comerciais visíveis para o médico assinar. Mesma fonte de verdade que
// o admin gerencia (tabela plans) — sem gate de admin: só retorna ativos.

export type PublicPlan = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  precoMensal: string;
  precoAnual: string;
  trialDias: number;
  maxUsuarios: number;
  maxAgendamentosMes: number;
  armazenamentoGb: number;
  comissaoPct: string;
  whatsappIncluso: boolean;
  recursos: string[];
  metodosPagamento: string[];
  ordem: number;
};

export const fetchActivePlans = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicPlan[]> => {
    const rows = await db.query.plans.findMany({
      where: eq(plans.ativo, true),
      orderBy: (p, { asc }) => [asc(p.ordem)],
    });
    return rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      nome: p.nome,
      descricao: p.descricao,
      precoMensal: p.precoMensal,
      precoAnual: p.precoAnual,
      trialDias: p.trialDias,
      maxUsuarios: p.maxUsuarios,
      maxAgendamentosMes: p.maxAgendamentosMes,
      armazenamentoGb: p.armazenamentoGb,
      comissaoPct: p.comissaoPct,
      whatsappIncluso: p.whatsappIncluso,
      recursos: p.recursos ?? [],
      metodosPagamento: p.metodosPagamento ?? [],
      ordem: p.ordem,
    }));
  },
);

/**
 * Mapeia um plano dinâmico (tabela plans) para o enum grosseiro de tier
 * (free/pro/clinic) usado em gating legado. Pago + multiusuário → clinic;
 * pago single → pro; grátis → free.
 */
export function planToTier(plan: {
  precoMensal: string;
  maxUsuarios: number;
}): "free" | "pro" | "clinic" {
  const preco = Number(plan.precoMensal);
  if (preco <= 0) return "free";
  if (plan.maxUsuarios === -1 || plan.maxUsuarios > 1) return "clinic";
  return "pro";
}
