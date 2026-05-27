import { createClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import type { InferSelectModel } from "drizzle-orm";

/**
 * Sincronização automática Clerk → DB.
 *
 * Idealmente, o webhook `user.created` do Clerk popula a tabela `users` quando
 * alguém se cadastra. Mas o webhook depende de configuração manual no painel
 * Clerk + endpoint público acessível + retry pra garantir entrega.
 *
 * Este módulo serve como fallback resiliente: ao acessar qualquer rota que precise
 * do `users.id` interno, se o registro não existir, busca os dados no Clerk Backend
 * API e cria. Idempotente (onConflictDoNothing por clerkId).
 *
 * Vantagem: sign-up funciona end-to-end mesmo sem webhook configurado.
 */

type User = InferSelectModel<typeof users>;

let _clerkClient: ReturnType<typeof createClerkClient> | null = null;

function clerk() {
  if (_clerkClient) return _clerkClient;
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY não configurado");
  _clerkClient = createClerkClient({ secretKey });
  return _clerkClient;
}

/**
 * Retorna o registro `users` correspondente ao clerkId.
 * Se não existir no DB, busca no Clerk e cria automaticamente.
 *
 * @throws se o clerkId não existir no Clerk (usuário inválido/excluído)
 */
export async function getOrCreateUser(clerkId: string): Promise<User> {
  // 1. Tenta achar no DB primeiro (caso comum)
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
  if (existing) return existing;

  // 2. Busca dados no Clerk Backend
  let clerkUser;
  try {
    clerkUser = await clerk().users.getUser(clerkId);
  } catch (err) {
    throw new Error(
      `Usuário Clerk não encontrado: ${clerkId} — ${err instanceof Error ? err.message : ""}`,
    );
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error(`Usuário Clerk ${clerkId} sem email`);

  const nome =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser.username ||
    email;

  // 3. Insere com onConflictDoNothing pra ser idempotente em corridas de webhook
  await db
    .insert(users)
    .values({ clerkId, email, nome })
    .onConflictDoNothing({ target: users.clerkId });

  // 4. Busca o registro final (pode ter sido criado pelo webhook concorrentemente)
  const created = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
  if (!created) throw new Error(`Falha ao sincronizar usuário ${clerkId} no banco`);
  return created;
}
