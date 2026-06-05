import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";

// ─── Admin gating central ─────────────────────────────────────────────────────
// Ponto único de autorização do painel administrativo da plataforma (/admin).
// Um Clerk ID só é admin se estiver em ADMIN_CLERK_IDS (lista separada por vírgula,
// configurada no Vercel). Sem a env var, NINGUÉM é admin (fail-closed).

export function isAdminClerkId(clerkId: string): boolean {
  const ids = (process.env.ADMIN_CLERK_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(clerkId);
}

/**
 * Exige que a requisição venha de um admin da plataforma.
 * Lança "Não autenticado" se não houver sessão, "Acesso negado" se a sessão
 * não for de um admin. Retorna o Clerk ID do admin (útil para auditoria).
 */
export async function requireAdmin(): Promise<string> {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) throw new Error("Não autenticado");
  if (!isAdminClerkId(auth.userId)) throw new Error("Acesso negado");
  return auth.userId;
}
