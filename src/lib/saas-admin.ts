import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desc, eq, sql as dsql } from "drizzle-orm";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import {
  plans,
  delinquencyConfig,
  adminUsers,
  leads,
  featureFlags,
  auditLog,
  adminNotifications,
  payments,
  subscriptions,
} from "../db/schema";

// ─── Guard (centralizado; gating por ADMIN_CLERK_IDS pendente) ────────────────

async function requireAdminAccess(): Promise<string> {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) throw new Error("Não autenticado");
  return auth.userId;
}

async function logAudit(actorClerkId: string, acao: string, entidade: string, detalhe?: string) {
  try {
    await db.insert(auditLog).values({ actorClerkId, acao, entidade, detalhe });
  } catch {
    // auditoria nunca deve quebrar a operação principal
  }
}

// ═══ PLANOS ═══════════════════════════════════════════════════════════════════

export type Plan = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  precoMensal: string;
  precoAnual: string;
  trialDias: number;
  maxUsuarios: number;
  maxAgendamentosMes: number;
  armazenamentoGb: number;
  comissaoPct: string;
  whatsappIncluso: boolean;
  recursos: string[];
  ativo: boolean;
  ordem: number;
};

export const fetchPlans = createServerFn({ method: "GET" }).handler(async (): Promise<Plan[]> => {
  await requireAdminAccess();
  const rows = await db.query.plans.findMany({ orderBy: (p, { asc }) => [asc(p.ordem)] });
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    nome: p.nome,
    descricao: p.descricao,
    precoMensal: p.precoMensal,
    precoAnual: p.precoAnual,
    trialDias: p.trialDias,
    maxUsuarios: p.maxUsuarios,
    maxAgendamentosMes: p.maxAgendamentosMes,
    armazenamentoGb: p.armazenamentoGb,
    comissaoPct: p.comissaoPct,
    whatsappIncluso: p.whatsappIncluso,
    recursos: p.recursos ?? [],
    ativo: p.ativo,
    ordem: p.ordem,
  }));
});

const planInput = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_]+$/, "Apenas minúsculas, números e _"),
  nome: z.string().min(2).max(100),
  descricao: z.string().max(500).optional(),
  precoMensal: z.string().regex(/^\d+(\.\d{1,2})?$/),
  precoAnual: z.string().regex(/^\d+(\.\d{1,2})?$/),
  trialDias: z.number().int().min(0).max(365),
  maxUsuarios: z.number().int().min(-1),
  maxAgendamentosMes: z.number().int().min(-1),
  armazenamentoGb: z.number().int().min(0),
  comissaoPct: z.string().regex(/^\d+(\.\d{1,2})?$/),
  whatsappIncluso: z.boolean(),
  recursos: z.array(z.string().max(120)).max(30),
  ativo: z.boolean(),
  ordem: z.number().int().min(0),
});

export const upsertPlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => planInput.parse(d))
  .handler(async ({ data }) => {
    const actor = await requireAdminAccess();
    const values = { ...data, descricao: data.descricao ?? null, atualizadoEm: new Date() };
    if (data.id) {
      await db.update(plans).set(values).where(eq(plans.id, data.id));
      await logAudit(actor, "plano.editar", "plans", data.slug);
    } else {
      await db.insert(plans).values(values);
      await logAudit(actor, "plano.criar", "plans", data.slug);
    }
    return { ok: true };
  });

// ═══ COBRANÇA / INADIMPLÊNCIA ═════════════════════════════════════════════════

export type DelinquencyConfig = {
  ativo: boolean;
  diasAlerta: number;
  diasLimitar: number;
  diasBloquear: number;
};

export const fetchDelinquencyConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<DelinquencyConfig> => {
    await requireAdminAccess();
    const cfg = await db.query.delinquencyConfig.findFirst();
    return {
      ativo: cfg?.ativo ?? false,
      diasAlerta: cfg?.diasAlerta ?? 5,
      diasLimitar: cfg?.diasLimitar ?? 10,
      diasBloquear: cfg?.diasBloquear ?? 20,
    };
  },
);

