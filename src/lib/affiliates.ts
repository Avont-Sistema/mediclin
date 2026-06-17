import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, count, eq } from "drizzle-orm";
import { requireAdmin } from "./admin-auth";
import { db } from "../db";
import {
  affiliateCodes,
  affiliateClicks,
  affiliateConversions,
  auditLog,
} from "../db/schema";

// ─── Guard ────────────────────────────────────────────────────────────────────

async function requireAdminAccess(): Promise<string> {
  return requireAdmin();
}

async function logAudit(actorClerkId: string, acao: string, detalhe?: string) {
  try {
    await db.insert(auditLog).values({ actorClerkId, acao, entidade: "affiliate_codes", detalhe });
  } catch {
    // auditoria nunca deve quebrar a operação principal
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type AffiliateCode = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipoDesconto: "percentual" | "valor_fixo" | "periodo_free" | null;
  valorDesconto: string | null;
  diasFree: number;
  ativo: boolean;
  dataInicio: string | null;
  dataFim: string | null;
  limiteUsos: number | null;
  totalCliques: number;
  totalConversoes: number;
  criadoEm: string;
};

// ─── fetchAffiliateCodes ──────────────────────────────────────────────────────

export const fetchAffiliateCodes = createServerFn({ method: "GET" }).handler(
  async (): Promise<AffiliateCode[]> => {
    await requireAdminAccess();

    const rows = await db.query.affiliateCodes.findMany({
      orderBy: (t, { desc: d }) => [d(t.criadoEm)],
      with: {
        clicks: { columns: { id: true } },
        conversions: { columns: { id: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      nome: r.nome,
      descricao: r.descricao,
      tipoDesconto: r.tipoDesconto,
      valorDesconto: r.valorDesconto,
      diasFree: r.diasFree,
      ativo: r.ativo,
      dataInicio: r.dataInicio?.toISOString() ?? null,
      dataFim: r.dataFim?.toISOString() ?? null,
      limiteUsos: r.limiteUsos,
      totalCliques: r.clicks.length,
      totalConversoes: r.conversions.length,
      criadoEm: r.criadoEm.toISOString(),
    }));
  },
);

// ─── createAffiliateCode ──────────────────────────────────────────────────────

const CreateSchema = z.object({
  codigo: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, "Somente letras maiúsculas, números, _ e -"),
  nome: z.string().min(1).max(255),
  descricao: z.string().max(500).optional(),
  tipoDesconto: z.enum(["percentual", "valor_fixo", "periodo_free"]).nullable().optional(),
  valorDesconto: z.string().nullable().optional(),
  diasFree: z.number().int().min(0).max(365).default(0),
  dataInicio: z.string().nullable().optional(),
  dataFim: z.string().nullable().optional(),
  limiteUsos: z.number().int().min(1).nullable().optional(),
});

export const createAffiliateCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateSchema.parse(d))
  .handler(async ({ data }) => {
    const actorId = await requireAdminAccess();

    const [row] = await db
      .insert(affiliateCodes)
      .values({
        codigo: data.codigo.toUpperCase(),
        nome: data.nome,
        descricao: data.descricao ?? null,
        tipoDesconto: data.tipoDesconto ?? null,
        valorDesconto: data.valorDesconto ?? null,
        diasFree: data.diasFree,
        dataInicio: data.dataInicio ? new Date(data.dataInicio) : null,
        dataFim: data.dataFim ? new Date(data.dataFim) : null,
        limiteUsos: data.limiteUsos ?? null,
      })
      .returning({ id: affiliateCodes.id });

    await logAudit(actorId, "criar_codigo_afiliado", `codigo=${data.codigo}`);
    return row.id;
  });

// ─── updateAffiliateCode ──────────────────────────────────────────────────────

const UpdateSchema = CreateSchema.extend({ id: z.string().uuid() });

export const updateAffiliateCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UpdateSchema.parse(d))
  .handler(async ({ data }) => {
    const actorId = await requireAdminAccess();

    await db
      .update(affiliateCodes)
      .set({
        codigo: data.codigo.toUpperCase(),
        nome: data.nome,
        descricao: data.descricao ?? null,
        tipoDesconto: data.tipoDesconto ?? null,
        valorDesconto: data.valorDesconto ?? null,
        diasFree: data.diasFree,
        dataInicio: data.dataInicio ? new Date(data.dataInicio) : null,
        dataFim: data.dataFim ? new Date(data.dataFim) : null,
        limiteUsos: data.limiteUsos ?? null,
        atualizadoEm: new Date(),
      })
      .where(eq(affiliateCodes.id, data.id));

    await logAudit(actorId, "editar_codigo_afiliado", `id=${data.id} codigo=${data.codigo}`);
  });

