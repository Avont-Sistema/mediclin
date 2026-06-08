import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { plans, subscriptions, users } from "../db/schema";
import { getMPAccessToken } from "./integrations";
import { planToTier } from "./plans";

async function getPlatformClient(): Promise<MercadoPagoConfig> {
  const token = await getMPAccessToken();
  if (!token)
    throw new Error(
      "Mercado Pago não configurado. Adicione o Access Token em Admin → Integrações.",
    );
  return new MercadoPagoConfig({ accessToken: token });
}

// ─── Criar assinatura via Preapproval (preço inline, plano dinâmico) ──────────
// Aceita o id de QUALQUER plano ativo criado no admin. Cria um preapproval com
// auto_recurring (transaction_amount = preço do plano) — sem precisar pré-criar
// planos no painel do Mercado Pago. Novos pacotes funcionam automaticamente.

export const createMPSubscriptionCheckout = createServerFn({ method: "POST" })
  .inputValidator(z.object({ planId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) throw new Error("Não autenticado");

    const userRecord = await db.query.users.findFirst({
      where: eq(users.clerkId, auth.userId),
      with: { professional: { with: { subscription: true } } },
    });

    const professional = userRecord?.professional;
    if (!professional) throw new Error("Profissional não encontrado");

    const plan = await db.query.plans.findFirst({
      where: eq(plans.id, data.planId),
    });
    if (!plan || !plan.ativo) throw new Error("Plano indisponível");

    const valor = Number(plan.precoMensal);
    const tier = planToTier(plan);

    // Plano grátis: ativa direto, sem cobrança no Mercado Pago.
    if (valor <= 0) {
      const trialFim = new Date(Date.now() + plan.trialDias * 24 * 60 * 60 * 1000);
      await db
        .insert(subscriptions)
        .values({
          professionalId: professional.id,
          planId: plan.id,
          plano: tier,
          status: "trial",
          trialFimEm: professional.subscription?.trialFimEm ?? trialFim,
        })
        .onConflictDoUpdate({
          target: subscriptions.professionalId,
          set: { planId: plan.id, plano: tier, atualizadoEm: new Date() },
        });
      const origin = new URL(getWebRequest().url).origin;
      return { url: `${origin}/dashboard?subscription=success` };
    }

    const client = await getPlatformClient();
    const preApproval = new PreApproval(client);

    const origin = new URL(getWebRequest().url).origin;

    const result = await preApproval.create({
      body: {
        reason: `CuidandoVC ${plan.nome}`,
        payer_email: userRecord!.email,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: valor,
          currency_id: "BRL",
        },
        back_url: `${origin}/dashboard?subscription=success`,
        status: "pending",
        external_reference: JSON.stringify({ professionalId: professional.id, planId: plan.id }),
      },
    });

    if (!result.init_point) {
      throw new Error(
        "Mercado Pago não retornou URL de checkout. Tente novamente ou contate o suporte.",
      );
    }

    // Salva o preapproval_id (será atualizado via webhook quando ativado)
    await db
      .insert(subscriptions)
      .values({
        professionalId: professional.id,
        mpSubscriptionId: result.id,
        planId: plan.id,
        plano: tier,
        status: "trial",
        trialFimEm:
          professional.subscription?.trialFimEm ??
          new Date(Date.now() + plan.trialDias * 24 * 60 * 60 * 1000),
      })
      .onConflictDoUpdate({
        target: subscriptions.professionalId,
        set: {
          mpSubscriptionId: result.id,
          planId: plan.id,
          plano: tier,
          atualizadoEm: new Date(),
        },
      });

    return { url: result.init_point };
  });

// ─── Link para gerenciar assinatura no portal MP ──────────────────────────────
// MP não tem portal centralizado como Stripe; redirecionamos para a conta MP

export const getMPSubscriptionPortalUrl = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) throw new Error("Não autenticado");

  const userRecord = await db.query.users.findFirst({
    where: eq(users.clerkId, auth.userId),
    with: { professional: { with: { subscription: true } } },
  });

  const mpSubscriptionId = userRecord?.professional?.subscription?.mpSubscriptionId;

  // Se tiver o ID, link direto para o preapproval; senão, conta MP geral
  const url = mpSubscriptionId
    ? `https://www.mercadopago.com.br/subscriptions#from-section=menu`
    : "https://www.mercadopago.com.br/subscriptions#from-section=menu";

  return { url };
});

