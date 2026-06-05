import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { appointments, professionals, users } from "../db/schema";
import { getMPAccessToken, getMPAppCredentials } from "./integrations";
import { getProfessionalPlan } from "./plans";

// Todos os tipos de pagamento do MP. Para deixar SÓ o método escolhido, excluímos
// todos os outros (abordagem allowlist → exclui o complemento).
// account_money (saldo em conta MP) não pode ser excluído no Brasil pela API do MP.
// Nunca inclua na lista de exclusões — simplesmente ignore e deixe disponível.
const ALL_PAYMENT_TYPES = [
  "credit_card",
  "debit_card",
  "prepaid_card",
  "ticket",
  "atm",
  "bank_transfer",
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

// ─── Auth helper ─────────────────────────────────────────────────────────────
// Resolve o ID do profissional da sessão autenticada. Nunca confiar em
// professionalId vindo do cliente para autorização (multi-tenancy).

async function getAuthProfId(): Promise<string> {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) throw new Error("Não autenticado");
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, auth.userId),
    with: { professional: true },
  });
  const profId = user?.professional?.id;
  if (!profId) throw new Error("Profissional não encontrado");
  return profId;
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

    if (!result.init_point) {
      throw new Error(
        "Mercado Pago não retornou URL de checkout. Tente novamente ou contate o suporte.",
      );
    }

    // Persiste o preference ID no agendamento
    await db
      .update(appointments)
      .set({ mpPreferenceId: result.id })
      .where(eq(appointments.id, appt.id));

    return { url: result.init_point };
  });

// ─── Gerar link OAuth para o médico conectar conta MP ────────────────────────

export const createMPOAuthLink = createServerFn({ method: "POST" })
  .inputValidator(z.object({ redirectPath: z.string().optional() }))
  .handler(async ({ data }) => {
    // Profissional vem da sessão — nunca do cliente (evita iniciar OAuth para outro tenant).
    const professionalId = await getAuthProfId();

    const { appId } = await getMPAppCredentials();
    if (!appId) throw new Error("Client ID do Mercado Pago não configurado (Admin → Integrações).");

    const origin = new URL(getWebRequest().url).origin;
    const path = data.redirectPath ?? "/dashboard";
    const redirectUri = encodeURIComponent(`${origin}${path}`);

    const url = `https://auth.mercadopago.com.br/authorization?client_id=${appId}&response_type=code&platform_id=mp&state=${professionalId}&redirect_uri=${redirectUri}`;

    return { url };
  });

// ─── Trocar código OAuth pelo access_token do médico ─────────────────────────

export const activateMPAccount = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string(), redirectPath: z.string().optional() }))
  .handler(async ({ data }) => {
    // Profissional vem da sessão — nunca do cliente. Impede que um médico grave
    // o seu access_token (ou sobrescreva) no registro de outro médico.
    const professionalId = await getAuthProfId();

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
      .where(eq(professionals.id, professionalId));

    return { active: true };
  });

// ─── Verificar se conta MP está ativa (após retorno do OAuth) ─────────────────

export const checkMPAccountStatus = createServerFn({ method: "POST" }).handler(async () => {
  // Profissional vem da sessão — não lê status de outro tenant.
  const professionalId = await getAuthProfId();

  const prof = await db.query.professionals.findFirst({
    where: eq(professionals.id, professionalId),
  });

  // Verifica se o access_token consegue listar payments (conta ativa)
  if (prof?.mpAccessToken) {
    try {
      const res = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${prof.mpAccessToken}` },
      });
      if (res.ok) {
        await db
          .update(professionals)
          .set({ mpAccountAtivo: true })
          .where(eq(professionals.id, professionalId));
        return { active: true };
      }
    } catch {
      // access_token inválido, não atualiza
    }
  }

  return { active: prof?.mpAccountAtivo ?? false };
});

// ─── Preferência combinada para múltiplos agendamentos (carrinho) ────────────

export const createCartMPPreference = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      appointmentIds: z.array(z.string()).min(1),
      metodo: z.enum(["credito", "debito", "pix"]),
    }),
  )
  .handler(async ({ data }) => {
    const apptList = await db.query.appointments.findMany({
      where: inArray(appointments.id, data.appointmentIds),
      with: { patient: true, service: true, professional: true },
    });

    if (apptList.length !== data.appointmentIds.length)
      throw new Error("Um ou mais agendamentos não foram encontrados");

    const prof = apptList[0].professional;
    if (!prof.mpAccessToken) throw new Error("Médico não conectou o Mercado Pago ainda");

    const client = getSellerClient(prof.mpAccessToken);
    const preference = new Preference(client);

    const origin = new URL(getWebRequest().url).origin;
    const { appId } = await getMPAppCredentials();

    const plan = await getProfessionalPlan(prof.id);
    const comissaoPct = plan ? Number(plan.comissaoPct) : 0;
    const totalValor = apptList.reduce((sum, a) => sum + Number(a.service.preco), 0);
    const marketplaceFee = Math.round(totalValor * (comissaoPct / 100) * 100) / 100;

    const result = await preference.create({
      body: {
        items: apptList.map((a) => ({
          id: a.service.id,
          title: a.service.nome,
          quantity: 1,
          unit_price: Number(a.service.preco),
          currency_id: "BRL",
        })),
        payer: { email: apptList[0].patient.email, name: apptList[0].patient.nome },
        back_urls: {
          success: `${origin}/${prof.slug}?booking=success`,
          failure: `${origin}/${prof.slug}?booking=failure`,
          pending: `${origin}/${prof.slug}?booking=pending`,
        },
        auto_return: "approved",
        external_reference: `cart:${data.appointmentIds.join("|")}`,
        notification_url: `${origin}/api/webhooks/mp`,
        payment_methods: { excluded_payment_types: excludedTypesFor(data.metodo) },
        ...(appId && { marketplace: appId, marketplace_fee: marketplaceFee }),
      },
    });

    if (!result.init_point) throw new Error("Mercado Pago não retornou URL de checkout.");

    await db
      .update(appointments)
      .set({ mpPreferenceId: result.id })
      .where(inArray(appointments.id, data.appointmentIds));

    return { url: result.init_point };
  });

// Silencia aviso do lint para MercadoPagoConfig importado mas "não usado"
void getPlatformClient;
