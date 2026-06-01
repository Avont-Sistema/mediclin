import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { plans } from "../db/schema";

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
