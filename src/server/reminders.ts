import { and, eq, gte, isNull, lt } from "drizzle-orm";
import { db } from "../db";
import { appointments, subscriptions } from "../db/schema";
import { sendReminderEmail } from "../lib/email";
import { sendWhatsAppReminder } from "../lib/whatsapp";

// ─── Vercel Cron: /api/cron/reminders  (schedule: "0 9 * * *") ───────────────
// ⚠️ PLANO HOBBY: Vercel permite apenas 1 execução de cron por dia.
// Atualmente roda às 9h da manhã (UTC), o que cobre apenas consultas das ~10:50-11:10
// daquele dia. Para cobertura completa, upgrade para plano Pro (cron hourly) ou
// usar serviço externo (cron-job.org / Upstash QStash) chamando este endpoint a cada hora.
//
// Dispara lembretes para consultas que começam entre 1h50m e 2h10m a partir de
// agora — janela de 20 minutos para cobrir qualquer defasagem de execução do cron.

export async function handleReminders(request: Request): Promise<Response> {
  // Vercel injeta o header Authorization: Bearer {CRON_SECRET} em produção.
  // Localmente o header não é enviado, então aceitamos se não houver CRON_SECRET.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + 110 * 60 * 1000); // now + 1h50m
  const windowEnd = new Date(now.getTime() + 130 * 60 * 1000); // now + 2h10m

  // Busca agendamentos confirmados na janela, sem lembrete enviado ainda
  const upcoming = await db.query.appointments.findMany({
    where: and(
      eq(appointments.status, "confirmado"),
      gte(appointments.inicio, windowStart),
      lt(appointments.inicio, windowEnd),
      isNull(appointments.lembreteEnviadoEm),
    ),
    with: {
      patient: true,
      service: true,
      professional: {
        with: { subscription: true },
      },
    },
  });

  if (upcoming.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const appt of upcoming) {
    try {
      // ── E-mail de lembrete (todos os planos) ─────────────────────────────
      await sendReminderEmail({
        patientName: appt.patient.nome,
        patientEmail: appt.patient.email,
        professionalName: appt.professional.nomeCompleto,
        serviceName: appt.service.nome,
        appointmentStart: appt.inicio,
        professionalWhatsapp: appt.professional.telefoneWhatsapp,
      });

      // ── WhatsApp (somente planos Pro e Clinic) ────────────────────────────
      const plano = appt.professional.subscription?.plano ?? appt.professional.plano;
      const podeWhatsApp = plano === "pro" || plano === "clinic";

      if (podeWhatsApp && appt.patient.telefone) {
        try {
          await sendWhatsAppReminder({
            patientPhone: appt.patient.telefone,
            patientName: appt.patient.nome,
            professionalName: appt.professional.nomeCompleto,
            serviceName: appt.service.nome,
            appointmentStart: appt.inicio,
          });
        } catch (waErr) {
          // WhatsApp falhou → não bloqueia o lembrete por e-mail
          console.error(`[cron] WhatsApp falhou para appt ${appt.id}:`, waErr);
        }
      }

      // Marca lembrete como enviado
      await db
        .update(appointments)
        .set({ lembreteEnviadoEm: new Date() })
        .where(eq(appointments.id, appt.id));

      sent++;
    } catch (err) {
      console.error(`[cron] Erro ao processar lembrete appt ${appt.id}:`, err);
      errors.push(appt.id);
    }
  }

  return new Response(JSON.stringify({ sent, errors }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
