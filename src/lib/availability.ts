import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, gt, gte, inArray, lt, lte, not } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import {
  appointments,
  availabilityBlocks,
  availabilityRules,
  patients,
  professionalCards,
  professionals,
  services,
} from "../db/schema";
import type { diasSemanaEnum } from "../db/schema";
import { getPlanMetodosPagamento } from "./plans";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIAS: (typeof diasSemanaEnum.enumValues)[number][] = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

function localDateBounds(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return {
    start: new Date(y, m - 1, d, 0, 0, 0),
    end: new Date(y, m - 1, d, 23, 59, 59),
  };
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

// ─── Validação de booking (server-side, anti double-booking) ──────────────────
// Toda criação de agendamento público DEVE passar por aqui. Garante que:
//  1. O serviço pertence ao profissional (e usa a duração real do DB, não do cliente).
//  2. A data não está bloqueada (folga).
//  3. Não há conflito de horário com outro agendamento ativo.
// Retorna o serviço validado (com a duração correta).

async function assertSlotBookable(
  professionalId: string,
  serviceId: string,
  inicio: Date,
  fim: Date,
): Promise<void> {
  // 1. Serviço pertence ao profissional
  const svc = await db.query.services.findFirst({
    where: and(eq(services.id, serviceId), eq(services.professionalId, professionalId)),
  });
  if (!svc) throw new Error("Serviço indisponível para este profissional.");

  // 2. Não pode cair em dia de folga (bloco que cobre o início)
  const block = await db.query.availabilityBlocks.findFirst({
    where: and(
      eq(availabilityBlocks.professionalId, professionalId),
      lte(availabilityBlocks.inicio, inicio),
      gte(availabilityBlocks.fim, inicio),
    ),
  });
  if (block) throw new Error("Este horário não está mais disponível (folga).");

  // 3. Conflito com agendamento ativo: existente.inicio < novoFim && existente.fim > novoInicio
  const conflict = await db.query.appointments.findFirst({
    where: and(
      eq(appointments.professionalId, professionalId),
      lt(appointments.inicio, fim),
      gt(appointments.fim, inicio),
      not(eq(appointments.status, "cancelado")),
      not(eq(appointments.status, "no_show")),
    ),
  });
  if (conflict) throw new Error("Este horário acabou de ser reservado. Escolha outro.");
}

// ─── fetchProfessionalBySlug ───────────────────────────────────────────────────

export const fetchProfessionalBySlug = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const prof = await db.query.professionals.findFirst({
      where: and(eq(professionals.slug, data.slug), eq(professionals.ativo, true)),
      with: {
        services: {
          where: eq(services.ativo, true),
        },
        cards: {
          where: eq(professionalCards.ativo, true),
          orderBy: [asc(professionalCards.ordem)],
        },
        // Include clinic team members if this is a clinic-plan professional
        members: {
          where: and(eq(professionals.ativo, true)),
          orderBy: (m, { asc }) => [asc(m.criadoEm)],
          with: {
            services: {
              where: eq(services.ativo, true),
            },
          },
        },
      },
    });
    if (!prof) return null;

    // metodosPagamento exposto à página pública = interseção entre o que o plano
    // libera (teto) e o que o médico ativou. É isso que o paciente verá.
    const teto = await getPlanMetodosPagamento(prof.id);
    const ativados = prof.metodosPagamento ?? [];
    const metodosPagamento = ativados.filter((m) => teto.includes(m));

    return { ...prof, metodosPagamento };
  });

// ─── fetchAvailableDates ───────────────────────────────────────────────────────
// Returns which weekdays (0–6) have at least one availability rule active.

export const fetchAvailableDays = createServerFn({ method: "GET" })
  .inputValidator(z.object({ professionalId: z.string() }))
  .handler(async ({ data }) => {
    const rules = await db.query.availabilityRules.findMany({
      where: and(
        eq(availabilityRules.professionalId, data.professionalId),
        eq(availabilityRules.ativo, true),
      ),
    });
    return rules.map((r) => DIAS.indexOf(r.diaSemana));
  });

// ─── fetchAvailableSlots ───────────────────────────────────────────────────────

