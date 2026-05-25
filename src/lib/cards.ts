import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { professionalCards, professionals, users } from "../db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type ProfessionalCard = InferSelectModel<typeof professionalCards>;

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

// ─── Card type enum ───────────────────────────────────────────────────────────

export const CARD_TYPES = [
  { value: "certificacao", label: "Certificação" },
  { value: "qualificacao", label: "Qualificação" },
  { value: "servico_extra", label: "Serviço Extra" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "localizacao", label: "Localização" },
  { value: "telefone", label: "Telefone" },
  { value: "email", label: "E-mail" },
] as const;

export type CardType = (typeof CARD_TYPES)[number]["value"];

// ─── Server functions ─────────────────────────────────────────────────────────

export const listCards = createServerFn({ method: "GET" }).handler(async () => {
  const profId = await getAuthProfId();
  return db.query.professionalCards.findMany({
    where: eq(professionalCards.professionalId, profId),
    orderBy: [asc(professionalCards.ordem)],
  });
});

const cardSchema = z.object({
  tipo: z.enum([
    "certificacao", "qualificacao", "servico_extra",
    "whatsapp", "instagram", "localizacao", "telefone", "email",
  ]),
  titulo: z.string().min(1).max(80),
  subtitulo: z.string().max(120).optional(),
  valor: z.string().max(500).optional(),
  ordem: z.number().int().min(0),
});

export const createCard = createServerFn({ method: "POST" })
  .inputValidator(cardSchema)
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();
    const [card] = await db
      .insert(professionalCards)
      .values({
        professionalId: profId,
        tipo: data.tipo,
        titulo: data.titulo,
        subtitulo: data.subtitulo ?? null,
        valor: data.valor ?? null,
        ordem: data.ordem,
        ativo: true,
      })
      .returning();
    return card;
  });

export const updateCard = createServerFn({ method: "POST" })
  .inputValidator(cardSchema.extend({ id: z.string() }))
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();
    const existing = await db.query.professionalCards.findFirst({
      where: and(
        eq(professionalCards.id, data.id),
        eq(professionalCards.professionalId, profId),
      ),
    });
    if (!existing) throw new Error("Card não encontrado");

    await db
      .update(professionalCards)
      .set({
        tipo: data.tipo,
        titulo: data.titulo,
        subtitulo: data.subtitulo ?? null,
        valor: data.valor ?? null,
        ordem: data.ordem,
        atualizadoEm: new Date(),
      })
      .where(eq(professionalCards.id, data.id));

    return { ok: true };
  });

export const deleteCard = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();
    const existing = await db.query.professionalCards.findFirst({
      where: and(
        eq(professionalCards.id, data.id),
        eq(professionalCards.professionalId, profId),
      ),
    });
    if (!existing) throw new Error("Card não encontrado");
    await db.delete(professionalCards).where(eq(professionalCards.id, data.id));
    return { ok: true };
  });

export const reorderCards = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ids: z.array(z.string()) }))
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();
    await Promise.all(
      data.ids.map((id, index) =>
        db
          .update(professionalCards)
          .set({ ordem: index, atualizadoEm: new Date() })
          .where(
            and(
              eq(professionalCards.id, id),
              eq(professionalCards.professionalId, profId),
            ),
          ),
      ),
    );
    return { ok: true };
  });

const COLOR_VALUES = [
  "teal", "emerald", "cyan", "sky", "blue", "indigo",
  "violet", "purple", "fuchsia", "pink", "rose",
  "orange", "amber", "yellow", "lime",
] as const;

export const updatePageIdentity = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      headline: z.string().max(160).optional(),
      headlineDestaque: z.string().max(60).optional(),
      bio: z.string().max(500).optional(),
      corPrimaria: z.enum(COLOR_VALUES),
      corDestaque: z.enum(COLOR_VALUES).nullable().optional(),
      fotoUrl: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();
    await db
      .update(professionals)
      .set({
        headline: data.headline ?? null,
        headlineDestaque: data.headlineDestaque ?? null,
        bio: data.bio ?? null,
        corPrimaria: data.corPrimaria,
        corDestaque: data.corDestaque ?? null,
        ...(data.fotoUrl !== undefined ? { fotoUrl: data.fotoUrl || null } : {}),
        atualizadoEm: new Date(),
      })
      .where(eq(professionals.id, profId));

    return { ok: true };
  });
