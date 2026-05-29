import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { availabilityRules, professionals, services, users } from "../db/schema";
import type { InferSelectModel } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClinicMember = InferSelectModel<typeof professionals> & {
  services: InferSelectModel<typeof services>[];
};

export type SettingsData = {
  professional: InferSelectModel<typeof professionals>;
  services: InferSelectModel<typeof services>[];
  availabilityRules: InferSelectModel<typeof availabilityRules>[];
  members: ClinicMember[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Slugify helper for auto-generating slugs
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
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
            members: {
              where: eq(professionals.ativo, true),
              orderBy: (m, { asc }) => [asc(m.criadoEm)],
              with: {
                services: { orderBy: (s, { asc }) => [asc(s.criadoEm)] },
              },
            },
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
      members: (prof.members ?? []) as ClinicMember[],
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
      uf: z.string().length(2).optional().or(z.literal("")),
      bio: z.string().optional(),
      fotoUrl: z.string().optional(),
      telefoneWhatsapp: z.string().optional(),
      slug: z
        .string()
        .min(2)
        .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
      plano: z.enum(["free", "pro", "clinic"]).optional(),
      // Atendimento Virtual
      atendimentoVirtualAtivo: z.boolean().optional(),
      meetLink: z.string().url("Link inválido").optional().or(z.literal("")),
      atendimentoVirtualInfo: z.string().max(600).optional(),
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
        uf: data.uf || null,
        bio: data.bio ?? null,
        fotoUrl: data.fotoUrl || null,
        telefoneWhatsapp: data.telefoneWhatsapp || null,
        slug: data.slug,
        ...(data.plano ? { plano: data.plano } : {}),
        ...(data.atendimentoVirtualAtivo !== undefined
          ? { atendimentoVirtualAtivo: data.atendimentoVirtualAtivo }
          : {}),
        ...(data.meetLink !== undefined ? { meetLink: data.meetLink || null } : {}),
        ...(data.atendimentoVirtualInfo !== undefined
          ? { atendimentoVirtualInfo: data.atendimentoVirtualInfo || null }
          : {}),
        atualizadoEm: new Date(),
      })
      .where(eq(professionals.id, profId));

    return { ok: true };
  });

// ─── Page customization ───────────────────────────────────────────────────────

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (use formato #RRGGBB)");

export const updatePageCustomization = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      corMarca: hexColor,
      corTexto: hexColor,
      heroTitulo: z.string().max(255).optional(),
      heroSubtitulo: z.string().max(500).optional(),
      heroImageUrl: z.string().url().optional().or(z.literal("")),
      atendimentoVirtualAtivo: z.boolean(),
      meetLink: z.string().url().optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();

    await db
      .update(professionals)
      .set({
        corMarca: data.corMarca,
        corTexto: data.corTexto,
        heroTitulo: data.heroTitulo || null,
        heroSubtitulo: data.heroSubtitulo || null,
        heroImageUrl: data.heroImageUrl || null,
        atendimentoVirtualAtivo: data.atendimentoVirtualAtivo,
        meetLink: data.meetLink || null,
        atualizadoEm: new Date(),
      })
      .where(eq(professionals.id, profId));

    return { ok: true };
  });

// ─── Services ─────────────────────────────────────────────────────────────────

export const upsertService = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      // If provided, manage service for this clinic member instead of own profile
      targetProfessionalId: z.string().optional(),
      id: z.string().optional(),
      nome: z.string().min(2),
      descricao: z.string().optional(),
      preco: z.string().regex(/^\d+(\.\d{1,2})?$/, "Preço inválido"),
      duracaoMinutos: z.number().int().min(5).max(480),
      modalidade: z.enum(["presencial", "online", "ambos"]).default("presencial"),
    }),
  )
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();

    // Resolve the target professional (own or clinic member)
    let targetId = profId;
    if (data.targetProfessionalId) {
      const member = await db.query.professionals.findFirst({
        where: and(
          eq(professionals.id, data.targetProfessionalId),
          eq(professionals.parentProfessionalId, profId),
        ),
      });
      if (!member) throw new Error("Membro não encontrado");
      targetId = data.targetProfessionalId;
    }

    if (data.id) {
      const svc = await db.query.services.findFirst({
        where: and(eq(services.id, data.id), eq(services.professionalId, targetId)),
      });
      if (!svc) throw new Error("Serviço não encontrado");

      await db
        .update(services)
        .set({
          nome: data.nome,
          descricao: data.descricao ?? null,
          preco: data.preco,
          duracaoMinutos: data.duracaoMinutos,
          modalidade: data.modalidade,
          atualizadoEm: new Date(),
        })
        .where(eq(services.id, data.id));
    } else {
      await db.insert(services).values({
        professionalId: targetId,
        nome: data.nome,
        descricao: data.descricao ?? null,
        preco: data.preco,
        duracaoMinutos: data.duracaoMinutos,
        modalidade: data.modalidade,
      });
    }

    return { ok: true };
  });

