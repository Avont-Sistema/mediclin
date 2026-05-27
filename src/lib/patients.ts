import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { appointments, patients, users } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PatientSummary = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  totalConsultas: number;
  ultimaConsulta: string | null; // ISO string
  ultimoServico: string | null;
};

export type PatientAppointment = {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  observacoes: string | null;
  service: { nome: string; duracaoMinutos: number };
};

export type PatientDetail = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cpf: string | null;
  criadoEm: string;
  appointments: PatientAppointment[];
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

// ─── listPatients ─────────────────────────────────────────────────────────────

/**
 * Returns all patients who have (or had) at least one appointment with this
 * professional, aggregated with total consultation count and last visit date.
 */
export const listPatients = createServerFn({ method: "GET" }).handler(
  async (): Promise<PatientSummary[]> => {
    const profId = await getAuthProfId();

    // Fetch all appointments (newest first) with patient + service
    const appts = await db.query.appointments.findMany({
      where: eq(appointments.professionalId, profId),
      with: { patient: true, service: true },
      orderBy: [desc(appointments.inicio)],
    });

    // Aggregate by patient (Map preserves insertion order → already newest-first)
    const map = new Map<string, PatientSummary>();
    for (const appt of appts) {
      const pid = appt.patient.id;
      if (!map.has(pid)) {
        map.set(pid, {
          id: pid,
          nome: appt.patient.nome,
          telefone: appt.patient.telefone,
          email: appt.patient.email,
          totalConsultas: 1,
          ultimaConsulta: appt.inicio.toISOString(),
          ultimoServico: appt.service.nome,
        });
      } else {
        map.get(pid)!.totalConsultas++;
      }
    }

    return [...map.values()];
  },
);

// ─── getPatientDetail ─────────────────────────────────────────────────────────

/** Full patient profile + all appointments with this professional (newest first). */
export const getPatientDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ patientId: z.string().uuid() }))
  .handler(async ({ data }): Promise<PatientDetail | null> => {
    const profId = await getAuthProfId();

    const patient = await db.query.patients.findFirst({
      where: eq(patients.id, data.patientId),
    });
    if (!patient) return null;

    const appts = await db.query.appointments.findMany({
      where: and(
        eq(appointments.patientId, data.patientId),
        eq(appointments.professionalId, profId),
      ),
      with: { service: true },
      orderBy: [desc(appointments.inicio)],
    });

    return {
      id: patient.id,
      nome: patient.nome,
      telefone: patient.telefone,
      email: patient.email,
      cpf: patient.cpf ?? null,
      criadoEm: patient.criadoEm.toISOString(),
      appointments: appts.map((a) => ({
        id: a.id,
        inicio: a.inicio.toISOString(),
        fim: a.fim.toISOString(),
        status: a.status,
        observacoes: a.observacoes ?? null,
        service: { nome: a.service.nome, duracaoMinutos: a.service.duracaoMinutos },
      })),
    };
  });

// ─── updateAppointmentNotes ───────────────────────────────────────────────────

/** Saves (or clears) the doctor's notes for a single consultation. */
export const updateAppointmentNotes = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      appointmentId: z.string().uuid(),
      observacoes: z.string().max(5000),
    }),
  )
  .handler(async ({ data }) => {
    const profId = await getAuthProfId();

    // Ownership check
    const appt = await db.query.appointments.findFirst({
      where: and(eq(appointments.id, data.appointmentId), eq(appointments.professionalId, profId)),
    });
    if (!appt) throw new Error("Agendamento não encontrado");

    await db
      .update(appointments)
      .set({ observacoes: data.observacoes || null, atualizadoEm: new Date() })
      .where(eq(appointments.id, data.appointmentId));

    return { ok: true };
  });
