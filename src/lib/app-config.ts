import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { appConfig } from "../db/schema";
import { requireAdmin } from "./admin-auth";

// ─── Configurações globais do app (singleton) ─────────────────────────────────

async function getOrCreateRow() {
  const existing = await db.query.appConfig.findFirst();
  if (existing) return existing;
  const [created] = await db.insert(appConfig).values({}).returning();
  return created;
}

/** Domínio do app (sem protocolo). DB-first, fallback para env, fallback padrão. */
export async function getAppDomain(): Promise<string> {
  const row = await db.query.appConfig.findFirst();
  const fromDb = row?.dominio?.trim();
  if (fromDb) return fromDb.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (process.env.APP_DOMAIN ?? "cuidandovc.com").replace(/^https?:\/\//, "");
}

/** URL absoluta do app (https), usada em e-mails e links server-side. */
export async function getAppBaseUrl(): Promise<string> {
  const domain = await getAppDomain();
  const protocol = domain.includes("localhost") ? "http" : "https";
  return `${protocol}://${domain}`;
}

export type AppConfigView = {
  dominio: string | null;
  atualizadoEm: string | null;
};

export const fetchAppConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppConfigView> => {
    await requireAdmin();
    const row = await getOrCreateRow();
    return {
      dominio: row.dominio ?? null,
      atualizadoEm: row.atualizadoEm?.toISOString() ?? null,
    };
  },
);

export const updateAppConfig = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      // domínio limpo: só host (sem protocolo, sem barra). Vazio = limpar.
      dominio: z.string().trim().max(255).optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const clean = (data.dominio ?? "")
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");
    const row = await getOrCreateRow();
    await db
      .update(appConfig)
      .set({ dominio: clean || null, atualizadoEm: new Date() })
      .where(eq(appConfig.id, row.id));
    return { ok: true, dominio: clean || null };
  });