export const updateDelinquencyConfig = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ativo: z.boolean(),
      diasAlerta: z.number().int().min(1).max(90),
      diasLimitar: z.number().int().min(1).max(120),
      diasBloquear: z.number().int().min(1).max(180),
    }),
  )
  .handler(async ({ data }) => {
    const actor = await requireAdminAccess();
    const existing = await db.query.delinquencyConfig.findFirst();
    const payload = { ...data, atualizadoEm: new Date() };
    if (existing) {
      await db.update(delinquencyConfig).set(payload).where(eq(delinquencyConfig.id, existing.id));
    } else {
      await db.insert(delinquencyConfig).values(payload);
    }
    await logAudit(actor, "inadimplencia.config", "delinquency_config", `ativo=${data.ativo}`);
    return { ok: true };
  });

// ═══ GESTÃO FINANCEIRA (pagamentos por status) ════════════════════════════════

export type FinanceOverview = {
  porStatus: { status: string; count: number; total: number }[];
  inadimplentes: number;
  recentes: {
    id: string;
    valorBruto: string;
    status: string;
    criadoEm: Date;
  }[];
};

export const fetchFinanceOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<FinanceOverview> => {
    await requireAdminAccess();

    const [statusRows, recentes, [inad]] = await Promise.all([
      db
        .select({
          status: payments.status,
          count: dsql<number>`COUNT(*)::int`,
          total: dsql<number>`COALESCE(SUM(${payments.valorBruto}),0)::float`,
        })
        .from(payments)
        .groupBy(payments.status),
      db.query.payments.findMany({
        columns: { id: true, valorBruto: true, status: true, criadoEm: true },
        orderBy: [desc(payments.criadoEm)],
        limit: 20,
      }),
      db
        .select({ c: dsql<number>`COUNT(*)::int` })
        .from(subscriptions)
        .where(eq(subscriptions.status, "inadimplente")),
    ]);

    return {
      porStatus: statusRows.map((r) => ({
        status: r.status,
        count: Number(r.count),
        total: Number(r.total),
      })),
      inadimplentes: Number(inad.c),
      recentes: recentes.map((p) => ({
        id: p.id,
        valorBruto: p.valorBruto,
        status: p.status,
        criadoEm: p.criadoEm,
      })),
    };
  },
);

// ═══ NÍVEIS DE ADMIN ══════════════════════════════════════════════════════════

export type AdminUser = {
  id: string;
  clerkId: string;
  nome: string | null;
  email: string | null;
  role: "super_admin" | "financeiro" | "suporte" | "comercial" | "operacional";
  ativo: boolean;
};

export const fetchAdminUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminUser[]> => {
    await requireAdminAccess();
    const rows = await db.query.adminUsers.findMany({
      orderBy: (a, { asc }) => [asc(a.criadoEm)],
    });
    return rows.map((a) => ({
      id: a.id,
      clerkId: a.clerkId,
      nome: a.nome,
      email: a.email,
      role: a.role,
      ativo: a.ativo,
    }));
  },
);

export const upsertAdminUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      clerkId: z.string().min(3).max(255),
      nome: z.string().max(255).optional(),
      email: z.string().email().optional().or(z.literal("")),
      role: z.enum(["super_admin", "financeiro", "suporte", "comercial", "operacional"]),
      ativo: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const actor = await requireAdminAccess();
    const values = {
      clerkId: data.clerkId,
      nome: data.nome || null,
      email: data.email || null,
      role: data.role,
      ativo: data.ativo,
    };
    if (data.id) {
      await db.update(adminUsers).set(values).where(eq(adminUsers.id, data.id));
    } else {
      await db.insert(adminUsers).values(values).onConflictDoNothing();
    }
    await logAudit(actor, "admin.role", "admin_users", `${data.clerkId}=${data.role}`);
    return { ok: true };
  });

// ═══ LEADS (CRM) ══════════════════════════════════════════════════════════════

export type Lead = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  origem: string | null;
  status: "novo" | "contatado" | "qualificado" | "convertido" | "perdido";
  notas: string | null;
  criadoEm: Date;
};

