import Stripe from "stripe";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { appointments, professionals } from "../db/schema";

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurado");
  return new Stripe(key);
}

// Creates a Stripe PaymentIntent on the doctor's connected account
export const createPaymentIntent = createServerFn({ method: "POST" })
  .inputValidator(z.object({ appointmentId: z.string() }))
  .handler(async ({ data }) => {
    const stripe = getStripeClient();

    const appt = await db.query.appointments.findFirst({
      where: eq(appointments.id, data.appointmentId),
      with: { service: true, professional: true },
    });

    if (!appt) throw new Error("Agendamento não encontrado");
    if (!appt.professional.stripeAccountId)
      throw new Error("Profissional sem conta Stripe configurada");

    const amountCents = Math.round(Number(appt.service.preco) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "brl",
      transfer_data: { destination: appt.professional.stripeAccountId },
      metadata: {
        appointmentId: appt.id,
        professionalId: appt.professionalId,
      },
    });

    await db
      .update(appointments)
      .set({ stripePaymentIntentId: paymentIntent.id })
      .where(eq(appointments.id, appt.id));

    return { clientSecret: paymentIntent.client_secret! };
  });

// Creates a Stripe Connect Express onboarding link for the doctor
export const createConnectAccountLink = createServerFn({ method: "POST" })
  .inputValidator(z.object({ professionalId: z.string() }))
  .handler(async ({ data }) => {
    const stripe = getStripeClient();

    const prof = await db.query.professionals.findFirst({
      where: eq(professionals.id, data.professionalId),
    });

    if (!prof) throw new Error("Profissional não encontrado");

    let accountId = prof.stripeAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "BR",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      await db
        .update(professionals)
        .set({ stripeAccountId: accountId })
        .where(eq(professionals.id, data.professionalId));
    }

    const req = getWebRequest();
    const origin = new URL(req.url).origin;

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard?stripe=refresh`,
      return_url: `${origin}/dashboard?stripe=connected`,
      type: "account_onboarding",
    });

    return { url: link.url };
  });

// Marks the professional's Stripe account as active after onboarding
export const activateStripeAccount = createServerFn({ method: "POST" })
  .inputValidator(z.object({ professionalId: z.string() }))
  .handler(async ({ data }) => {
    const stripe = getStripeClient();

    const prof = await db.query.professionals.findFirst({
      where: eq(professionals.id, data.professionalId),
    });

    if (!prof?.stripeAccountId) return { active: false };

    const account = await stripe.accounts.retrieve(prof.stripeAccountId);
    const active = account.charges_enabled && account.payouts_enabled;

    if (active) {
      await db
        .update(professionals)
        .set({ stripeAccountAtivo: true })
        .where(eq(professionals.id, data.professionalId));
    }

    return { active };
  });