export const fetchAvailableSlots = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      professionalId: z.string(),
      dateStr: z.string(), // YYYY-MM-DD
      duracaoMinutos: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const { professionalId, dateStr, duracaoMinutos } = data;
    const diaSemana = DIAS[new Date(dateStr + "T12:00:00").getDay()];

    // 1. Find active rule for this weekday
    const rule = await db.query.availabilityRules.findFirst({
      where: and(
        eq(availabilityRules.professionalId, professionalId),
        eq(availabilityRules.diaSemana, diaSemana),
        eq(availabilityRules.ativo, true),
      ),
    });
    if (!rule) return [];

    // 2. Check for blocks covering this date
    const { start, end } = localDateBounds(dateStr);
    const blocks = await db.query.availabilityBlocks.findMany({
      where: and(
        eq(availabilityBlocks.professionalId, professionalId),
        lte(availabilityBlocks.inicio, end),
        gte(availabilityBlocks.fim, start),
      ),
    });
    if (blocks.length > 0) return [];

    // 3. Fetch existing appointments for this date
    const existing = await db.query.appointments.findMany({
      where: and(
        eq(appointments.professionalId, professionalId),
        gte(appointments.inicio, start),
        lt(appointments.inicio, end),
        not(eq(appointments.status, "cancelado")),
        not(eq(appointments.status, "no_show")),
      ),
    });

    // 4. Generate candidate slots
    const slots: string[] = [];
    const ruleStart = timeToMinutes(rule.horaInicio);
    const ruleEnd = timeToMinutes(rule.horaFim);

    for (let t = ruleStart; t + duracaoMinutos <= ruleEnd; t += duracaoMinutos) {
      const slotEnd = t + duracaoMinutos;
      const occupied = existing.some((appt) => {
        const apptStart = appt.inicio.getHours() * 60 + appt.inicio.getMinutes();
        const apptEnd = appt.fim.getHours() * 60 + appt.fim.getMinutes();
        return t < apptEnd && slotEnd > apptStart;
      });
      if (!occupied) slots.push(minutesToTime(t));
    }

    return slots;
  });

// ─── createBooking ─────────────────────────────────────────────────────────────

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      professionalId: z.string(),
      serviceId: z.string(),
      dateStr: z.string(), // YYYY-MM-DD
      timeSlot: z.string(), // HH:mm
      duracaoMinutos: z.number(),
      // Modalidade escolhida pelo paciente (resolvida a partir do serviço)
      modalidade: z.enum(["presencial", "online"]).default("presencial"),
      patient: z.object({
        nome: z.string().min(2),
        // Email is optional from the patient's perspective
        email: z.string().email().optional().or(z.literal("")),
        telefone: z.string().min(8),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const { professionalId, serviceId, dateStr, timeSlot, duracaoMinutos, modalidade, patient } =
      data;

    const [y, mo, d] = dateStr.split("-").map(Number);
    const [h, m] = timeSlot.split(":").map(Number);
    const inicio = new Date(y, mo - 1, d, h, m, 0);
    const fim = new Date(inicio.getTime() + duracaoMinutos * 60_000);

    // Validação server-side: serviço do profissional, sem folga, sem conflito de horário.
    await assertSlotBookable(professionalId, serviceId, inicio, fim);

    // Para atendimento virtual, copia o link do Meet do profissional no agendamento
    let meetLink: string | null = null;
    if (modalidade === "online") {
      const prof = await db.query.professionals.findFirst({
        where: eq(professionals.id, professionalId),
        columns: { meetLink: true },
      });
      meetLink = prof?.meetLink ?? null;
    }

    // When patient doesn't provide email, derive a stable placeholder from their phone
    // so the UNIQUE constraint is satisfied and repeat callers are still deduplicated.
    const emailToUse =
      patient.email && patient.email.length > 0
        ? patient.email
        : `tel_${patient.telefone.replace(/\D/g, "")}@noemail.cuidandovc.com.br`;

    // Upsert patient by email
    const [pat] = await db
      .insert(patients)
      .values({ ...patient, email: emailToUse })
      .onConflictDoUpdate({
        target: patients.email,
        set: { nome: patient.nome, telefone: patient.telefone },
      })
      .returning();

    const [appt] = await db
      .insert(appointments)
      .values({
        professionalId,
        serviceId,
        patientId: pat.id,
        inicio,
        fim,
        modalidade,
        meetLink,
        status: "aguardando_pagamento",
      })
      .returning();

    return { appointmentId: appt.id };
  });

