// ─── Cargos do admin (puro — seguro no cliente) ──────────────────────────────
// Sem imports de servidor (vinxi/clerk/db). Pode ser importado por componentes.

export type AdminRole = "super_admin" | "financeiro" | "suporte" | "comercial" | "operacional";

export type AdminContext = {
  signedIn: boolean;
  isMaster: boolean;
  isApproved: boolean; // master OU admin_user ativo
  role: AdminRole | null;
  nome: string | null;
  email: string | null;
};

// Quais abas do /admin cada cargo enxerga. "*" = todas.
export const ROLE_TABS: Record<AdminRole, string[]> = {
  super_admin: ["*"],
  financeiro: ["dashboard", "financeiro", "assinaturas", "analytics"],
  suporte: ["dashboard", "suporte", "clientes"],
  comercial: ["dashboard", "leads", "clientes", "analytics"],
  operacional: ["dashboard", "clientes", "suporte", "automacoes"],
};

export function roleCanAccessTab(role: AdminRole, tabId: string): boolean {
  const allowed = ROLE_TABS[role] ?? [];
  return allowed.includes("*") || allowed.includes(tabId);
}

// Master = Clerk ID em ADMIN_CLERK_IDS. Só usado no servidor (env não exposta
// ao cliente), mas é função pura sem dependências de servidor.
export function isAdminClerkId(clerkId: string): boolean {
  const ids = (process.env.ADMIN_CLERK_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(clerkId);
}
