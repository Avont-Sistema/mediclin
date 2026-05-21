import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Stripe from "stripe";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { subscriptions, users } from "../db/schema";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurado");
  return new Stripe(key);
}

// ─── Checkout (nova assinatura) ───────────────────────────────────────────────

export const createCheckoutSession = createServerFn({ method: "POST" })
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

    const priceId =
      data.plan === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_CLINIC;
    if (!priceId) throw new Error(`STRIPE_PRICE_${data.plan.toUpperCase()} não configurado`);

    const stripe = getStripe();

    // Garantir que o Stripe Customer existe
    let customerId = professional.subscription?.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userRecord!.email,
        name: professional.nomeCompleto,
        metadata: { professionalId: professional.id },
      });
      customerId = customer.id;

      // Persiste o customerId antes do redirect (onConflict mantém linha de trial existente)
      await db
        .insert(subscriptions)
        .values({
          professionalId: professional.id,
          stripeCustomerId: customerId,
          plano: "free",
          status: "trial",
          trialFimEm: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        })
        .onConflictDoUpdate({
          target: subscriptions.professionalId,
          set: { stripeCustomerId: customerId, atualizadoEm: new Date() },
        });
    }

    const origin = new URL(getWebRequest().url).origin;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?subscription=success`,
      cancel_url: `${origin}/dashboard`,
      metadata: { professionalId: professional.id, plan: data.plan },
      subscription_data: {
        metadata: { professionalId: professional.id },
      },
    });

    return { url: session.url! };
  });

// ─── Customer Portal (gerenciar assinatura existente) ─────────────────────────

export const createCustomerPortalSession = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) throw new Error("Não autenticado");

  const userRecord = await db.query.users.findFirst({
    where: eq(users.clerkId, auth.userId),
    with: { professional: { with: { subscription: true } } },
  });

  const customerId = userRecord?.professional?.subscription?.stripeCustomerId;
  if (!customerId) throw new Error("Sem conta Stripe. Assine um plano primeiro.");

  const stripe = getStripe();
  const origin = new URL(getWebRequest().url).origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/dashboard`,
  });

  return { url: session.url };
});
