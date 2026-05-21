import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { availabilityRules, professionals, services, users } from "../db/schema";
import type { InferSelectModel } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SettingsData = {
  professional: InferSelectModel<typeof professionals>;
  services: InferSelectModel<typeof services>[];
  availabilityRules: InferSelectModel<typeof availabilityRules>[];
};

// ─── Helper ───────────────────────────────────────────────────────────────────

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

// ─── Fetch ────────────────────────────────────────────────────────────────────

export const fetchSettingsData = createServerFn({ method: "GET" }).handler(
  async (): Promise<SettingsData | null> => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) return null;

    const userRecord = await db.query.users.findFirst({
      where: eq(users.clerkId, auth.userId),
      with: {
        professional: {
          with: {
            services: { orderBy: (s, { asc }) => [asc(s.criadoEm)] },
            availabilityRules: { orderBy: (r, { asc }) => [asc(r.diaSemana)] },
          },
        },
      },
    });

    const prof = userRecord?.professional;
    if (!prof) return null;

    return {
      professional: prof,
      services: prof.services,
      availabilityRules: prof.availabilityRules,
    };
  },
);

// ─── Profile ──────────────────────────────────────────────────────────────────

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      nomeCompleto: z.string().min(2),
      especialidade: z.string().min(2),
      registro: z.string().min(2),
      bio: z.string().optional(),
      fotoUrl: z.string().optional(),
      telefoneWhatsapp: z.string().optional(),
      slug: z
        .string()
        .min(2)
        .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
    }),
  )
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();

    await db
      .update(professionals)
      .set({
        nomeCompleto: data.nomeCompleto,
        especialidade: data.especialidade,
        registro: data.registro,
        bio: data.bio ?? null,
        fotoUrl: data.fotoUrl || null,
        telefoneWhatsapp: data.telefoneWhatsapp || null,
        slug: data.slug,
        atualizadoEm: new Date(),
      })
      .where(eq(professionals.id, profId));

    return { ok: true };
  });

// ─── Services ─────────────────────────────────────────────────────────────────

export const upsertService = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().optional(),
      nome: z.string().min(2),
      descricao: z.string().optional(),
      preco: z.string().regex(/^\d+(\.\d{1,2})?$/, "Preço inválido"),
      duracaoMinutos: z.number().int().min(5).max(480),
    }),
  )
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();

    if (data.id) {
      const svc = await db.query.services.findFirst({
        where: and(eq(services.id, data.id), eq(services.professionalId, profId)),
      });
      if (!svc) throw new Error("Serviço não encontrado");

      await db
        .update(services)
        .set({
          nome: data.nome,
          descricao: data.descricao ?? null,
          preco: data.preco,
          duracaoMinutos: data.duracaoMinutos,
          atualizadoEm: new Date(),
        })
        .where(eq(services.id, data.id));
    } else {
      await db.insert(services).values({
        professionalId: profId,
        nome: data.nome,
        descricao: data.descricao ?? null,
        preco: data.preco,
        duracaoMinutos: data.duracaoMinutos,
      });
    }

    return { ok: true };
  });

export const toggleServiceActive = createServerFn({ method: "POST" })
  .inputValidator(z.object({ serviceId: z.string(), ativo: z.boolean() }))
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();

    const svc = await db.query.services.findFirst({
      where: and(eq(services.id, data.serviceId), eq(services.professionalId, profId)),
    });
    if (!svc) throw new Error("Serviço não encontrado");

    await db
      .update(services)
      .set({ ativo: data.ativo, atualizadoEm: new Date() })
      .where(eq(services.id, data.serviceId));

    return { ok: true };
  });

// ─── Availability rules ───────────────────────────────────────────────────────

export const addAvailabilityRule = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      diaSemana: z.enum(["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"]),
      horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
      horaFim: z.string().regex(/^\d{2}:\d{2}$/),
    }),
  )
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();

    await db
      .insert(availabilityRules)
      .values({
        professionalId: profId,
        diaSemana: data.diaSemana,
        horaInicio: data.horaInicio,
        horaFim: data.horaFim,
      })
      .onConflictDoUpdate({
        target: [
          availabilityRules.professionalId,
          availabilityRules.diaSemana,
          availabilityRules.horaInicio,
        ],
        set: { horaFim: data.horaFim, ativo: true },
      });

    return { ok: true };
  });

export const deleteAvailabilityRule = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ruleId: z.string() }))
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();

    const rule = await db.query.availabilityRules.findFirst({
      where: and(
        eq(availabilityRules.id, data.ruleId),
        eq(availabilityRules.professionalId, profId),
      ),
    });
    if (!rule) throw new Error("Regra não encontrada");

    await db.delete(availabilityRules).where(eq(availabilityRules.id, data.ruleId));

    return { ok: true };
  });
