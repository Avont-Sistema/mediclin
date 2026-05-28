import twilio from "twilio";

function getClient(): ReturnType<typeof twilio> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("TWILIO_ACCOUNT_SID ou TWILIO_AUTH_TOKEN não configurados");
  return twilio(sid, token);
}

// Número do WhatsApp Business da plataforma (ex: "whatsapp:+5511999990000")
// Em sandbox Twilio: "whatsapp:+14155238886"
function getSenderNumber(): string {
  return process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";
}

function normalizePhone(phone: string): string {
  // Remove tudo que não for dígito, mantém o "+" se vier do prefixo E.164
  const digits = phone.replace(/\D/g, "");
  // Adiciona +55 se não tiver DDI
  if (digits.length <= 11) return `+55${digits}`;
  return `+${digits}`;
}

export type WhatsAppReminderData = {
  patientPhone: string;
  patientName: string;
  professionalName: string;
  serviceName: string;
  appointmentStart: Date;
};

export async function sendWhatsAppReminder(data: WhatsAppReminderData): Promise<void> {
  const client = getClient();

  const hora = data.appointmentStart.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  const data_str = data.appointmentStart.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  const body =
    `🔔 *Lembrete CuidandoVC*\n\n` +
    `Olá, ${data.patientName}! Sua consulta começa em *2 horas*.\n\n` +
    `👨‍⚕️ *${data.professionalName}*\n` +
    `📋 ${data.serviceName}\n` +
    `🕐 ${data_str} às ${hora}\n\n` +
    `Boa consulta! 🍀`;

  await client.messages.create({
    from: getSenderNumber(),
    to: `whatsapp:${normalizePhone(data.patientPhone)}`,
    body,
  });
}