// ─── toggleAffiliateCode ──────────────────────────────────────────────────────

export const toggleAffiliateCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), ativo: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const actorId = await requireAdminAccess();

    await db
      .update(affiliateCodes)
      .set({ ativo: data.ativo, atualizadoEm: new Date() })
      .where(eq(affiliateCodes.id, data.id));

    await logAudit(
      actorId,
      data.ativo ? "ativar_codigo_afiliado" : "desativar_codigo_afiliado",
      `id=${data.id}`,
    );
  });

// ─── deleteAffiliateCode ──────────────────────────────────────────────────────

export const deleteAffiliateCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const actorId = await requireAdminAccess();

    await db.delete(affiliateCodes).where(eq(affiliateCodes.id, data.id));
    await logAudit(actorId, "deletar_codigo_afiliado", `id=${data.id}`);
  });

// ─── trackAffiliateClick (público — chamado quando alguém abre o link) ────────

export const trackAffiliateClick = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ codigo: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const row = await db.query.affiliateCodes.findFirst({
      where: and(
        eq(affiliateCodes.codigo, data.codigo.toUpperCase()),
        eq(affiliateCodes.ativo, true),
      ),
      columns: { id: true },
    });

    if (!row) return { ok: false };

    await db.insert(affiliateClicks).values({ codigoId: row.id });
    return { ok: true };
  });

// ─── resolveAffiliateCode (público — valida o código no cadastro) ─────────────

export type AffiliateCodeInfo = {
  id: string;
  codigo: string;
  nome: string;
  tipoDesconto: "percentual" | "valor_fixo" | "periodo_free" | null;
  valorDesconto: string | null;
  diasFree: number;
};

export const resolveAffiliateCode = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ codigo: z.string() }).parse(d))
  .handler(async ({ data }): Promise<AffiliateCodeInfo | null> => {
    const now = new Date();

    const row = await db.query.affiliateCodes.findFirst({
      where: and(
        eq(affiliateCodes.codigo, data.codigo.toUpperCase()),
        eq(affiliateCodes.ativo, true),
      ),
    });

    if (!row) return null;
    if (row.dataInicio && row.dataInicio > now) return null;
    if (row.dataFim && row.dataFim < now) return null;

    if (row.limiteUsos !== null) {
      const [{ total }] = await db
        .select({ total: count() })
        .from(affiliateConversions)
        .where(eq(affiliateConversions.codigoId, row.id));
      if (total >= row.limiteUsos) return null;
    }

    return {
      id: row.id,
      codigo: row.codigo,
      nome: row.nome,
      tipoDesconto: row.tipoDesconto,
      valorDesconto: row.valorDesconto,
      diasFree: row.diasFree,
    };
  });

// ─── fetchAffiliateStats ──────────────────────────────────────────────────────

export type AffiliateStats = {
  totalCodigos: number;
  totalCliques: number;
  totalConversoes: number;
  taxaConversao: number;
};

export const fetchAffiliateStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<AffiliateStats> => {
    await requireAdminAccess();

    const [[{ totalCodigos }], [{ totalCliques }], [{ totalConversoes }]] = await Promise.all([
      db.select({ totalCodigos: count() }).from(affiliateCodes),
      db.select({ totalCliques: count() }).from(affiliateClicks),
      db.select({ totalConversoes: count() }).from(affiliateConversions),
    ]);

    return {
      totalCodigos,
      totalCliques,
      totalConversoes,
      taxaConversao: totalCliques > 0 ? Math.round((totalConversoes / totalCliques) * 100) : 0,
    };
  },
);