// ─── Detalhes da assinatura (aba "Minha assinatura") ──────────────────────────

export type SubscriptionDetails = {
  status: "ativa" | "cancelada" | "inadimplente" | "trial";
  planoNome: string | null;
  precoMensal: string | null;
  /** "assinante desde" (ISO) */
  assinanteDesde: string | null;
  /** próxima renovação / fim do período pago (ISO) */
  proximaRenovacao: string | null;
  diasComoAssinante: number;
  diasParaRenovar: number;
  cancelada: boolean;
  /** true quando cancelada mas ainda dentro do período pago */
  ativaAteFimDoPeriodo: boolean;
};

export const fetchSubscriptionDetails = createServerFn({ method: "GET" }).handler(
  async (): Promise<SubscriptionDetails | null> => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) return null;

    const userRecord = await db.query.users.findFirst({
      where: eq(users.clerkId, auth.userId),
      with: { professional: { with: { subscription: true } } },
    });
    const sub = userRecord?.professional?.subscription;
    if (!sub) return null;

    let planoNome: string | null = null;
    let precoMensal: string | null = null;
    if (sub.planId) {
      const plan = await db.query.plans.findFirst({ where: eq(plans.id, sub.planId) });
      planoNome = plan?.nome ?? null;
      precoMensal = plan?.precoMensal ?? null;
    }

    const desde = sub.periodoInicioEm ?? sub.criadoEm ?? null;
    const renovacao = sub.periodoFimEm ?? null;
    const dia = 86_400_000;
    const diasComoAssinante = desde
      ? Math.max(0, Math.floor((Date.now() - new Date(desde).getTime()) / dia))
      : 0;
    const diasParaRenovar = renovacao
      ? Math.max(0, Math.ceil((new Date(renovacao).getTime() - Date.now()) / dia))
      : 0;
    const ativaAteFimDoPeriodo =
      sub.status === "cancelada" && !!renovacao && new Date(renovacao).getTime() > Date.now();

    return {
      status: sub.status,
      planoNome,
      precoMensal,
      assinanteDesde: desde ? new Date(desde).toISOString() : null,
      proximaRenovacao: renovacao ? new Date(renovacao).toISOString() : null,
      diasComoAssinante,
      diasParaRenovar,
      cancelada: sub.status === "cancelada",
      ativaAteFimDoPeriodo,
    };
  },
);

// ─── Cancelar assinatura ──────────────────────────────────────────────────────
// Cancela o preapproval no Mercado Pago (não renova mais) e marca a assinatura
// como "cancelada". O médico continua PRO até o fim do período já pago
// (periodoFimEm) — computeAccessLevel trata isso.

export const cancelSubscription = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) throw new Error("Não autenticado");

  const userRecord = await db.query.users.findFirst({
    where: eq(users.clerkId, auth.userId),
    with: { professional: { with: { subscription: true } } },
  });
  const sub = userRecord?.professional?.subscription;
  if (!sub) throw new Error("Assinatura não encontrada");
  if (sub.status === "cancelada") return { ok: true, jaCancelada: true };

  // Cancela no Mercado Pago (para de renovar). Não bloqueia o cancelamento local
  // se a chamada falhar — registramos a intenção do usuário.
  if (sub.mpSubscriptionId) {
    try {
      const client = await getPlatformClient();
      const preApproval = new PreApproval(client);
      await preApproval.update({
        id: sub.mpSubscriptionId,
        body: { status: "cancelled" },
      });
    } catch (err) {
      console.error("[cancelSubscription] Falha ao cancelar no MP:", err);
    }
  }

  await db
    .update(subscriptions)
    .set({ status: "cancelada", atualizadoEm: new Date() })
    .where(eq(subscriptions.professionalId, sub.professionalId));

  return { ok: true, jaCancelada: false };
});
