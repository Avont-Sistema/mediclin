import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { subscriptions, users } from "../db/schema";

function getPlatformClient(): MercadoPagoConfig {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
  return new MercadoPagoConfig({ accessToken: token });
}

// ─── Criar assinatura via Preapproval ─────────────────────────────────────────

export const createMPSubscriptionCheckout = createServerFn({ method: "POST" })
  .inputValidator(z.object({ plan: z.enum(["pro", "clinic"]) }))
  .handler(async ({ data }) => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) throw new Error("Não autenticado");

    const userRecord = await db.query.users.findFirst({
      where: eq(users.clerkId, auth.userId),
      with: { professional: { with: { subscription: true } } },
    });

    const professional = userRecord?.professional;
    if (!professional) throw new Error("Profissional não encontrado");

    const planId = data.plan === "pro" ? process.env.MP_PLAN_ID_PRO : process.env.MP_PLAN_ID_CLINIC;
    if (!planId) throw new Error(`MP_PLAN_ID_${data.plan.toUpperCase()} não configurado`);

    const client = getPlatformClient();
    const preApproval = new PreApproval(client);

    const origin = new URL(getWebRequest().url).origin;

    const result = await preApproval.create({
      body: {
        preapproval_plan_id: planId,
        payer_email: userRecord!.email,
        reason: data.plan === "pro" ? "CuidandoVC Pro" : "CuidandoVC Clinic",
        back_url: `${origin}/dashboard?subscription=success`,
        external_reference: JSON.stringify({ professionalId: professional.id, plan: data.plan }),
      },
    });

    // Salva o preapproval_id (será atualizado via webhook quando ativado)
    await db
      .insert(subscriptions)
      .values({
        professionalId: professional.id,
        mpSubscriptionId: result.id,
        mpPlanId: planId,
        plano: data.plan,
        status: "trial",
        trialFimEm:
          professional.subscription?.trialFimEm ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      })
      .onConflictDoUpdate({
        target: subscriptions.professionalId,
        set: {
          mpSubscriptionId: result.id,
          mpPlanId: planId,
          plano: data.plan,
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
