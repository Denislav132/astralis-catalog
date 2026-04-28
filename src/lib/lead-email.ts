import nodemailer, { type Transporter } from "nodemailer";

type LeadNotificationInput = {
  clientName: string;
  clientPhone: string;
  productName: string;
  message: string | null;
  createdAt: string;
};

let cachedTransporter: Transporter | null = null;

function getLeadRecipients(): string[] {
  return (process.env.LEAD_NOTIFICATION_EMAILS || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function hasSmtpConfig(): boolean {
  const hasServiceConfig =
    Boolean(process.env.SMTP_SERVICE) &&
    Boolean(process.env.SMTP_USER) &&
    Boolean(process.env.SMTP_PASS);

  const hasHostConfig =
    Boolean(process.env.SMTP_HOST) &&
    Boolean(process.env.SMTP_PORT) &&
    Boolean(process.env.SMTP_USER) &&
    Boolean(process.env.SMTP_PASS);

  return hasServiceConfig || hasHostConfig;
}

function createTransporter(): Transporter | null {
  if (!hasSmtpConfig()) {
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (process.env.SMTP_SERVICE) {
    cachedTransporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: (process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return cachedTransporter;
}

function getAdminDashboardUrl(): string {
  const baseUrl =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "http://localhost:3000";

  const normalized = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
  return `${normalized.replace(/\/$/, "")}/admin/dashboard`;
}

function formatMessageText(message: string | null): string {
  return message?.trim() || "Няма допълнително съобщение.";
}

export function isLeadEmailEnabled(): boolean {
  return getLeadRecipients().length > 0 && hasSmtpConfig();
}

export async function sendLeadNotification(input: LeadNotificationInput) {
  const recipients = getLeadRecipients();
  const transporter = createTransporter();

  if (recipients.length === 0 || !transporter) {
    return { sent: false as const };
  }

  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  const dashboardUrl = getAdminDashboardUrl();
  const messageText = formatMessageText(input.message);
  const createdAtLabel = new Date(input.createdAt).toLocaleString("bg-BG", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  await transporter.sendMail({
    from: fromAddress,
    to: recipients,
    subject: `Ново запитване | ${input.productName}`,
    text: [
      "Имате ново запитване от сайта.",
      "",
      `Продукт: ${input.productName}`,
      `Клиент: ${input.clientName}`,
      `Телефон: ${input.clientPhone}`,
      `Получено: ${createdAtLabel}`,
      "",
      "Съобщение:",
      messageText,
      "",
      `CRM: ${dashboardUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1c1c1a">
        <h2 style="margin:0 0 16px">Ново запитване от сайта</h2>
        <p style="margin:0 0 16px"><strong>Продукт:</strong> ${input.productName}</p>
        <table style="border-collapse:collapse;margin:0 0 20px;width:100%;max-width:640px">
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc"><strong>Клиент</strong></td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb">${input.clientName}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc"><strong>Телефон</strong></td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb"><a href="tel:${input.clientPhone}" style="color:#b56e10;text-decoration:none">${input.clientPhone}</a></td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc"><strong>Получено</strong></td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb">${createdAtLabel}</td>
          </tr>
        </table>
        <div style="margin:0 0 20px;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#fafaf9;white-space:pre-wrap">${messageText}</div>
        <p style="margin:0">
          <a href="${dashboardUrl}" style="display:inline-block;background:#1c1c1a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">
            Отвори CRM
          </a>
        </p>
      </div>
    `,
  });

  return { sent: true as const };
}