export const fetchLeads = createServerFn({ method: "GET" }).handler(async (): Promise<Lead[]> => {
  await requireAdminAccess();
  const rows = await db.query.leads.findMany({ orderBy: [desc(leads.criadoEm)], limit: 200 });
  return rows.map((l) => ({
    id: l.id,
    nome: l.nome,
    email: l.email,
    telefone: l.telefone,
    origem: l.origem,
    status: l.status,
    notas: l.notas,
    criadoEm: l.criadoEm,
  }));
});

export const upsertLead = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      nome: z.string().min(2).max(255),
      email: z.string().email().optional().or(z.literal("")),
      telefone: z.string().max(30).optional(),
      origem: z.string().max(50).optional(),
      status: z.enum(["novo", "contatado", "qualificado", "convertido", "perdido"]),
      notas: z.string().max(2000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminAccess();
    const values = {
      nome: data.nome,
      email: data.email || null,
      telefone: data.telefone || null,
      origem: data.origem || null,
      status: data.status,
      notas: data.notas || null,
      atualizadoEm: new Date(),
    };
    if (data.id) {
      await db.update(leads).set(values).where(eq(leads.id, data.id));
    } else {
      await db.insert(leads).values(values);
    }
    return { ok: true };
  });

// ═══ FEATURE FLAGS ════════════════════════════════════════════════════════════

export type FeatureFlag = { id: string; chave: string; descricao: string | null; ativo: boolean };

export const fetchFeatureFlags = createServerFn({ method: "GET" }).handler(
  async (): Promise<FeatureFlag[]> => {
    await requireAdminAccess();
    const rows = await db.query.featureFlags.findMany({
      orderBy: (f, { asc }) => [asc(f.chave)],
    });
    return rows.map((f) => ({ id: f.id, chave: f.chave, descricao: f.descricao, ativo: f.ativo }));
  },
);

export const toggleFeatureFlag = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid(), ativo: z.boolean() }))
  .handler(async ({ data }) => {
    const actor = await requireAdminAccess();
    await db
      .update(featureFlags)
      .set({ ativo: data.ativo, atualizadoEm: new Date() })
      .where(eq(featureFlags.id, data.id));
    await logAudit(actor, "feature_flag.toggle", "feature_flags", `${data.id}=${data.ativo}`);
    return { ok: true };
  });

// ═══ AUDITORIA ════════════════════════════════════════════════════════════════

export type AuditEntry = {
  id: string;
  actorNome: string | null;
  actorClerkId: string | null;
  acao: string;
  entidade: string | null;
  detalhe: string | null;
  criadoEm: Date;
};

export const fetchAuditLog = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuditEntry[]> => {
    await requireAdminAccess();
    const rows = await db.query.auditLog.findMany({
      orderBy: [desc(auditLog.criadoEm)],
      limit: 100,
    });
    return rows.map((a) => ({
      id: a.id,
      actorNome: a.actorNome,
      actorClerkId: a.actorClerkId,
      acao: a.acao,
      entidade: a.entidade,
      detalhe: a.detalhe,
      criadoEm: a.criadoEm,
    }));
  },
);

// ═══ NOTIFICAÇÕES ═════════════════════════════════════════════════════════════

export type AdminNotification = {
  id: string;
  titulo: string;
  mensagem: string | null;
  tipo: string;
  lida: boolean;
  criadoEm: Date;
};

export const fetchNotifications = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminNotification[]> => {
    await requireAdminAccess();
    const rows = await db.query.adminNotifications.findMany({
      orderBy: [desc(adminNotifications.criadoEm)],
      limit: 100,
    });
    return rows.map((n) => ({
      id: n.id,
      titulo: n.titulo,
      mensagem: n.mensagem,
      tipo: n.tipo,
      lida: n.lida,
      criadoEm: n.criadoEm,
    }));
  },
);

export const markNotificationRead = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdminAccess();
    await db
      .update(adminNotifications)
      .set({ lida: true })
      .where(eq(adminNotifications.id, data.id));
    return { ok: true };
  });
