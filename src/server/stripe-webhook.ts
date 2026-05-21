import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { appointments, payments, subscriptions, professionals } from "../db/schema";

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

  // ── Pagamento de consulta (Connect) ─────────────────────────────────────────

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

  // ── Assinatura criada via Checkout ────────────────────────────────────────

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === "subscription") {
      const { professionalId, plan } = session.metadata ?? {};
      if (!professionalId || !plan) return new Response("OK", { status: 200 });

      const stripeSubscriptionId = session.subscription as string;
      const stripeCustomerId = session.customer as string;

      const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const item = stripeSub.items.data[0];
      const priceId = item?.price.id ?? null;
      const periodoInicio = item ? new Date(item.current_period_start * 1000) : null;
      const periodoFim = item ? new Date(item.current_period_end * 1000) : null;

      await db
        .insert(subscriptions)
        .values({
          professionalId,
          stripeCustomerId,
          stripeSubscriptionId,
          stripePriceId: priceId,
          plano: plan as "pro" | "clinic",
          status: "ativa",
          trialFimEm: null,
          periodoInicioEm: periodoInicio,
          periodoFimEm: periodoFim,
        })
        .onConflictDoUpdate({
          target: subscriptions.professionalId,
          set: {
            stripeCustomerId,
            stripeSubscriptionId,
            stripePriceId: priceId,
            plano: plan as "pro" | "clinic",
            status: "ativa",
            trialFimEm: null,
            periodoInicioEm: periodoInicio,
            periodoFimEm: periodoFim,
            atualizadoEm: new Date(),
          },
        });

      await db
        .update(professionals)
        .set({ plano: plan as "pro" | "clinic" })
        .where(eq(professionals.id, professionalId));
    }
  }

  // ── Renovação, mudança de plano, inadimplência ────────────────────────────

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const professionalId = sub.metadata?.professionalId;
    if (!professionalId) return new Response("OK", { status: 200 });

    let newStatus: "ativa" | "cancelada" | "inadimplente" | "trial" = "ativa";
    if (sub.status === "canceled") newStatus = "cancelada";
    else if (sub.status === "past_due" || sub.status === "unpaid") newStatus = "inadimplente";
    else if (sub.status === "trialing") newStatus = "trial";

    const updItem = sub.items.data[0];
    await db
      .update(subscriptions)
      .set({
        status: newStatus,
        periodoInicioEm: updItem ? new Date(updItem.current_period_start * 1000) : undefined,
        periodoFimEm: updItem ? new Date(updItem.current_period_end * 1000) : undefined,
        atualizadoEm: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, sub.id));

    if (newStatus === "cancelada") {
      await db
        .update(professionals)
        .set({ plano: "free" })
        .where(eq(professionals.id, professionalId));
    }
  }

  // ── Cancelamento ──────────────────────────────────────────────────────────

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const professionalId = sub.metadata?.professionalId;

    await db
      .update(subscriptions)
      .set({ status: "cancelada", atualizadoEm: new Date() })
      .where(eq(subscriptions.stripeSubscriptionId, sub.id));

    if (professionalId) {
      await db
        .update(professionals)
        .set({ plano: "free" })
        .where(eq(professionals.id, professionalId));
    }
  }

  return new Response("OK", { status: 200 });
}
