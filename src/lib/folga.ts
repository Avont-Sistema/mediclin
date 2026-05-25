import { createServerFn } from "@tanstack/react-start";
import { and, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { availabilityBlocks, users } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FolgaBlock = {
  id: string;
  inicio: string; // ISO string (serialized through server fn boundary)
  fim: string;
  motivo: string | null;
};

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

// ─── listFolgas ───────────────────────────────────────────────────────────────

/** Returns all future (≥ today) day-off blocks for the authenticated professional. */
export const listFolgas = createServerFn({ method: "GET" }).handler(
  async (): Promise<FolgaBlock[]> => {
    const profId = await getAuthProfId();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = await db.query.availabilityBlocks.findMany({
      where: and(
        eq(availabilityBlocks.professionalId, profId),
        gte(availabilityBlocks.inicio, today),
      ),
      orderBy: (t, { asc }) => [asc(t.inicio)],
    });

    return rows.map((r) => ({
      id: r.id,
      inicio: r.inicio.toISOString(),
      fim: r.fim.toISOString(),
      motivo: r.motivo ?? null,
    }));
  },
);

// ─── addFolga ─────────────────────────────────────────────────────────────────

/** Creates a full-day block for the given date. */
export const addFolga = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      mensagem: z.string().max(255).optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data }): Promise<FolgaBlock> => {
    const profId = await getAuthProfId();
    const [y, m, d] = data.dateStr.split("-").map(Number);
    const inicio = new Date(y, m - 1, d, 0, 0, 0);
    const fim = new Date(y, m - 1, d, 23, 59, 59);

    const [block] = await db
      .insert(availabilityBlocks)
      .values({
        professionalId: profId,
        inicio,
        fim,
        motivo: data.mensagem || null,
      })
      .returning();

    return {
      id: block.id,
      inicio: block.inicio.toISOString(),
      fim: block.fim.toISOString(),
      motivo: block.motivo ?? null,
    };
  });

// ─── removeFolga ──────────────────────────────────────────────────────────────

/** Deletes a day-off block (ownership verified). */
export const removeFolga = createServerFn({ method: "POST" })
  .inputValidator(z.object({ blockId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();
    const block = await db.query.availabilityBlocks.findFirst({
      where: and(
        eq(availabilityBlocks.id, data.blockId),
        eq(availabilityBlocks.professionalId, profId),
      ),
    });
    if (!block) throw new Error("Folga não encontrada");
    await db
      .delete(availabilityBlocks)
      .where(eq(availabilityBlocks.id, data.blockId));
    return { ok: true };
  });
