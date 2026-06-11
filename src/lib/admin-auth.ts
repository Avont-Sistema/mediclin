import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { adminUsers } from "../db/schema";
import { isAdminClerkId } from "./admin-roles";

// ─── Admin gating (server-only) ───────────────────────────────────────────────
// Dois níveis: ADMINS MASTER (ADMIN_CLERK_IDS, sempre super_admin) e ADMINS POR
// CARGO (admin_users; bloqueados até um master aprovar). Constantes puras de
// cargo/permissão ficam em admin-roles.ts (seguras para o cliente).

export { isAdminClerkId };
export type { AdminRole, AdminContext } from "./admin-roles";

/**
 * Exige um admin com acesso (master OU admin_user ativo). Lança caso contrário.
 * Retorna o Clerk ID. (Gating por cargo de cada função fica para a Fase 2.)
 */
export async function requireAdmin(): Promise<string> {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) throw new Error("Não autenticado");
  if (isAdminClerkId(auth.userId)) return auth.userId;

  const record = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.clerkId, auth.userId),
  });
  if (!record?.ativo) throw new Error("Acesso negado");
  return auth.userId;
}
