import { eq } from "drizzle-orm";
import { db } from "../db";
import { appointments, payments, subscriptions, professionals } from "../db/schema";
import { sendBookingConfirmation } from "../lib/email";

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

// ─── Handler principal do webhook ────────────────────────────────────────────

export async function handleMPWebhook(request: Request): Promise<Response> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken)
    return new Response("MERCADOPAGO_ACCESS_TOKEN não configurado", { status: 500 });

  let body: { type?: string; action?: string; data?: { id?: string } };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("Body inválido", { status: 400 });
  }

  const type = body.type ?? "";
  const resourceId = body.data?.id ?? "";
  if (!resourceId) return new Response("OK", { status: 200 });

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
              professional: true,
            },
          });

          if (full) {
            await sendBookingConfirmation({
              patientName: full.patient.nome,
              patientEmail: full.patient.email,
              professionalName: full.professional.nomeCompleto,
              serviceName: full.service.nome,
              appointmentStart: full.inicio,
              valor: valorStr,
            });
          }
        } catch (emailErr) {
          // Falha no e-mail não deve travar o webhook
          console.error("[webhook] Erro ao enviar e-mail de confirmação:", emailErr);
        }
      }
    }
  }

  // ── Assinatura (preapproval) ──────────────────────────────────────────────

  if (type === "subscription_preapproval" || type === "preapproval") {
    const preApproval = await fetchMP<MPPreApproval>(`/preapproval/${resourceId}`, accessToken);
    if (!preApproval || !preApproval.external_reference) return new Response("OK", { status: 200 });

    let refData: { professionalId: string; plan: string };
    try {
      refData = JSON.parse(preApproval.external_reference) as typeof refData;
    } catch {
      return new Response("OK", { status: 200 });
    }

    const { professionalId, plan } = refData;

    let newStatus: "ativa" | "cancelada" | "inadimplente" | "trial" = "ativa";
    if (preApproval.status === "cancelled") newStatus = "cancelada";
    else if (preApproval.status === "paused") newStatus = "inadimplente";
    else if (preApproval.status === "pending") newStatus = "trial";

    await db
      .update(subscriptions)
      .set({
        status: newStatus,
        mpCustomerId: String(preApproval.payer_id),
        plano: plan as "pro" | "clinic",
        atualizadoEm: new Date(),
      })
      .where(eq(subscriptions.mpSubscriptionId, preApproval.id));

    if (newStatus === "ativa") {
      await db
        .update(professionals)
        .set({ plano: plan as "pro" | "clinic" })
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
