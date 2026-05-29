import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { z } from "zod";
import { db } from "../db";
import { appointments, users, patients, services } from "../db/schema";
import type { InferSelectModel } from "drizzle-orm";
import type { professionals } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgendaAppointment = InferSelectModel<typeof appointments> & {
  patient: InferSelectModel<typeof patients>;
  service: InferSelectModel<typeof services>;
  professional: Pick<InferSelectModel<typeof professionals>, "id" | "nomeCompleto">;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the ISO date string (YYYY-MM-DD) of the Monday of the week containing `date`. */
export function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // days to subtract to reach Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

/** Add N days to a YYYY-MM-DD string, return new YYYY-MM-DD. */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return date.toISOString().split("T")[0];
}

// ─── fetchAgendaWeek ──────────────────────────────────────────────────────────

export const fetchAgendaWeek = createServerFn({ method: "GET" })
  .inputValidator(z.object({ weekStart: z.string() })) // YYYY-MM-DD Monday
  .handler(async ({ data }): Promise<AgendaAppointment[] | null> => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) return null;

    const userRecord = await db.query.users.findFirst({
      where: eq(users.clerkId, auth.userId),
      with: { professional: true },
    });

    const profId = userRecord?.professional?.id;
    if (!profId) return null;

    const [y, m, d] = data.weekStart.split("-").map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0);
    const end = new Date(y, m - 1, d + 7, 0, 0, 0);

    const appts = await db.query.appointments.findMany({
      where: and(
        eq(appointments.professionalId, profId),
        gte(appointments.inicio, start),
        lt(appointments.inicio, end),
      ),
      with: {
        patient: true,
        service: true,
        professional: true,
      },
      orderBy: [asc(appointments.inicio)],
    });

    return appts as AgendaAppointment[];
  });

// ─── updateAppointmentStatus ──────────────────────────────────────────────────

export const updateAppointmentStatus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      appointmentId: z.string(),
      status: z.enum(["confirmado", "concluido", "cancelado", "no_show"]),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) throw new Error("Não autenticado");

    const userRecord = await db.query.users.findFirst({
      where: eq(users.clerkId, auth.userId),
      with: { professional: true },
    });

    const profId = userRecord?.professional?.id;
    if (!profId) throw new Error("Profissional não encontrado");

    const appt = await db.query.appointments.findFirst({
      where: and(eq(appointments.id, data.appointmentId), eq(appointments.professionalId, profId)),
    });
    if (!appt) throw new Error("Agendamento não encontrado");

    await db
      .update(appointments)
      .set({ status: data.status, atualizadoEm: new Date() })
      .where(eq(appointments.id, data.appointmentId));

    return { ok: true };
  });

// ─── createManualBooking ──────────────────────────────────────────────────────

export const createManualBooking = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      serviceId: z.string(),
      dateStr: z.string(), // YYYY-MM-DD
      timeSlot: z.string(), // HH:mm
      patientNome: z.string().min(2),
      patientTelefone: z.string().min(8),
      patientEmail: z.string().email().optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) throw new Error("Não autenticado");

    const userRecord = await db.query.users.findFirst({
      where: eq(users.clerkId, auth.userId),
      with: { professional: true },
    });

    const profId = userRecord?.professional?.id;
    if (!profId) throw new Error("Profissional não encontrado");

    // Verify service belongs to this professional (multi-tenant safety)
    const svc = await db.query.services.findFirst({
      where: and(eq(services.id, data.serviceId), eq(services.professionalId, profId)),
    });
    if (!svc) throw new Error("Serviço não encontrado");

    const [y, mo, d] = data.dateStr.split("-").map(Number);
    const [h, m] = data.timeSlot.split(":").map(Number);
    const inicio = new Date(y, mo - 1, d, h, m, 0);
    const fim = new Date(inicio.getTime() + svc.duracaoMinutos * 60_000);

    const emailToUse =
      data.patientEmail && data.patientEmail.length > 0
        ? data.patientEmail
        : `tel_${data.patientTelefone.replace(/\D/g, "")}@noemail.cuidandovc.com.br`;

    const [pat] = await db
      .insert(patients)
      .values({ nome: data.patientNome, telefone: data.patientTelefone, email: emailToUse })
      .onConflictDoUpdate({
        target: patients.email,
        set: { nome: data.patientNome, telefone: data.patientTelefone },
      })
      .returning();

    const [appt] = await db
      .insert(appointments)
      .values({
        professionalId: profId,
        serviceId: svc.id,
        patientId: pat.id,
        inicio,
        fim,
        status: "confirmado",
      })
      .returning();

    return { appointmentId: appt.id };
  });
