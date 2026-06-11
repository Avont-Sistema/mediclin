import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { adminUsers, users } from "../db/schema";
import { isAdminClerkId, type AdminContext, type AdminRole } from "./admin-roles";

// ─── Contexto do admin atual ──────────────────────────────────────────────────
// getWebRequest/getAuth/db só são usados dentro do handler do createServerFn,
// que é removido do bundle do cliente — então este módulo é seguro de importar
// em componentes (a função vira um stub RPC no cliente).

async function resolveAdminContext(): Promise<AdminContext> {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) {
    return {
      signedIn: false,
      isMaster: false,
      isApproved: false,
      role: null,
      nome: null,
      email: null,
    };
  }

  if (isAdminClerkId(auth.userId)) {
    return {
      signedIn: true,
      isMaster: true,
      isApproved: true,
      role: "super_admin",
      nome: null,
      email: null,
    };
  }

  let record = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.clerkId, auth.userId),
  });

  // Primeiro acesso → cria pendente (ativo=false), enriquecendo nome/email.
  if (!record) {
    const u = await db.query.users.findFirst({ where: eq(users.clerkId, auth.userId) });
    const [created] = await db
      .insert(adminUsers)
      .values({
        clerkId: auth.userId,
        nome: u?.nome ?? null,
        email: u?.email ?? null,
        role: "suporte",
        ativo: false,
      })
      .onConflictDoNothing()
      .returning();
    record =
      created ??
      (await db.query.adminUsers.findFirst({ where: eq(adminUsers.clerkId, auth.userId) }));
  }

  return {
    signedIn: true,
    isMaster: false,
    isApproved: !!record?.ativo,
    role: (record?.role as AdminRole) ?? null,
    nome: record?.nome ?? null,
    email: record?.email ?? null,
  };
}

export const getAdminContext = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminContext> => resolveAdminContext(),
);
