import { render } from "@react-email/components";
import { createTransport, type Transporter } from "nodemailer";
import { db } from "./db";
import { InviteEmail } from "@/emails/InviteEmail";
import { ConfirmationEmail } from "@/emails/ConfirmationEmail";
import { ReminderEmail } from "@/emails/ReminderEmail";
import { VerificationEmail } from "@/emails/VerificationEmail";
import { PasswordResetEmail } from "@/emails/PasswordResetEmail";
import { NoResponseReminderEmail } from "@/emails/NoResponseReminderEmail";
import type { EmailStatus, Prisma } from "@prisma/client";

// Mailgun configuration (production)
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_BASE_URL = process.env.MAILGUN_REGION_BASE_URL || "https://api.mailgun.net";
const MAIL_FROM = process.env.MAIL_FROM || "Events <noreply@eventfxr.com>";

// SMTP configuration (local development with Mailpit)
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "1025", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://eventfxr.com";

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

type EmailAttachment = {
  /** Filename as it appears to the recipient. Also serves as the CID
   *  reference for inline attachments — see `inline` below. */
  filename: string;
  content: Buffer;
  /** When true, the attachment is embeddable in the HTML body via
   *  `cid:${filename}`. Mailgun's REST API has no separate CID field —
   *  the FormData filename *is* the CID. We mirror that on the SMTP
   *  path by setting nodemailer's `cid` to `filename`, so the same
   *  HTML reference works on both providers. */
  inline?: boolean;
  /** MIME type. Defaults to application/octet-stream. */
  contentType?: string;
};

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: string[];
  attachments?: EmailAttachment[];
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
    attachments: options.attachments?.map((att) => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType,
      // cid === filename so `cid:${filename}` references resolve identically
      // on Mailgun (which has no separate CID field). See EmailAttachment.inline.
      cid: att.inline ? att.filename : undefined,
    })),
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

  // Attachments: Mailgun keys inline (CID-referenced) attachments under
  // "inline" and ordinary downloads under "attachment". The filename
  // passed to FormData IS the CID identifier — there is no separate CID
  // field — so HTML must reference the attachment as `cid:${filename}`.
  if (options.attachments) {
    for (const att of options.attachments) {
      const field = att.inline ? "inline" : "attachment";
      // Wrap in a fresh Uint8Array to force a tight copy — a Buffer can be a
      // view onto a larger ArrayBuffer (e.g. when produced via `.subarray()`),
      // and passing it directly to Blob would include trailing bytes from the
      // backing store.
      const blob = new Blob([new Uint8Array(att.content)], {
        type: att.contentType ?? "application/octet-stream",
      });
      formData.append(field, blob, att.filename);
    }
  }

  // Do NOT set Content-Type manually — fetch derives the
  // `multipart/form-data; boundary=…` header from the FormData body. A
  // hand-set header corrupts the boundary and the request is rejected.
  const response = await fetch(
    `${MAILGUN_BASE_URL}/v3/${MAILGUN_DOMAIN}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64")}`,
      },
      body: formData,
      signal: AbortSignal.timeout(15_000),
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
  unsubscribeUrl?: string;
  logoUrl?: string;
  rsvpDeadline?: string;
  // Optional pre-ceremony "Traditional" sub-event — populated when the main
  // Event row's start time precedes the ceremony (i.e. there's a separate
  // cultural / traditional ceremony before the formal one).
  traditionalDate?: string;
  traditionalTime?: string;
  traditionalVenue?: string;
  traditionalAddress?: string;
  ceremonyDate?: string;
  ceremonyTime?: string;
  ceremonyVenue?: string;
  ceremonyAddress?: string;
  receptionDate?: string;
  receptionTime?: string;
  receptionVenue?: string;
  receptionAddress?: string;
  // Public-portal RSVP code — guests can also RSVP at publicRsvpUrl by typing
  // this code. Both fields must be present for the code block to render.
  rsvpCode?: string;
  publicRsvpUrl?: string;
};

type ConfirmationEmailPayload = {
  guestName: string;
  eventTitle: string;
  response: "YES" | "NO" | "MAYBE";
  guestCount: number;
  // Event date/time/location were dropped from this template — the
  // confirmation acknowledges the RSVP and routes guests to the View Event
  // Details portal CTA, which is always authoritative. Listing dates here
  // duplicated the invite email and went stale for events with multiple
  // sub-events (ceremony / reception / pre-ceremony "traditional").
  portalUrl?: string;
  unsubscribeUrl?: string;
  logoUrl?: string;
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
  unsubscribeUrl?: string;
};

