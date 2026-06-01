import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { appointments, payments, plans, subscriptions, professionals } from "../db/schema";
import { sendBookingConfirmation, sendNewBookingNotification } from "../lib/email";
import { getMPAccessToken, getMPWebhookSecret } from "../lib/integrations";
import { planToTier } from "../lib/plans";

// ─── Tipos mínimos para as respostas da API do MP ────────────────────────────

type MPPayment = {
  id: number;
  status: string;
  external_reference: string;
  transaction_amount: number;
  collector_id: number;
};

type MPPreApproval = {
  id: string;
  status: "authorized" | "paused" | "cancelled" | "pending" | string;
  payer_id: number;
  external_reference: string;
  preapproval_plan_id: string;
};

async function fetchMP<T>(path: string, accessToken: string): Promise<T | null> {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

// ─── Validação de assinatura (x-signature) ───────────────────────────────────
// Só é exigida quando o webhook secret está configurado no admin. Sem secret,
// a validação é pulada (permite testar antes de configurar a assinatura).
// Manifesto MP: id:<data.id>;request-id:<x-request-id>;ts:<ts>;

function isValidSignature(request: Request, secret: string, dataId: string): boolean {
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id") ?? "";
  if (!signature) return false;

  const parts: Record<string, string> = {};
  for (const segment of signature.split(",")) {
    const [k, v] = segment.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const computed = createHmac("sha256", secret).update(manifest).digest("hex");
  return computed === v1;
}

// ─── Handler principal do webhook ────────────────────────────────────────────

export async function handleMPWebhook(request: Request): Promise<Response> {
  const accessToken = await getMPAccessToken();
  if (!accessToken)
    return new Response("Mercado Pago não configurado (Admin → Integrações)", { status: 500 });

  let body: { type?: string; action?: string; data?: { id?: string } };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("Body inválido", { status: 400 });
  }

  const type = body.type ?? "";
  const resourceId = body.data?.id ?? "";
  if (!resourceId) return new Response("OK", { status: 200 });

  // ── Validação de assinatura (quando configurada) ──────────────────────────
  const webhookSecret = await getMPWebhookSecret();
  if (webhookSecret && !isValidSignature(request, webhookSecret, resourceId)) {
    return new Response("Assinatura inválida", { status: 401 });
  }

  // ── Pagamento de consulta ─────────────────────────────────────────────────

  if (type === "payment") {
    const payment = await fetchMP<MPPayment>(`/v1/payments/${resourceId}`, accessToken);
    if (!payment) return new Response("OK", { status: 200 });

    if (payment.status === "approved" && payment.external_reference) {
      const appointmentId = payment.external_reference;
      const valorStr = String(payment.transaction_amount);

      const appt = await db.query.appointments.findFirst({
        where: eq(appointments.id, appointmentId),
      });

      if (appt) {
        await db
          .update(appointments)
          .set({
            status: "confirmado",
            valorPago: valorStr,
            mpPaymentId: String(payment.id),
          })
          .where(eq(appointments.id, appointmentId));

        await db.insert(payments).values({
          appointmentId,
          professionalId: appt.professionalId,
          mpPaymentId: String(payment.id),
          valorBruto: valorStr,
          taxaPlataforma: "0",
          valorLiquido: valorStr,
          status: "pago",
        });

        // Envia e-mail de confirmação ao paciente
        try {
          const full = await db.query.appointments.findFirst({
            where: eq(appointments.id, appointmentId),
            with: {
              patient: true,
              service: true,
              professional: {
                with: { user: true },
              },
            },
          });

          if (full) {
            // E-mail ao paciente
            await sendBookingConfirmation({
              patientName: full.patient.nome,
              patientEmail: full.patient.email,
              professionalName: full.professional.nomeCompleto,
              serviceName: full.service.nome,
              appointmentStart: full.inicio,
              valor: valorStr,
            });

            // E-mail ao profissional
            if (full.professional.user?.email) {
              await sendNewBookingNotification({
                professionalEmail: full.professional.user.email,
                professionalName: full.professional.nomeCompleto,
                patientName: full.patient.nome,
                serviceName: full.service.nome,
                appointmentStart: full.inicio,
                valor: valorStr,
              });
            }
          }
        } catch (emailErr) {
          // Falha no e-mail não deve travar o webhook
          console.error("[webhook] Erro ao enviar e-mails pós-pagamento:", emailErr);
        }
      }
    }
  }

  // ── Assinatura (preapproval) ──────────────────────────────────────────────

  if (type === "subscription_preapproval" || type === "preapproval") {
    const preApproval = await fetchMP<MPPreApproval>(`/preapproval/${resourceId}`, accessToken);
    if (!preApproval || !preApproval.external_reference) return new Response("OK", { status: 200 });

    // external_reference do checkout novo: { professionalId, planId } (UUID).
    // Compat: aceita também o formato legado { professionalId, plan } (tier).
    let refData: { professionalId?: string; planId?: string; plan?: string };
    try {
      refData = JSON.parse(preApproval.external_reference) as typeof refData;
    } catch {
      return new Response("OK", { status: 200 });
    }

    const { professionalId, planId } = refData;
    if (!professionalId) return new Response("OK", { status: 200 });

    // Resolve o tier (plano grosseiro) a partir do plano dinâmico ou do legado.
    let tier: "free" | "pro" | "clinic" = "pro";
    if (planId) {
      const plan = await db.query.plans.findFirst({ where: eq(plans.id, planId) });
      if (plan) tier = planToTier(plan);
    } else if (refData.plan === "pro" || refData.plan === "clinic" || refData.plan === "free") {
      tier = refData.plan;
    }

    let newStatus: "ativa" | "cancelada" | "inadimplente" | "trial" = "ativa";
    if (preApproval.status === "cancelled") newStatus = "cancelada";
    else if (preApproval.status === "paused") newStatus = "inadimplente";
    else if (preApproval.status === "pending") newStatus = "trial";

    // Próximo vencimento: +1 mês a partir de agora (assinatura mensal).
    const periodoFim = new Date();
    periodoFim.setMonth(periodoFim.getMonth() + 1);

    await db
      .update(subscriptions)
      .set({
        status: newStatus,
        mpCustomerId: String(preApproval.payer_id),
        plano: tier,
        ...(planId ? { planId } : {}),
        ...(newStatus === "ativa" ? { periodoFimEm: periodoFim } : {}),
        atualizadoEm: new Date(),
      })
      .where(eq(subscriptions.mpSubscriptionId, preApproval.id));

    if (newStatus === "ativa") {
      await db
        .update(professionals)
        .set({ plano: tier })
        .where(eq(professionals.id, professionalId));
    } else if (newStatus === "cancelada") {
      await db
        .update(professionals)
        .set({ plano: "free" })
        .where(eq(professionals.id, professionalId));
    }
  }

  return new Response("OK", { status: 200 });
}
