import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, count, eq } from "drizzle-orm";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { requireAdmin } from "./admin-auth";
import { db } from "../db";
import {
  affiliateCodes,
  affiliateClicks,
  affiliateConversions,
  adminUsers,
  professionals,
  auditLog,
} from "../db/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugifyNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join("-")
    .slice(0, 20);
}

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

// ─── fetchOrCreateMyCode ──────────────────────────────────────────────────────
// Cada admin user tem um código pessoal fixo. Cria automaticamente na 1ª chamada.

export type MyAffiliateCode = {
  codigo: string;
  totalCliques: number;
  totalConversoes: number;
};

export const fetchOrCreateMyCode = createServerFn({ method: "GET" }).handler(
  async (): Promise<MyAffiliateCode> => {
    const clerkId = await requireAdminAccess();

    const adminUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.clerkId, clerkId),
      columns: { id: true, nome: true },
    });

    // Master admins que não têm linha em adminUsers: usa clerkId como fallback de código
    if (!adminUser) {
      const codigo = `ADMIN-${clerkId.slice(-6).toUpperCase()}`;
      const existing = await db.query.affiliateCodes.findFirst({
        where: eq(affiliateCodes.codigo, codigo),
        with: { clicks: { columns: { id: true } }, conversions: { columns: { id: true } } },
      });
      if (!existing) {
        await db.insert(affiliateCodes).values({ codigo, nome: "Admin Master" });
      }
      return {
        codigo,
        totalCliques: existing?.clicks.length ?? 0,
        totalConversoes: existing?.conversions.length ?? 0,
      };
    }

    // Busca código já existente para esse admin user
    const existing = await db.query.affiliateCodes.findFirst({
      where: eq(affiliateCodes.adminUserId, adminUser.id),
      with: {
        clicks: { columns: { id: true } },
        conversions: { columns: { id: true } },
      },
    });

    if (existing) {
      return {
        codigo: existing.codigo,
        totalCliques: existing.clicks.length,
        totalConversoes: existing.conversions.length,
      };
    }

    // Auto-gera código a partir do nome
    const base = slugifyNome(adminUser.nome ?? "VENDEDOR");
    let codigo = base;
    let attempt = 0;

    while (attempt < 10) {
      const suffix = attempt === 0 ? "" : `-${attempt}`;
      codigo = `${base}${suffix}`.slice(0, 20);
      const conflict = await db.query.affiliateCodes.findFirst({
        where: eq(affiliateCodes.codigo, codigo),
        columns: { id: true },
      });
      if (!conflict) break;
      attempt++;
    }

    await db.insert(affiliateCodes).values({
      codigo,
      nome: adminUser.nome ?? "Vendedor",
      adminUserId: adminUser.id,
    });

    return { codigo, totalCliques: 0, totalConversoes: 0 };
  },
);

// ─── registerAffiliateConversion ──────────────────────────────────────────────
// Chamado no onboarding após createProfessional para registrar a conversão.
// Público (qualquer usuário autenticado pode chamar).

export const registerAffiliateConversion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ codigo: z.string() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) return { ok: false };

    const { users } = await import("../db/schema");

    const userRow = await db.query.users.findFirst({
      where: eq(users.clerkId, auth.userId),
      columns: { id: true },
    });
    if (!userRow) return { ok: false };

    const [codeRow, profRow] = await Promise.all([
      db.query.affiliateCodes.findFirst({
        where: and(
          eq(affiliateCodes.codigo, data.codigo.toUpperCase()),
          eq(affiliateCodes.ativo, true),
        ),
        columns: { id: true },
      }),
      db.query.professionals.findFirst({
        where: eq(professionals.userId, userRow.id),
        columns: { id: true },
      }),
    ]);

    if (!codeRow || !profRow) return { ok: false };

    try {
      await db
        .insert(affiliateConversions)
        .values({ codigoId: codeRow.id, professionalId: profRow.id });
    } catch {
      // já registrado — ignora silenciosamente
    }

    return { ok: true };
  });
