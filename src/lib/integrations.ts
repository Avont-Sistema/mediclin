import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { integrationConfig } from "../db/schema";

// ─── Guard ──────────────────────────────────────────────────────────────────
// Gating por ADMIN_CLERK_IDS pendente (mesmo padrão de saas-admin.ts).

async function requireAdminAccess(): Promise<string> {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) throw new Error("Não autenticado");
  return auth.userId;
}

// ─── Singleton row ────────────────────────────────────────────────────────────

async function getOrCreateConfigRow() {
  const existing = await db.query.integrationConfig.findFirst();
  if (existing) return existing;
  const [created] = await db.insert(integrationConfig).values({}).returning();
  return created;
}

/** Mascara um segredo, mostrando só os últimos 4 caracteres. */
function mask(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 4) return "••••";
  return `${"•".repeat(Math.min(value.length - 4, 24))}${value.slice(-4)}`;
}

// ─── Tipo retornado ao admin (segredos mascarados) ────────────────────────────

export type IntegrationConfigView = {
  mpAmbiente: "test" | "producao";
  mpAtivo: boolean;
  atualizadoEm: string | null;
  // Para cada chave: se está preenchida + preview mascarado (nunca o valor cru)
  mpAccessToken: { configured: boolean; masked: string | null };
  mpPublicKey: { configured: boolean; masked: string | null };
  mpAppId: { configured: boolean; masked: string | null };
  mpAppSecret: { configured: boolean; masked: string | null };
  mpWebhookSecret: { configured: boolean; masked: string | null };
};

export const fetchIntegrationConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<IntegrationConfigView> => {
    await requireAdminAccess();
    const row = await getOrCreateConfigRow();
    return {
      mpAmbiente: (row.mpAmbiente as "test" | "producao") ?? "test",
      mpAtivo: row.mpAtivo,
      atualizadoEm: row.atualizadoEm?.toISOString() ?? null,
      mpAccessToken: { configured: !!row.mpAccessToken, masked: mask(row.mpAccessToken) },
      mpPublicKey: { configured: !!row.mpPublicKey, masked: mask(row.mpPublicKey) },
      mpAppId: { configured: !!row.mpAppId, masked: mask(row.mpAppId) },
      mpAppSecret: { configured: !!row.mpAppSecret, masked: mask(row.mpAppSecret) },
      mpWebhookSecret: { configured: !!row.mpWebhookSecret, masked: mask(row.mpWebhookSecret) },
    };
  },
);

// ─── Atualizar chaves ─────────────────────────────────────────────────────────
// Campos vazios/ausentes são IGNORADOS (não apagam o valor existente). Para
// limpar uma chave, o front envia a string literal "__clear__".

const CLEAR = "__clear__";

const updateInput = z.object({
  mpAmbiente: z.enum(["test", "producao"]).optional(),
  mpAtivo: z.boolean().optional(),
  mpAccessToken: z.string().optional(),
  mpPublicKey: z.string().optional(),
  mpAppId: z.string().optional(),
  mpAppSecret: z.string().optional(),
  mpWebhookSecret: z.string().optional(),
});

/** Resolve um campo de segredo: undefined = mantém, "__clear__" = apaga, resto = novo valor. */
function resolveSecret(input: string | undefined): string | null | undefined {
  if (input === undefined) return undefined; // não mexe
  const trimmed = input.trim();
  if (trimmed === "" || trimmed === CLEAR) return null; // limpa
  return trimmed; // novo valor
}

export const updateIntegrationConfig = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdminAccess();
    const row = await getOrCreateConfigRow();

    const patch: Partial<typeof integrationConfig.$inferInsert> = { atualizadoEm: new Date() };

    if (data.mpAmbiente !== undefined) patch.mpAmbiente = data.mpAmbiente;
    if (data.mpAtivo !== undefined) patch.mpAtivo = data.mpAtivo;

    const at = resolveSecret(data.mpAccessToken);
    if (at !== undefined) patch.mpAccessToken = at;
    const pk = resolveSecret(data.mpPublicKey);
    if (pk !== undefined) patch.mpPublicKey = pk;
    const appId = resolveSecret(data.mpAppId);
    if (appId !== undefined) patch.mpAppId = appId;
    const secret = resolveSecret(data.mpAppSecret);
    if (secret !== undefined) patch.mpAppSecret = secret;
    const webhook = resolveSecret(data.mpWebhookSecret);
    if (webhook !== undefined) patch.mpWebhookSecret = webhook;

    const { eq } = await import("drizzle-orm");
    await db.update(integrationConfig).set(patch).where(eq(integrationConfig.id, row.id));

    return { ok: true };
  });

// ─── Helpers de servidor (uso interno — NÃO expor segredos ao cliente) ────────
// Lê do DB primeiro; se vazio, usa a env var como fallback (compatibilidade).

export async function getMPAccessToken(): Promise<string | null> {
  const row = await db.query.integrationConfig.findFirst();
  return row?.mpAccessToken?.trim() || process.env.MERCADOPAGO_ACCESS_TOKEN || null;
}

export async function getMPAppCredentials(): Promise<{
  appId: string | null;
  appSecret: string | null;
}> {
  const row = await db.query.integrationConfig.findFirst();
  return {
    appId: row?.mpAppId?.trim() || process.env.MERCADOPAGO_APP_ID || null,
    appSecret: row?.mpAppSecret?.trim() || process.env.MERCADOPAGO_APP_SECRET || null,
  };
}

export async function getMPWebhookSecret(): Promise<string | null> {
  const row = await db.query.integrationConfig.findFirst();
  return row?.mpWebhookSecret?.trim() || process.env.MERCADOPAGO_WEBHOOK_SECRET || null;
}
