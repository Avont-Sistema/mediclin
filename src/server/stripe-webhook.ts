import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { appointments, payments } from "../db/schema";

export async function handleStripeWebhook(request: Request): Promise<Response> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !stripeKey) {
    return new Response("Stripe secrets não configurados", { status: 500 });
  }

  const stripe = new Stripe(stripeKey);
  const body = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return new Response("Webhook signature inválida", { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const { appointmentId, professionalId } = pi.metadata;

    if (appointmentId && professionalId) {
      const valorStr = String(pi.amount / 100);

      await db
        .update(appointments)
        .set({ status: "confirmado", valorPago: valorStr })
        .where(eq(appointments.id, appointmentId));

      await db.insert(payments).values({
        appointmentId,
        professionalId,
        stripePaymentIntentId: pi.id,
        valorBruto: valorStr,
        taxaPlataforma: "0",
        valorLiquido: valorStr,
        status: "pago",
      });
    }
  }

  return new Response("OK", { status: 200 });
}
