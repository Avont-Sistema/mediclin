import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { eq } from "drizzle-orm";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { professionals, users } from "../db/schema";

export const fetchAuth = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await getAuth(getWebRequest());
  return { userId: auth.userId, sessionId: auth.sessionId };
});

export const fetchCurrentProfessional = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) return null;

  const result = await db.query.users.findFirst({
    where: eq(users.clerkId, auth.userId),
    with: { professional: true },
  });

  return result?.professional ?? null;
});