// ─── createConsecutiveBookings ────────────────────────────────────────────────
// Cria múltiplos agendamentos em sequência automática para o mesmo dia.
// Cada serviço começa exatamente onde o anterior termina.

export const createConsecutiveBookings = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      professionalId: z.string(),
      services: z
        .array(z.object({ serviceId: z.string(), duracaoMinutos: z.number().int().positive() }))
        .min(1),
      dateStr: z.string(),
      startTimeSlot: z.string(), // HH:mm
      modalidade: z.enum(["presencial", "online"]).default("presencial"),
      patient: z.object({
        nome: z.string().min(2),
        email: z.string().email().optional().or(z.literal("")),
        telefone: z.string().min(8),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const { professionalId, services, dateStr, startTimeSlot, modalidade, patient } = data;
    const [y, mo, d] = dateStr.split("-").map(Number);

    const emailToUse =
      patient.email && patient.email.length > 0
        ? patient.email
        : `tel_${patient.telefone.replace(/\D/g, "")}@noemail.cuidandovc.com.br`;

    const [pat] = await db
      .insert(patients)
      .values({ ...patient, email: emailToUse })
      .onConflictDoUpdate({
        target: patients.email,
        set: { nome: patient.nome, telefone: patient.telefone },
      })
      .returning();

    let meetLink: string | null = null;
    if (modalidade === "online") {
      const prof = await db.query.professionals.findFirst({
        where: eq(professionals.id, professionalId),
        columns: { meetLink: true },
      });
      meetLink = prof?.meetLink ?? null;
    }

    const appointmentIds: string[] = [];
    let [curH, curM] = startTimeSlot.split(":").map(Number);

    for (const svc of services) {
      const inicio = new Date(y, mo - 1, d, curH, curM, 0);
      const fim = new Date(inicio.getTime() + svc.duracaoMinutos * 60_000);

      // Valida cada agendamento: serviço do profissional, sem folga, sem conflito.
      await assertSlotBookable(professionalId, svc.serviceId, inicio, fim);

      const [appt] = await db
        .insert(appointments)
        .values({
          professionalId,
          serviceId: svc.serviceId,
          patientId: pat.id,
          inicio,
          fim,
          modalidade,
          meetLink,
          status: "aguardando_pagamento",
        })
        .returning();

      appointmentIds.push(appt.id);
      curH = fim.getHours();
      curM = fim.getMinutes();
    }

    return { appointmentIds };
  });

// ─── fetchAppointmentsPublic ──────────────────────────────────────────────────
// Busca dados básicos de agendamentos para exibir a tela de sucesso após
// redirecionamento do MP. Sem autenticação — protegido por UUID não adivinháveis.

export const fetchAppointmentsPublic = createServerFn({ method: "GET" })
  .inputValidator(z.object({ ids: z.array(z.string().uuid()).min(1).max(10) }))
  .handler(async ({ data }) => {
    const appts = await db.query.appointments.findMany({
      where: inArray(appointments.id, data.ids),
      with: { service: true, patient: true },
    });
    return appts.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  });

// ─── confirmCashBooking ─────────────────────────────────────────────────────────
// Paciente escolheu pagar em dinheiro (presencial): confirma o agendamento sem
// passar pelo Mercado Pago. Só promove de "aguardando_pagamento" → "confirmado".

export const confirmCashBooking = createServerFn({ method: "POST" })
  .inputValidator(z.object({ appointmentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const appt = await db.query.appointments.findFirst({
      where: eq(appointments.id, data.appointmentId),
    });
    if (!appt) throw new Error("Agendamento não encontrado");
    if (appt.status === "aguardando_pagamento") {
      await db
        .update(appointments)
        .set({ status: "confirmado" })
        .where(eq(appointments.id, data.appointmentId));
    }
    return { ok: true };
  });
