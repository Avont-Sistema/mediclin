import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { services, users } from "../db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type Service = InferSelectModel<typeof services>;

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function getAuthProfId(): Promise<string> {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) throw new Error("Não autenticado");
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, auth.userId),
    with: { professional: true },
  });
  const profId = user?.professional?.id;
  if (!profId) throw new Error("Profissional não encontrado");
  return profId;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const serviceSchema = z.object({
  nome: z.string().min(1).max(255),
  descricao: z.string().max(1000).optional(),
  preco: z.number().min(0),
  duracaoMinutos: z.number().int().min(5).max(480),
  modalidade: z.enum(["presencial", "online", "ambos"]),
});

// ─── Server functions ─────────────────────────────────────────────────────────

export const listServices = createServerFn({ method: "GET" }).handler(async () => {
  const profId = await getAuthProfId();
  return db.query.services.findMany({
    where: eq(services.professionalId, profId),
    orderBy: [asc(services.criadoEm)],
  });
});

export const createService = createServerFn({ method: "POST" })
  .inputValidator(serviceSchema)
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();
    const [svc] = await db
      .insert(services)
      .values({
        professionalId: profId,
        nome: data.nome,
        descricao: data.descricao ?? null,
        preco: String(data.preco),
        duracaoMinutos: data.duracaoMinutos,
        modalidade: data.modalidade,
        ativo: true,
      })
      .returning();
    return svc;
  });

export const updateService = createServerFn({ method: "POST" })
  .inputValidator(serviceSchema.extend({ id: z.string(), ativo: z.boolean() }))
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();
    const existing = await db.query.services.findFirst({
      where: and(eq(services.id, data.id), eq(services.professionalId, profId)),
    });
    if (!existing) throw new Error("Serviço não encontrado");
    await db
      .update(services)
      .set({
        nome: data.nome,
        descricao: data.descricao ?? null,
        preco: String(data.preco),
        duracaoMinutos: data.duracaoMinutos,
        modalidade: data.modalidade,
        ativo: data.ativo,
        atualizadoEm: new Date(),
      })
      .where(eq(services.id, data.id));
    return { ok: true };
  });

export const deleteService = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();
    const existing = await db.query.services.findFirst({
      where: and(eq(services.id, data.id), eq(services.professionalId, profId)),
    });
    if (!existing) throw new Error("Serviço não encontrado");
    await db.delete(services).where(eq(services.id, data.id));
    return { ok: true };
  });