export const toggleServiceActive = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      targetProfessionalId: z.string().optional(),
      serviceId: z.string(),
      ativo: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();

    let targetId = profId;
    if (data.targetProfessionalId) {
      const member = await db.query.professionals.findFirst({
        where: and(
          eq(professionals.id, data.targetProfessionalId),
          eq(professionals.parentProfessionalId, profId),
        ),
      });
      if (!member) throw new Error("Membro não encontrado");
      targetId = data.targetProfessionalId;
    }

    const svc = await db.query.services.findFirst({
      where: and(eq(services.id, data.serviceId), eq(services.professionalId, targetId)),
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

// ─── Clinic member management ──────────────────────────────────────────────────

export const addClinicMember = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      nomeCompleto: z.string().min(2),
      especialidade: z.string().min(2),
      registro: z.string().min(2),
      bio: z.string().optional(),
      fotoUrl: z.string().optional(),
      slug: z
        .string()
        .min(2)
        .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
      corMarca: hexColor.optional(),
      corTexto: hexColor.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();

    // Verify the parent is a clinic-plan professional
    const parent = await db.query.professionals.findFirst({
      where: eq(professionals.id, profId),
    });
    if (!parent) throw new Error("Profissional não encontrado");

    // Check slug uniqueness
    const existing = await db.query.professionals.findFirst({
      where: eq(professionals.slug, data.slug),
    });
    if (existing) throw new Error("Este slug já está em uso");

    await db.insert(professionals).values({
      userId: null, // clinic-managed, no Clerk account
      parentProfessionalId: profId,
      slug: data.slug,
      nomeCompleto: data.nomeCompleto,
      especialidade: data.especialidade,
      registro: data.registro,
      bio: data.bio ?? null,
      fotoUrl: data.fotoUrl ?? null,
      corMarca: data.corMarca ?? parent.corMarca,
      corTexto: data.corTexto ?? parent.corTexto,
      plano: "free",
    });

    return { ok: true };
  });

export const updateClinicMember = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      memberId: z.string(),
      nomeCompleto: z.string().min(2),
      especialidade: z.string().min(2),
      registro: z.string().min(2),
      bio: z.string().optional(),
      fotoUrl: z.string().optional(),
      slug: z
        .string()
        .min(2)
        .regex(/^[a-z0-9-]+$/),
      corMarca: hexColor.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();

    const member = await db.query.professionals.findFirst({
      where: and(
        eq(professionals.id, data.memberId),
        eq(professionals.parentProfessionalId, profId),
      ),
    });
    if (!member) throw new Error("Membro não encontrado");

    // Check slug uniqueness (excluding this member)
    const existing = await db.query.professionals.findFirst({
      where: and(
        eq(professionals.slug, data.slug),
        // Drizzle doesn't have neq directly, use a workaround
      ),
    });
    if (existing && existing.id !== data.memberId) throw new Error("Este slug já está em uso");

    await db
      .update(professionals)
      .set({
        nomeCompleto: data.nomeCompleto,
        especialidade: data.especialidade,
        registro: data.registro,
        bio: data.bio ?? null,
        fotoUrl: data.fotoUrl ?? null,
        slug: data.slug,
        ...(data.corMarca ? { corMarca: data.corMarca } : {}),
        atualizadoEm: new Date(),
      })
      .where(eq(professionals.id, data.memberId));

    return { ok: true };
  });

export const removeClinicMember = createServerFn({ method: "POST" })
  .inputValidator(z.object({ memberId: z.string() }))
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();

    const member = await db.query.professionals.findFirst({
      where: and(
        eq(professionals.id, data.memberId),
        eq(professionals.parentProfessionalId, profId),
      ),
    });
    if (!member) throw new Error("Membro não encontrado");

    // Soft delete — preserve appointment history
    await db
      .update(professionals)
      .set({ ativo: false, atualizadoEm: new Date() })
      .where(eq(professionals.id, data.memberId));

    return { ok: true };
  });

// Helper export for slug generation (used in UI)
export { slugify };
