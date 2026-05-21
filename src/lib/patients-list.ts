import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { appointments, users } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PatientRow = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  totalConsultas: number;
  ultimaConsulta: Date;
  totalPago: number;
};

// ─── fetchPatientsData ────────────────────────────────────────────────────────

export const fetchPatientsData = createServerFn({ method: "GET" }).handler(
  async (): Promise<PatientRow[]> => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) return [];

    const userRecord = await db.query.users.findFirst({
      where: eq(users.clerkId, auth.userId),
      with: { professional: true },
    });

    const profId = userRecord?.professional?.id;
    if (!profId) return [];

    const appts = await db.query.appointments.findMany({
      where: eq(appointments.professionalId, profId),
      with: { patient: true },
      orderBy: (t, { desc }) => [desc(t.inicio)],
    });

    // Aggregate per patient
    const map = new Map<string, PatientRow>();

    for (const appt of appts) {
      const paid =
        appt.valorPago && (appt.status === "concluido" || appt.status === "confirmado")
          ? Number(appt.valorPago)
          : 0;

      const existing = map.get(appt.patientId);
      if (existing) {
        existing.totalConsultas++;
        if (appt.inicio > existing.ultimaConsulta) existing.ultimaConsulta = appt.inicio;
        existing.totalPago += paid;
      } else {
        map.set(appt.patientId, {
          id: appt.patient.id,
          nome: appt.patient.nome,
          email: appt.patient.email,
          telefone: appt.patient.telefone,
          totalConsultas: 1,
          ultimaConsulta: appt.inicio,
          totalPago: paid,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.ultimaConsulta.getTime() - a.ultimaConsulta.getTime(),
    );
  },
);
