import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { z } from "zod";
import { db } from "../db";
import { professionals, users } from "../db/schema";
import { getOrCreateUser } from "./user-sync";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a full name to a URL-safe slug.
 * "Dr. Ricardo Fontes" → "dr-ricardo-fontes"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanum
    .trim()
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/-+/g, "-"); // collapse multiple hyphens
}

// ─── Server functions ─────────────────────────────────────────────────────────

/**
 * Returns true when the authenticated user already has a professionals record.
 * Used in the dashboard loader to redirect first-time users to /onboarding.
 */
export const checkOnboardingStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ hasProfile: boolean }> => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) return { hasProfile: false };

    // Auto-sync: garante que o registro existe no DB mesmo sem webhook configurado.
    // Se o user já existe, é um no-op rápido (single SELECT).
    const dbUser = await getOrCreateUser(auth.userId);

    const userWithProf = await db.query.users.findFirst({
      where: eq(users.id, dbUser.id),
      with: { professional: true },
    });

    return { hasProfile: !!userWithProf?.professional };
  },
);

// ─── Create professional ──────────────────────────────────────────────────────

const createProfessionalSchema = z.object({
  nomeCompleto: z.string().min(2).max(120),
  especialidade: z.string().min(2).max(80),
  registro: z.string().min(2).max(40), // CRM / CRO / etc.
  uf: z.string().length(2).optional(),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Apenas letras, números e hífen"),
  plano: z.enum(["pro", "clinic"]).default("pro"),
});

export const createProfessional = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createProfessionalSchema.parse(data))
  .handler(async ({ data }): Promise<{ slug: string }> => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) throw new Error("Não autenticado");

    // Auto-sync: cria user no DB a partir do Clerk se ainda não existir.
    const user = await getOrCreateUser(auth.userId);

    // Guard: one professional per user
    const existing = await db.query.professionals.findFirst({
      where: eq(professionals.userId, user.id),
    });
    if (existing) return { slug: existing.slug };

    // Guard: slug must be unique
    const slugTaken = await db.query.professionals.findFirst({
      where: eq(professionals.slug, data.slug),
    });
    if (slugTaken) throw new Error("Esse endereço já está em uso. Tente outro.");

    await db.insert(professionals).values({
      userId: user.id,
      nomeCompleto: data.nomeCompleto,
      especialidade: data.especialidade,
      registro: data.registro,
      uf: data.uf ?? null,
      slug: data.slug,
      ativo: true,
      plano: data.plano,
    });

    return { slug: data.slug };
  });

/**
 * Checks if a slug is available (client can call while typing).
 */
export const checkSlugAvailability = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(2) }).parse(data))
  .handler(async ({ data }): Promise<{ available: boolean }> => {
    const existing = await db.query.professionals.findFirst({
      where: eq(professionals.slug, data.slug),
    });
    return { available: !existing };
  });
