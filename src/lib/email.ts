import { render } from "@react-email/components";
import { createTransport, type Transporter } from "nodemailer";
import { db } from "./db";
import { InviteEmail } from "@/emails/InviteEmail";
import { ConfirmationEmail } from "@/emails/ConfirmationEmail";
import { ReminderEmail } from "@/emails/ReminderEmail";
import { VerificationEmail } from "@/emails/VerificationEmail";
import type { EmailStatus, Prisma } from "@prisma/client";

// Mailgun configuration (production)
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_BASE_URL = process.env.MAILGUN_REGION_BASE_URL || "https://api.mailgun.net";
const MAIL_FROM = process.env.MAIL_FROM || "Events <noreply@eventsfixer.com>";

// SMTP configuration (local development with Mailpit)
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "1025", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

// Detect email transport mode
const isSmtpMode = !!SMTP_HOST;

// Lazy-initialized SMTP transporter
let smtpTransporter: Transporter | null = null;

function getSmtpTransporter(): Transporter {
  if (!smtpTransporter) {
    smtpTransporter = createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false, // Mailpit doesn't use TLS
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }
  return smtpTransporter;
}

type MailgunResponse = {
  id: string;
  message: string;
};

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: string[];
};

/**
 * Send an email via SMTP (local dev) or Mailgun (production)
 */
export async function sendEmail(options: SendEmailOptions): Promise<MailgunResponse> {
  if (isSmtpMode) {
    return sendEmailViaSMTP(options);
  }
  return sendEmailViaMailgun(options);
}

/**
 * Send an email via SMTP (Mailpit for local development)
 */