type VerificationEmailPayload = {
  verificationUrl: string;
  expiresInHours: number;
};

type PasswordResetEmailPayload = {
  resetUrl: string;
  expiresInHours: number;
};

type NoResponseReminderEmailPayload = {
  guestName?: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation?: string;
  hostName: string;
  rsvpUrl: string;
  rsvpDeadline?: string;
  reminderNumber: number;
  unsubscribeUrl?: string;
};

/**
 * Build an unsubscribe URL for an invite token.
 */
export function buildUnsubscribeUrl(rawToken: string): string {
  return `${BASE_URL}/unsubscribe/${rawToken}`;
}

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
 * Queue a confirmation email for sending.
 * Accepts an optional transaction client so the outbox row can be
 * created inside an existing transaction (e.g. atomic with RSVP upsert).
 */
export async function queueConfirmationEmail(
  inviteId: string | null,
  toEmail: string,
  payload: ConfirmationEmailPayload,
  tx?: Prisma.TransactionClient
): Promise<string> {
  const client = tx ?? db;
  const subject =
    payload.response === "YES"
      ? `You're confirmed for ${payload.eventTitle}!`
      : payload.response === "NO"
        ? `RSVP received for ${payload.eventTitle}`
        : `RSVP received for ${payload.eventTitle}`;

  const emailRecord = await client.emailOutbox.create({
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
  const subject = "Verify your email address for EventFXr";

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
 * Queue a password reset email for sending
 */
export async function queuePasswordResetEmail(
  toEmail: string,
  payload: PasswordResetEmailPayload
): Promise<string> {
  const subject = "Reset your password for EventFXr";

  const emailRecord = await db.emailOutbox.create({
    data: {
      template: "PASSWORD_RESET",
      toEmail,
      subject,
      payload: payload as Prisma.InputJsonValue,
      status: "QUEUED",
    },
  });

  return emailRecord.id;
}

/**
 * Queue a no-response reminder email for sending
 */
export async function queueNoResponseReminderEmail(
  inviteId: string,
  toEmail: string,
  payload: NoResponseReminderEmailPayload
): Promise<string> {
  const subject = `Reminder: Please RSVP for ${payload.eventTitle}`;

  const emailRecord = await db.emailOutbox.create({
    data: {
      inviteId,
      template: "NO_RESPONSE_REMINDER",
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
  // Atomic claim: only one invocation can flip QUEUED -> SENDING for a given row.
  // Closes the read-then-update race between overlapping cron invocations.
  const claim = await db.emailOutbox.updateMany({
    where: { id: emailId, status: "QUEUED" },
    data: {
      status: "SENDING",
      lastAttemptAt: new Date(),
      attemptCount: { increment: 1 },
    },
  });
  if (claim.count === 0) return;

  const email = await db.emailOutbox.findUnique({
    where: { id: emailId },
  });
  if (!email) return;

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
      case "PASSWORD_RESET":
        html = await render(PasswordResetEmail(payload as unknown as PasswordResetEmailPayload));
        break;
      case "NO_RESPONSE_REMINDER":
        html = await render(NoResponseReminderEmail(payload as unknown as NoResponseReminderEmailPayload));
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
        providerMessageId: result.id?.replace(/^<|>$/g, "") ?? null,
        sentAt: new Date(),
      },
    });

    // Update invite status if this is an invite email
    if (email.inviteId && email.template === "INVITE") {
      const updatedInvite = await db.invite.update({
        where: { id: email.inviteId },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
        select: { eventId: true },
      });

      // Lock the event's URL on the first successful invite send so the
      // organizer can't rename out from under links that are now in inboxes.
      // Idempotent via updateMany + `slugLockedAt: null` filter — second and
      // subsequent sends are no-ops.
      //
      // Best-effort: the email already shipped and the invite is marked SENT.
      // Swallowing here prevents a DB blip on this update from propagating up
      // to the worker (which would re-attempt an already-sent email). If this
      // fires, the rate limit (3 per 7 days) is the secondary guardrail and
      // a future invite-send for the same event will set the lock then.
      try {
        await db.event.updateMany({
          where: { id: updatedInvite.eventId, slugLockedAt: null },
          data: { slugLockedAt: new Date() },
        });
      } catch (lockErr) {
        console.error("[slug-lock] failed to set slugLockedAt", {
          eventId: updatedInvite.eventId,
          error: lockErr,
        });
      }
    }
  } catch (error) {
    // Only flip to FAILED if the row hasn't already reached SENT — otherwise a
    // post-send error (e.g. the Invite update) would erase the truth that
    // Mailgun already accepted the message.
    await db.emailOutbox.updateMany({
      where: { id: emailId, status: { notIn: ["SENT", "DELIVERED", "OPENED"] } },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error;
  }
}

const STRANDED_SENDING_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const FAILED_RETRY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SEND_ATTEMPTS = 3;

/**
 * Reclaim rows stranded in SENDING, retry transient FAILED rows under the
 * attempt cap, and reconcile invites whose outbox row already reached
 * SENT/DELIVERED/OPENED but whose own status update was lost.
 */
async function recoverEmailOutbox(): Promise<{
  reclaimed: number;
  retried: number;
  reconciled: number;
}> {
  const sendingCutoff = new Date(Date.now() - STRANDED_SENDING_THRESHOLD_MS);
  const failedCutoff = new Date(Date.now() - FAILED_RETRY_THRESHOLD_MS);

  const reclaim = await db.emailOutbox.updateMany({
    where: { status: "SENDING", updatedAt: { lt: sendingCutoff } },
    data: { status: "QUEUED" },
  });

  // Bounded retry for FAILED rows. After MAX_SEND_ATTEMPTS the row stays
  // FAILED and needs manual triage — this avoids loops on permanently
  // broken sends (bad recipient, blocked domain, malformed payload).
  const retry = await db.emailOutbox.updateMany({
    where: {
      status: "FAILED",
      attemptCount: { lt: MAX_SEND_ATTEMPTS },
      updatedAt: { lt: failedCutoff },
    },
    data: { status: "QUEUED" },
  });

  const stuckInvites = await db.invite.findMany({
    where: {
      status: "PENDING",
      emails: {
        some: {
          template: "INVITE",
          status: { in: ["SENT", "DELIVERED", "OPENED"] },
        },
      },
    },
    select: {
      id: true,
      emails: {
        where: { template: "INVITE", status: { in: ["SENT", "DELIVERED", "OPENED"] } },
        select: { sentAt: true },
        orderBy: { sentAt: "asc" },
        take: 1,
      },
    },
  });

  for (const invite of stuckInvites) {
    await db.invite.update({
      where: { id: invite.id },
      data: {
        status: "SENT",
        sentAt: invite.emails[0]?.sentAt ?? new Date(),
      },
    });
  }

  return {
    reclaimed: reclaim.count,
    retried: retry.count,
    reconciled: stuckInvites.length,
  };
}

/**
 * Process all queued emails (batch processing)
 */
export async function processQueuedEmails(limit = 10): Promise<number> {
  const recovery = await recoverEmailOutbox();
  if (recovery.reclaimed > 0 || recovery.retried > 0 || recovery.reconciled > 0) {
    console.log("Email recovery sweep", recovery);
  }

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

const STATUS_PRIORITY: Record<EmailStatus, number> = {
  QUEUED: 0,
  SENDING: 1,
  SENT: 2,
  DELIVERED: 3,
  OPENED: 4,
  FAILED: 3,
  BOUNCED: 4,
};

/**
 * Update email status from Mailgun webhook.
 * Forward-only: a higher-priority status is never overwritten by a lower one.
 */
export async function updateEmailStatus(
  providerMessageId: string,
  status: EmailStatus,
  timestamp?: Date,
  errorDetail?: string | null
): Promise<void> {
  const existing = await db.emailOutbox.findFirst({
    where: { providerMessageId },
    select: { id: true, status: true, inviteId: true, template: true },
  });

  if (!existing) return;

  if (STATUS_PRIORITY[status] < STATUS_PRIORITY[existing.status]) {
    return;
  }

  const updateData: Record<string, unknown> = { status };

  if (status === "DELIVERED" && timestamp) {
    updateData.deliveredAt = timestamp;
  } else if (status === "OPENED" && timestamp) {
    updateData.openedAt = timestamp;
  }

  if (errorDetail && (status === "FAILED" || status === "BOUNCED")) {
    updateData.error = errorDetail;
  }

  await db.emailOutbox.update({
    where: { id: existing.id },
    data: updateData,
  });

  if (status === "BOUNCED" && existing.inviteId) {
    await db.invite.update({
      where: { id: existing.inviteId },
      data: { status: "BOUNCED" },
    });
  }

  if (status === "OPENED" && existing.inviteId && existing.template === "INVITE") {
    await db.invite.update({
      where: { id: existing.inviteId },
      data: {
        status: "OPENED",
        openedAt: timestamp || new Date(),
      },
    });
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
      template: "INVITE",
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
