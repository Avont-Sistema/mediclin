import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { appointments, professionals, users } from "../db/schema";
import { getMPAccessToken, getMPAppCredentials } from "./integrations";
import { getProfessionalPlan } from "./plans";

// Todos os tipos de pagamento do MP. Para deixar SÓ o método escolhido, excluímos
// todos os outros (abordagem allowlist → exclui o complemento).
const ALL_PAYMENT_TYPES = [
  "credit_card",
  "debit_card",
  "prepaid_card",
  "ticket",
  "atm",
  "bank_transfer",
  "account_money",
  "digital_currency",
  "digital_wallet",
  "voucher_card",
  "crypto_transfer",
];

// Tipo(s) do MP que cada método nosso permite.
const ALLOWED_TYPES: Record<"credito" | "debito" | "pix", string[]> = {
  credito: ["credit_card"],
  debito: ["debit_card"],
  pix: ["bank_transfer"],
};

function excludedTypesFor(metodo: "credito" | "debito" | "pix") {
  const allowed = ALLOWED_TYPES[metodo];
  return ALL_PAYMENT_TYPES.filter((t) => !allowed.includes(t)).map((id) => ({ id }));
}

async function getPlatformClient(): Promise<MercadoPagoConfig> {
  const token = await getMPAccessToken();
  if (!token)
    throw new Error(
      "Mercado Pago não configurado. Adicione o Access Token em Admin → Integrações.",
    );
  return new MercadoPagoConfig({ accessToken: token });
}

function getSellerClient(accessToken: string): MercadoPagoConfig {
  return new MercadoPagoConfig({ accessToken });
}

// ─── Criar preferência de pagamento (consulta do paciente) ───────────────────

export const createMPPreference = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      appointmentId: z.string(),
      metodo: z.enum(["credito", "debito", "pix"]),
    }),
  )
  .handler(async ({ data }) => {
    const appt = await db.query.appointments.findFirst({
      where: eq(appointments.id, data.appointmentId),
      with: { patient: true, service: true, professional: true },
    });
    if (!appt) throw new Error("Agendamento não encontrado");

    const mpAccessToken = appt.professional.mpAccessToken;
    if (!mpAccessToken) throw new Error("Médico não conectou o Mercado Pago ainda");

    const client = getSellerClient(mpAccessToken);
    const preference = new Preference(client);

    const origin = new URL(getWebRequest().url).origin;
    const { appId } = await getMPAppCredentials();

    // Taxa da plataforma (split) = % de comissão do plano do médico.
    const valor = Number(appt.service.preco);
    const plan = await getProfessionalPlan(appt.professional.id);
    const comissaoPct = plan ? Number(plan.comissaoPct) : 0;
    const marketplaceFee = Math.round(valor * (comissaoPct / 100) * 100) / 100;

    const result = await preference.create({
      body: {
        items: [
          {
            id: appt.service.id,
            title: appt.service.nome,
            quantity: 1,
            unit_price: valor,
            currency_id: "BRL",
          },
        ],
        payer: { email: appt.patient.email, name: appt.patient.nome },
        back_urls: {
          success: `${origin}/${appt.professional.slug}?booking=success`,
          failure: `${origin}/${appt.professional.slug}?booking=failure`,
          pending: `${origin}/${appt.professional.slug}?booking=pending`,
        },
        auto_return: "approved",
        external_reference: appt.id,
        notification_url: `${origin}/api/webhooks/mp`,
        // Restringe o checkout do MP ao método escolhido pelo paciente.
        payment_methods: {
          excluded_payment_types: excludedTypesFor(data.metodo),
        },
        ...(appId && { marketplace: appId, marketplace_fee: marketplaceFee }),
      },
    });

    // Persiste o preference ID no agendamento
    await db
      .update(appointments)
      .set({ mpPreferenceId: result.id })
      .where(eq(appointments.id, appt.id));

    return { url: result.init_point! };
  });

// ─── Gerar link OAuth para o médico conectar conta MP ────────────────────────

export const createMPOAuthLink = createServerFn({ method: "POST" })
  .inputValidator(z.object({ professionalId: z.string(), redirectPath: z.string().optional() }))
  .handler(async ({ data }) => {
    const { appId } = await getMPAppCredentials();
    if (!appId) throw new Error("Client ID do Mercado Pago não configurado (Admin → Integrações).");

    const origin = new URL(getWebRequest().url).origin;
    const path = data.redirectPath ?? "/dashboard";
    const redirectUri = encodeURIComponent(`${origin}${path}`);

    const url = `https://auth.mercadopago.com.br/authorization?client_id=${appId}&response_type=code&platform_id=mp&state=${data.professionalId}&redirect_uri=${redirectUri}`;

    return { url };
  });

// ─── Trocar código OAuth pelo access_token do médico ─────────────────────────

export const activateMPAccount = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ code: z.string(), professionalId: z.string(), redirectPath: z.string().optional() }),
  )
  .handler(async ({ data }) => {
    const { appId: clientId, appSecret: clientSecret } = await getMPAppCredentials();
    if (!clientId || !clientSecret)
      throw new Error("Client ID/Secret do Mercado Pago não configurados (Admin → Integrações).");

    const origin = new URL(getWebRequest().url).origin;
    const path = data.redirectPath ?? "/dashboard";

    const response = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: data.code,
        redirect_uri: `${origin}${path}`,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Falha ao autenticar com Mercado Pago: ${err}`);
    }

    const result = (await response.json()) as { access_token: string; user_id: number };

    await db
      .update(professionals)
      .set({
        mpUserId: String(result.user_id),
        mpAccessToken: result.access_token,
        mpAccountAtivo: true,
      })
      .where(eq(professionals.id, data.professionalId));

    return { active: true };
  });

// ─── Verificar se conta MP está ativa (após retorno do OAuth) ─────────────────

export const checkMPAccountStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ professionalId: z.string() }))
  .handler(async ({ data }) => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) throw new Error("Não autenticado");

    const prof = await db.query.professionals.findFirst({
      where: eq(professionals.id, data.professionalId),
    });

    // Verifica se o access_token consegue listar payments (conta ativa)
    if (prof?.mpAccessToken) {
      try {
        const client = new MercadoPagoConfig({ accessToken: prof.mpAccessToken });
        const res = await fetch("https://api.mercadopago.com/users/me", {
          headers: { Authorization: `Bearer ${prof.mpAccessToken}` },
        });
        if (res.ok) {
          await db
            .update(professionals)
            .set({ mpAccountAtivo: true })
            .where(eq(professionals.id, data.professionalId));
          return { active: true };
        }
      } catch {
        // access_token inválido, não atualiza
      }
    }

    return { active: prof?.mpAccountAtivo ?? false };
  });

// Silencia aviso do lint para MercadoPagoConfig importado mas "não usado"
void getPlatformClient;