async function sendEmailViaSMTP(options: SendEmailOptions): Promise<MailgunResponse> {
  const transporter = getSmtpTransporter();

  const info = await transporter.sendMail({
    from: MAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  // Return a Mailgun-compatible response
  return {
    id: info.messageId || `smtp-${Date.now()}`,
    message: "Queued. Thank you.",
  };
}

/**
 * Send an email via Mailgun API (production)
 */
async function sendEmailViaMailgun(options: SendEmailOptions): Promise<MailgunResponse> {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    throw new Error(
      "Email configuration missing. Set MAILGUN_API_KEY and MAILGUN_DOMAIN for production, or SMTP_HOST for local development."
    );
  }

  const formData = new FormData();
  formData.append("from", MAIL_FROM);
  formData.append("to", options.to);
  formData.append("subject", options.subject);
  formData.append("html", options.html);

  if (options.text) {
    formData.append("text", options.text);
  }

  if (options.tags) {
    options.tags.forEach((tag) => formData.append("o:tag", tag));
  }

  const response = await fetch(
    `${MAILGUN_BASE_URL}/v3/${MAILGUN_DOMAIN}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64")}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mailgun error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<MailgunResponse>;
}

type InviteEmailPayload = {
  guestName?: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation?: string;
  eventDescription?: string;
  hostName: string;
  rsvpUrl: string;
};

type ConfirmationEmailPayload = {
  guestName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation?: string;
  response: "YES" | "NO" | "MAYBE";
  guestCount: number;
  hostName: string;
};

type ReminderEmailPayload = {
  guestName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation?: string;
  hostName: string;
  eventUrl: string;
  guestCount: number;
};

type VerificationEmailPayload = {
  verificationUrl: string;
  expiresInHours: number;
};

/**
 * Queue an invite email for sending
 */
export async function queueInviteEmail(
  inviteId: string,
  toEmail: string,
  payload: InviteEmailPayload
): Promise<string> {
  const subject = `You're invited to ${payload.eventTitle}`;

  const emailRecord = await db.emailOutbox.create({
    data: {
      inviteId,
      template: "INVITE",
      toEmail,
      subject,
      payload: payload as Prisma.InputJsonValue,
      status: "QUEUED",
    },
  });

  return emailRecord.id;
}

/**
 * Queue a confirmation email for sending
 */
export async function queueConfirmationEmail(
  inviteId: string | null,
  toEmail: string,
  payload: ConfirmationEmailPayload
): Promise<string> {
  const subject =
    payload.response === "YES"
      ? `You're confirmed for ${payload.eventTitle}!`
      : payload.response === "NO"
        ? `RSVP received for ${payload.eventTitle}`
        : `RSVP received for ${payload.eventTitle}`;

  const emailRecord = await db.emailOutbox.create({
    data: {
      inviteId,
      template: "CONFIRMATION",
      toEmail,
      subject,
      payload: payload as Prisma.InputJsonValue,
      status: "QUEUED",
    },
  });

  return emailRecord.id;
}

/**
 * Queue a reminder email for sending
 */
export async function queueReminderEmail(
  inviteId: string,
  toEmail: string,
  payload: ReminderEmailPayload
): Promise<string> {
  const subject = `Reminder: ${payload.eventTitle} is tomorrow!`;

  const emailRecord = await db.emailOutbox.create({
    data: {
      inviteId,
      template: "REMINDER",
      toEmail,
      subject,
      payload: payload as Prisma.InputJsonValue,
      status: "QUEUED",
    },
  });

  return emailRecord.id;
}

/**
 * Queue a verification email for sending
 */
export async function queueVerificationEmail(
  toEmail: string,
  payload: VerificationEmailPayload
): Promise<string> {
  const subject = "Verify your email address for EventsFixer";

  const emailRecord = await db.emailOutbox.create({
    data: {
      template: "VERIFICATION",
      toEmail,
      subject,
      payload: payload as Prisma.InputJsonValue,
      status: "QUEUED",
    },
  });

  return emailRecord.id;
}

/**
 * Process and send a queued email
 */
export async function processEmail(emailId: string): Promise<void> {
  const email = await db.emailOutbox.findUnique({
    where: { id: emailId },
  });

  if (!email || email.status !== "QUEUED") {
    return;
  }

  // Mark as sending
  await db.emailOutbox.update({
    where: { id: emailId },
    data: { status: "SENDING" },
  });

  try {
    const payload = email.payload as Record<string, unknown>;
    let html: string;

    switch (email.template) {
      case "INVITE":
        html = await render(InviteEmail(payload as unknown as InviteEmailPayload));
        break;
      case "CONFIRMATION":
        html = await render(ConfirmationEmail(payload as unknown as ConfirmationEmailPayload));
        break;
      case "REMINDER":
        html = await render(ReminderEmail(payload as unknown as ReminderEmailPayload));
        break;
      case "VERIFICATION":
        html = await render(VerificationEmail(payload as unknown as VerificationEmailPayload));
        break;
      default:
        throw new Error(`Unknown template: ${email.template}`);
    }

    const result = await sendEmail({
      to: email.toEmail,
      subject: email.subject,
      html,
      tags: [email.template.toLowerCase()],
    });

    // Update status to sent
    await db.emailOutbox.update({
      where: { id: emailId },
      data: {
        status: "SENT",
        providerMessageId: result.id,
        sentAt: new Date(),
      },
    });

    // Update invite status if this is an invite email
    if (email.inviteId && email.template === "INVITE") {
      await db.invite.update({
        where: { id: email.inviteId },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });
    }
  } catch (error) {
    // Mark as failed
    await db.emailOutbox.update({
      where: { id: emailId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error;
  }
}

/**
 * Process all queued emails (batch processing)
 */
export async function processQueuedEmails(limit = 10): Promise<number> {
  const queuedEmails = await db.emailOutbox.findMany({
    where: { status: "QUEUED" },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  let processed = 0;
  for (const email of queuedEmails) {
    try {
      await processEmail(email.id);
      processed++;
    } catch (error) {
      console.error(`Failed to process email ${email.id}:`, error);
    }
  }

  return processed;
}

/**
 * Update email status from Mailgun webhook
 */
export async function updateEmailStatus(
  providerMessageId: string,
  status: EmailStatus,
  timestamp?: Date
): Promise<void> {
  const updateData: Record<string, unknown> = { status };

  if (status === "DELIVERED" && timestamp) {
    updateData.deliveredAt = timestamp;
  } else if (status === "OPENED" && timestamp) {
    updateData.openedAt = timestamp;
  }

  const email = await db.emailOutbox.updateMany({
    where: { providerMessageId },
    data: updateData,
  });

  // If email was bounced, update the invite status too
  if (status === "BOUNCED" && email.count > 0) {
    const emailRecord = await db.emailOutbox.findFirst({
      where: { providerMessageId },
      select: { inviteId: true },
    });

    if (emailRecord?.inviteId) {
      await db.invite.update({
        where: { id: emailRecord.inviteId },
        data: { status: "BOUNCED" },
      });
    }
  }

  // If email was opened and it's an invite, update invite status
  if (status === "OPENED") {
    const emailRecord = await db.emailOutbox.findFirst({
      where: { providerMessageId },
      select: { inviteId: true, template: true },
    });

    if (emailRecord?.inviteId && emailRecord.template === "INVITE") {
      await db.invite.update({
        where: { id: emailRecord.inviteId },
        data: {
          status: "OPENED",
          openedAt: timestamp || new Date(),
        },
      });
    }
  }
}

/**
 * Get email statistics for an event
 */
export async function getEmailStats(eventId: string): Promise<{
  total: number;
  queued: number;
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
  bounced: number;
}> {
  const inviteIds = await db.invite.findMany({
    where: { eventId },
    select: { id: true },
  });

  const ids = inviteIds.map((i) => i.id);

  if (ids.length === 0) {
    return {
      total: 0,
      queued: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      failed: 0,
      bounced: 0,
    };
  }

  const stats = await db.emailOutbox.groupBy({
    by: ["status"],
    where: {
      inviteId: { in: ids },
    },
    _count: true,
  });

  const result = {
    total: 0,
    queued: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    failed: 0,
    bounced: 0,
  };

  for (const stat of stats) {
    const count = stat._count;
    result.total += count;

    switch (stat.status) {
      case "QUEUED":
        result.queued = count;
        break;
      case "SENDING":
      case "SENT":
        result.sent += count;
        break;
      case "DELIVERED":
        result.delivered = count;
        break;
      case "OPENED":
        result.opened = count;
        break;
      case "FAILED":
        result.failed = count;
        break;
      case "BOUNCED":
        result.bounced = count;
        break;
    }
  }

  return result;
}

/**
 * Resend a failed email
 */
export async function resendEmail(emailId: string): Promise<string> {
  const email = await db.emailOutbox.findUnique({
    where: { id: emailId },
  });

  if (!email) {
    throw new Error("Email not found");
  }

  if (email.status !== "FAILED" && email.status !== "BOUNCED") {
    throw new Error("Can only resend failed or bounced emails");
  }

  // Create a new email record
  const newEmail = await db.emailOutbox.create({
    data: {
      inviteId: email.inviteId,
      template: email.template,
      toEmail: email.toEmail,
      subject: email.subject,
      payload: email.payload || {},
      status: "QUEUED",
    },
  });

  return newEmail.id;
}
