import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { availabilityRules, users } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AvailabilityRule = {
  id: string;
  diaSemana: string;
  horaInicio: string;
  horaFim: string;
  ativo: boolean;
};

// ─── Auth helper (same pattern as folga.ts) ───────────────────────────────────

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

// ─── getAvailabilityRules ─────────────────────────────────────────────────────

export const getAvailabilityRules = createServerFn({ method: "GET" })
  .handler(async (): Promise<AvailabilityRule[]> => {
    const profId = await getAuthProfId();
    const rules = await db.query.availabilityRules.findMany({
      where: eq(availabilityRules.professionalId, profId),
    });
    return rules.map((r) => ({
      id: r.id,
      diaSemana: r.diaSemana,
      horaInicio: r.horaInicio,
      horaFim: r.horaFim,
      ativo: r.ativo,
    }));
  });

// ─── saveAvailabilityRules ────────────────────────────────────────────────────
// Replaces ALL rules for the professional (delete + insert).

export const saveAvailabilityRules = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      rules: z.array(
        z.object({
          diaSemana: z.enum([
            "domingo",
            "segunda",
            "terca",
            "quarta",
            "quinta",
            "sexta",
            "sabado",
          ]),
          horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
          horaFim: z.string().regex(/^\d{2}:\d{2}$/),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();

    // 1. Remove all existing rules for this professional
    await db
      .delete(availabilityRules)
      .where(eq(availabilityRules.professionalId, profId));

    // 2. Insert the new set (may be empty if doctor removed all days)
    if (data.rules.length > 0) {
      await db.insert(availabilityRules).values(
        data.rules.map((r) => ({
          professionalId: profId,
          diaSemana: r.diaSemana,
          horaInicio: r.horaInicio,
          horaFim: r.horaFim,
          ativo: true,
        })),
      );
    }

    return { ok: true };
  });
