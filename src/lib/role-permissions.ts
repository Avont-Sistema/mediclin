import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { requireAdmin } from "./admin-auth";
import { db } from "../db";
import { roleTabPermissions, adminUsers } from "../db/schema";
import { ROLE_TABS, type AdminRole } from "./admin-roles";

// ─── Definição canônica de todas as abas disponíveis ─────────────────────────

export const ALL_TABS = [
  { id: "dashboard",     label: "Dashboard" },
  { id: "clientes",      label: "Clientes" },
  { id: "assinaturas",   label: "Assinaturas" },
  { id: "leads",         label: "Leads CRM" },
  { id: "afiliados",     label: "Afiliados" },
  { id: "suporte",       label: "Suporte" },
  { id: "automacoes",    label: "Automações" },
  { id: "analytics",     label: "Analytics" },
  { id: "financeiro",    label: "Financeiro" },
  { id: "integracoes",   label: "Integrações" },
  { id: "flags",         label: "Feature Flags" },
  { id: "notificacoes",  label: "Notificações" },
  { id: "auditoria",     label: "Auditoria" },
  { id: "personalizacao",label: "Personalização do App" },
  { id: "modo-teste",    label: "Modo Teste" },
  { id: "permissoes",    label: "Permissões" },
  { id: "config",        label: "Configurações do Sistema" },
] as const;

export type TabId = (typeof ALL_TABS)[number]["id"];

const NON_SUPER_ROLES: AdminRole[] = ["financeiro", "suporte", "comercial", "operacional"];

// Fallback hardcoded (espelha admin-roles.ts + inclui afiliados e permissoes)
const DEFAULTS: Record<AdminRole, string[]> = {
  super_admin:  ["*"],
  financeiro:   ["dashboard", "financeiro", "assinaturas", "analytics"],
  suporte:      ["dashboard", "suporte", "clientes"],
  comercial:    ["dashboard", "afiliados"],
  operacional:  ["dashboard", "clientes", "suporte", "automacoes"],
};

function defaultVisible(role: AdminRole, tabId: string): boolean {
  const allowed = DEFAULTS[role] ?? [];
  return allowed.includes("*") || allowed.includes(tabId);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type RolePermissionMatrix = {
  role: AdminRole;
  tabs: { tabId: string; label: string; visivel: boolean }[];
}[];

// ─── fetchRoleTabPermissions (super_admin only) ───────────────────────────────

export const fetchRoleTabPermissions = createServerFn({ method: "GET" }).handler(
  async (): Promise<RolePermissionMatrix> => {
    await requireAdmin();

    const rows = await db.query.roleTabPermissions.findMany();

    return NON_SUPER_ROLES.map((role) => ({
      role,
      tabs: ALL_TABS.filter((t) => t.id !== "permissoes" && t.id !== "config").map((tab) => {
        const saved = rows.find((r) => r.role === role && r.tabId === tab.id);
        return {
          tabId: tab.id,
          label: tab.label,
          visivel: saved !== undefined ? saved.visivel : defaultVisible(role, tab.id),
        };
      }),
    }));
  },
);

// ─── updateRoleTabPermission (super_admin only) ───────────────────────────────

export const updateRoleTabPermission = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          role: z.enum(["financeiro", "suporte", "comercial", "operacional"]),
          tabId: z.string().min(1),
          visivel: z.boolean(),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    await db
      .insert(roleTabPermissions)
      .values({ role: data.role, tabId: data.tabId, visivel: data.visivel })
      .onConflictDoUpdate({
        target: [roleTabPermissions.role, roleTabPermissions.tabId],
        set: { visivel: data.visivel, atualizadoEm: new Date() },
      });
    return { ok: true };
  });

// ─── fetchMyAllowedTabs (chamado pelo AdminContent) ───────────────────────────
// Retorna as abas visíveis para o usuário atual.
// Masters veem tudo. Outros cargos: DB override ou fallback.

export type AllowedTab = { id: string; label: string };

export const fetchMyAllowedTabs = createServerFn({ method: "GET" }).handler(
  async (): Promise<AllowedTab[]> => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) return [];

    // Master → tudo
    const { isAdminClerkId } = await import("./admin-roles");
    if (isAdminClerkId(auth.userId)) return [...ALL_TABS];

    const record = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.clerkId, auth.userId),
      columns: { role: true },
    });
    if (!record?.role) return [];

    const role = record.role as AdminRole;
    const saved = await db.query.roleTabPermissions.findMany({
      where: eq(roleTabPermissions.role, role),
    });

    return ALL_TABS.filter((tab) => {
      const override = saved.find((r) => r.tabId === tab.id);
      return override !== undefined ? override.visivel : defaultVisible(role, tab.id);
    });
  },
);

// ─── fetchMyAdminRecord ───────────────────────────────────────────────────────
// Retorna o registro do admin user atual (role, id) — usado para data scoping.

export type MyAdminRecord = {
  id: string;
  role: AdminRole;
  nome: string | null;
} | null;

export const fetchMyAdminRecord = createServerFn({ method: "GET" }).handler(
  async (): Promise<MyAdminRecord> => {
    await requireAdmin();
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) return null;

    const record = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.clerkId, auth.userId),
      columns: { id: true, role: true, nome: true },
    });
    if (!record) return null;
    return { id: record.id, role: record.role as AdminRole, nome: record.nome };
  },
);
