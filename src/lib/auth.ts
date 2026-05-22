import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { eq } from "drizzle-orm";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { users } from "../db/schema";
import { getOrCreateUser } from "./user-sync";

export const fetchAuth = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await getAuth(getWebRequest());
  return { userId: auth.userId, sessionId: auth.sessionId };
});

export const fetchCurrentProfessional = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) return null;

  // Auto-sync: cria user no DB se vier de signup sem webhook.
  const dbUser = await getOrCreateUser(auth.userId);

  const result = await db.query.users.findFirst({
    where: eq(users.id, dbUser.id),
    with: { professional: true },
  });

  return result?.professional ?? null;
});
