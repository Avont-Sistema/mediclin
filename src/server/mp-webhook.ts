import { createHmac } from "node:crypto";
import { eq, isNotNull } from "drizzle-orm";
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
  try {
    const res = await fetch(`https://api.mercadopago.com${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.error(`[MP webhook] Erro ao buscar ${path}: ${res.status} ${res.statusText}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.error(`[MP webhook] Erro de rede ao buscar ${path}:`, err);
    return null;
  }
}

// Pagamentos de consulta são criados na conta do MÉDICO (seller), então o token
// da plataforma pode não conseguir lê-los. Tenta a plataforma primeiro (assinaturas)
// e, se falhar, itera os tokens dos médicos conectados até encontrar o pagamento.
async function fetchPaymentAnyAccount(
  paymentId: string,
  platformToken: string,
): Promise<MPPayment | null> {
  const viaPlatform = await fetchMP<MPPayment>(`/v1/payments/${paymentId}`, platformToken);
  if (viaPlatform) return viaPlatform;

  const sellers = await db.query.professionals.findMany({
    where: isNotNull(professionals.mpAccessToken),
    columns: { mpAccessToken: true },
  });

  // Tokens únicos (vários médicos podem compartilhar o mesmo, em testes)
  const tokens = Array.from(
    new Set(sellers.map((s) => s.mpAccessToken).filter((t): t is string => !!t)),
  );

  for (const token of tokens) {
    const found = await fetchMP<MPPayment>(`/v1/payments/${paymentId}`, token);
    if (found) {
      console.log(`[MP webhook] Pagamento ${paymentId} encontrado via token do médico`);
      return found;
    }
  }

  return null;
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
  if (!accessToken) {
    console.error("[MP webhook] Access token não configurado");
    return new Response("Mercado Pago não configurado (Admin → Integrações)", { status: 500 });
  }

  let body: { type?: string; action?: string; data?: { id?: string } };
  try {
    body = (await request.json()) as typeof body;
  } catch (err) {
    console.error("[MP webhook] Erro ao parsear JSON:", err);
    return new Response("Body inválido", { status: 400 });
  }

  const type = body.type ?? "";
  const resourceId = body.data?.id ?? "";
  console.log(`[MP webhook] Recebido: tipo=${type}, resourceId=${resourceId}`);
  if (!resourceId) {
    console.warn("[MP webhook] resourceId vazio");
    return new Response("OK", { status: 200 });
  }

  // ── Validação de assinatura (quando configurada) ──────────────────────────
  const webhookSecret = await getMPWebhookSecret();
  if (webhookSecret && !isValidSignature(request, webhookSecret, resourceId)) {
    return new Response("Assinatura inválida", { status: 401 });
  }

  // ── Pagamento de consulta ─────────────────────────────────────────────────

  if (type === "payment") {
    console.log(`[MP webhook] Processando pagamento ${resourceId}`);
    // Tenta plataforma e, se necessário, os tokens dos médicos (pagamento na conta do seller).
    const payment = await fetchPaymentAnyAccount(resourceId, accessToken);
    if (!payment) {
      console.error(`[MP webhook] Não conseguiu buscar pagamento ${resourceId} em nenhuma conta`);
      return new Response("OK", { status: 200 });
    }

    console.log(
      `[MP webhook] Status do pagamento: ${payment.status}, external_reference: ${payment.external_reference}`,
    );

    if (payment.status === "approved" && payment.external_reference) {
      const ref = payment.external_reference;
      // Suporte a carrinho: "cart:id1|id2|id3" ou ID único avulso
      const appointmentIds = ref.startsWith("cart:")
        ? ref.slice(5).split("|").filter(Boolean)
        : [ref];
      const valorStr = String(payment.transaction_amount);

      for (const appointmentId of appointmentIds) {
        const appt = await db.query.appointments.findFirst({
          where: eq(appointments.id, appointmentId),
        });

        console.log(`[MP webhook] Agendamento encontrado: ${!!appt} (id: ${appointmentId})`);

        if (appt) {
          try {
            await db
              .update(appointments)
              .set({
                status: "confirmado",
                valorPago: valorStr,
                mpPaymentId: String(payment.id),
              })
              .where(eq(appointments.id, appointmentId));

            console.log(`[MP webhook] Agendamento ${appointmentId} atualizado para "confirmado"`);

            await db.insert(payments).values({
              appointmentId,
              professionalId: appt.professionalId,
              mpPaymentId: String(payment.id),
              valorBruto: valorStr,
              taxaPlataforma: "0",
              valorLiquido: valorStr,
              status: "pago",
            });

            console.log(`[MP webhook] Pagamento registrado para ${appointmentId}`);

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
                await sendBookingConfirmation({
                  patientName: full.patient.nome,
                  patientEmail: full.patient.email,
                  professionalName: full.professional.nomeCompleto,
                  serviceName: full.service.nome,
                  appointmentStart: full.inicio,
                  valor: valorStr,
                });

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
              console.error("[webhook] Erro ao enviar e-mails pós-pagamento:", emailErr);
            }
          } catch (dbErr) {
            console.error(`[MP webhook] Erro ao atualizar agendamento ${appointmentId}:`, dbErr);
          }
        } else {
          console.warn(`[MP webhook] Agendamento ${appointmentId} não encontrado`);
        }
      }
    } else {
      console.log(`[MP webhook] Pagamento ${resourceId} não aprovado ou sem external_reference`);
    }
  }

  // ── Assinatura (preapproval) ──────────────────────────────────────────────

  if (type === "subscription_preapproval" || type === "preapproval") {
    console.log(`[MP webhook] Processando assinatura ${resourceId}`);
    const preApproval = await fetchMP<MPPreApproval>(`/preapproval/${resourceId}`, accessToken);
    if (!preApproval) {
      console.error(`[MP webhook] Não conseguiu buscar preapproval ${resourceId}`);
      return new Response("OK", { status: 200 });
    }
    if (!preApproval.external_reference) {
      console.warn(`[MP webhook] Preapproval sem external_reference`);
      return new Response("OK", { status: 200 });
    }

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
