import { type WebhookEvent } from "@clerk/tanstack-start/server";
import { Webhook } from "svix";
import { db } from "../db";
import { users } from "../db/schema";

export async function handleClerkWebhook(request: Request): Promise<Response> {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("CLERK_WEBHOOK_SECRET não configurado", { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Headers svix ausentes", { status: 400 });
  }

  const body = await request.text();
  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response("Assinatura inválida", { status: 400 });
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;
    if (!email) return new Response("Email ausente", { status: 400 });

    const nome = [first_name, last_name].filter(Boolean).join(" ") || email;

    await db
      .insert(users)
      .values({ clerkId: id, email, nome })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: { email, nome, atualizadoEm: new Date() },
      });
  }

  return new Response("OK", { status: 200 });
}
