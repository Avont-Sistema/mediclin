import { createServerFn } from "@tanstack/react-start";
import { and, eq, gte, lt, lte, not } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import {
  appointments,
  availabilityBlocks,
  availabilityRules,
  patients,
  professionals,
  services,
} from "../db/schema";
import type { diasSemanaEnum } from "../db/schema";

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
    return prof ?? null;
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
      patient: z.object({
        nome: z.string().min(2),
        email: z.string().email(),
        telefone: z.string().min(8),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const { professionalId, serviceId, dateStr, timeSlot, duracaoMinutos, patient } = data;

    const [y, mo, d] = dateStr.split("-").map(Number);
    const [h, m] = timeSlot.split(":").map(Number);
    const inicio = new Date(y, mo - 1, d, h, m, 0);
    const fim = new Date(inicio.getTime() + duracaoMinutos * 60_000);

    // Upsert patient by email
    const [pat] = await db
      .insert(patients)
      .values(patient)
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
        status: "aguardando_pagamento",
      })
      .returning();

    return { appointmentId: appt.id };
  });
