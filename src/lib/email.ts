import { Resend } from "resend";
import { getAppBaseUrl } from "./app-config";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurado");
  return new Resend(key);
}

const FROM = "CuidandoVC <notificacoes@cuidandovc.com.br>";

// ─── Templates ───────────────────────────────────────────────────────────────

function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function formatCurrency(value: string | number): string {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function baseHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CuidandoVC</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d9488,#059669);padding:24px 32px;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <div style="width:14px;height:14px;background:#fff;transform:rotate(45deg);border-radius:2px;"></div>
        </div>
        <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">CuidandoVC</span>
      </div>
    </div>
    <!-- Content -->
    <div style="padding:32px;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="background:#f1f5f9;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        Você está recebendo este e-mail porque agendou uma consulta via CuidandoVC.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Confirmação de agendamento ───────────────────────────────────────────────

export type ConfirmationEmailData = {
  patientName: string;
  patientEmail: string;
  professionalName: string;
  serviceName: string;
  appointmentStart: Date;
  valor: string;
};

export async function sendBookingConfirmation(data: ConfirmationEmailData): Promise<void> {
  const resend = getResend();

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
      ✅ Consulta confirmada!
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">
      Olá, <strong>${data.patientName}</strong>! Seu pagamento foi aprovado e sua consulta está agendada.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;width:120px;">Profissional</td>
          <td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600;">${data.professionalName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;">Serviço</td>
          <td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600;">${data.serviceName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;">Data e hora</td>
          <td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600;">${formatDateTime(data.appointmentStart)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;">Valor pago</td>
          <td style="padding:6px 0;font-size:13px;color:#059669;font-weight:700;">${formatCurrency(data.valor)}</td>
        </tr>
      </table>
    </div>

    <p style="margin:0;font-size:14px;color:#64748b;">
      Você receberá um lembrete 2 horas antes da consulta. Em caso de dúvidas, entre em contato diretamente com o profissional.
    </p>
  `;

  await resend.emails.send({
    from: FROM,
    to: data.patientEmail,
    subject: `✅ Consulta confirmada — ${data.serviceName}`,
    html: baseHtml(content),
  });
}

// ─── Lembrete 2h antes ───────────────────────────────────────────────────────

export type ReminderEmailData = {
  patientName: string;
  patientEmail: string;
  professionalName: string;
  serviceName: string;
  appointmentStart: Date;
  professionalWhatsapp?: string | null;
};

export async function sendReminderEmail(data: ReminderEmailData): Promise<void> {
  const resend = getResend();

  const whatsappLine = data.professionalWhatsapp
    ? `<p style="margin:16px 0 0;font-size:14px;color:#64748b;">
        Precisa reagendar? Fale pelo WhatsApp:
        <a href="https://wa.me/${data.professionalWhatsapp.replace(/\D/g, "")}" style="color:#0d9488;">
          ${data.professionalWhatsapp}
        </a>
      </p>`
    : "";

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
      🔔 Lembrete de consulta
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">
      Olá, <strong>${data.patientName}</strong>! Sua consulta começa em <strong>2 horas</strong>.
    </p>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;width:120px;">Profissional</td>
          <td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600;">${data.professionalName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;">Serviço</td>
          <td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600;">${data.serviceName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;">Horário</td>
          <td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600;">${formatDateTime(data.appointmentStart)}</td>
        </tr>
      </table>
    </div>

    <p style="margin:0;font-size:14px;color:#64748b;">
      Prepare-se com antecedência e chegue no horário marcado. Boa consulta! 🍀
    </p>
    ${whatsappLine}
  `;

  await resend.emails.send({
    from: FROM,
    to: data.patientEmail,
    subject: `🔔 Lembrete — sua consulta começa em 2 horas`,
    html: baseHtml(content),
  });
}

// ─── Notificação ao profissional (novo agendamento) ───────────────────────────

export type ProfessionalBookingNotificationData = {
  professionalEmail: string;
  professionalName: string;
  patientName: string;
  serviceName: string;
  appointmentStart: Date;
  valor: string;
};

export async function sendNewBookingNotification(
  data: ProfessionalBookingNotificationData,
): Promise<void> {
  const resend = getResend();
  const baseUrl = await getAppBaseUrl();

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
      📅 Novo agendamento confirmado
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">
      Olá, <strong>${data.professionalName}</strong>! Você tem uma nova consulta agendada e paga.
    </p>

    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;width:120px;">Paciente</td>
          <td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600;">${data.patientName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;">Serviço</td>
          <td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600;">${data.serviceName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;">Data e hora</td>
          <td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600;">${formatDateTime(data.appointmentStart)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;">Valor recebido</td>
          <td style="padding:6px 0;font-size:13px;color:#059669;font-weight:700;">${formatCurrency(data.valor)}</td>
        </tr>
      </table>
    </div>

    <p style="margin:0;font-size:14px;color:#64748b;">
      O valor já foi depositado na sua conta Mercado Pago, descontada a taxa da plataforma. Acesse seu
      <a href="${baseUrl}/dashboard" style="color:#0d9488;">painel</a> para ver todos os detalhes.
    </p>
  `;

  const footer = `
    <div style="background:#f1f5f9;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        Você recebe este e-mail porque é um profissional cadastrado no CuidandoVC.
      </p>
    </div>
  `;

  // Build HTML manually so the footer text differs from the patient template
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CuidandoVC</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0d9488,#059669);padding:24px 32px;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <div style="width:14px;height:14px;background:#fff;transform:rotate(45deg);border-radius:2px;"></div>
        </div>
        <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">CuidandoVC</span>
      </div>
    </div>
    <div style="padding:32px;">${content}</div>
    ${footer}
  </div>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to: data.professionalEmail,
    subject: `📅 Novo agendamento — ${data.patientName}`,
    html,
  });
}
