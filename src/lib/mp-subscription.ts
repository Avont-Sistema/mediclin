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

    return { url: result.init_point! };
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
