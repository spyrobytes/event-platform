import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Spies for the SMTP transport — `processEmail()` ultimately calls
// `sendEmail()`, which routes through nodemailer when SMTP_HOST is set.
const sendMailMock =
  vi.fn<(opts: Record<string, unknown>) => Promise<{ messageId: string }>>();
const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));

vi.mock("nodemailer", () => ({
  createTransport: createTransportMock,
}));

const generateQrPngBufferMock = vi.fn<(url: string) => Promise<Buffer>>();
const buildPassUrlMock = vi.fn((passId: string) => `https://example.test/invite/pass/${passId}`);

vi.mock("@/lib/qr", () => ({
  buildPassUrl: buildPassUrlMock,
  generateQrPngBuffer: generateQrPngBufferMock,
  QR_ATTACHMENT_FILENAME: "rsvp-qr.png",
}));

const renderMock = vi.fn<(arg: unknown) => Promise<string>>(async () => "<html>rendered</html>");
vi.mock("@react-email/components", () => ({
  render: renderMock,
}));

vi.mock("@/emails/InviteEmail", () => ({
  InviteEmail: (props: unknown) => ({ template: "INVITE", props }),
}));
vi.mock("@/emails/ConfirmationEmail", () => ({
  ConfirmationEmail: (props: unknown) => ({ template: "CONFIRMATION", props }),
}));
vi.mock("@/emails/ReminderEmail", () => ({
  ReminderEmail: (props: unknown) => ({ template: "REMINDER", props }),
}));
vi.mock("@/emails/VerificationEmail", () => ({
  VerificationEmail: (props: unknown) => ({ template: "VERIFICATION", props }),
}));
vi.mock("@/emails/PasswordResetEmail", () => ({
  PasswordResetEmail: (props: unknown) => ({ template: "PASSWORD_RESET", props }),
}));
vi.mock("@/emails/NoResponseReminderEmail", () => ({
  NoResponseReminderEmail: (props: unknown) => ({ template: "NO_RESPONSE_REMINDER", props }),
}));

type EmailRow = {
  id: string;
  template: "INVITE" | "CONFIRMATION";
  toEmail: string;
  subject: string;
  payload: Record<string, unknown>;
  inviteId: string | null;
  status: string;
};

const dbState = {
  email: null as EmailRow | null,
  inviteRow: null as { passId: string } | null,
};

const emailOutboxUpdateManyMock =
  vi.fn<(arg: unknown) => Promise<{ count: number }>>(async () => ({ count: 1 }));
const emailOutboxFindUniqueMock =
  vi.fn<(arg: unknown) => Promise<EmailRow | null>>(async () => dbState.email);
const emailOutboxUpdateMock =
  vi.fn<(arg: unknown) => Promise<unknown>>(async () => ({}));
const inviteFindUniqueMock =
  vi.fn<(arg: unknown) => Promise<{ passId: string } | null>>(async () => dbState.inviteRow);
const inviteUpdateMock =
  vi.fn<(arg: unknown) => Promise<{ eventId: string }>>(async () => ({ eventId: "evt-1" }));
const eventUpdateManyMock =
  vi.fn<(arg: unknown) => Promise<{ count: number }>>(async () => ({ count: 0 }));

vi.mock("@/lib/db", () => ({
  db: {
    emailOutbox: {
      updateMany: emailOutboxUpdateManyMock,
      findUnique: emailOutboxFindUniqueMock,
      update: emailOutboxUpdateMock,
    },
    invite: {
      findUnique: inviteFindUniqueMock,
      update: inviteUpdateMock,
    },
    event: {
      updateMany: eventUpdateManyMock,
    },
  },
}));

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.MAILGUN_API_KEY;
  delete process.env.MAILGUN_DOMAIN;
  delete process.env.MAILGUN_REGION_BASE_URL;
  process.env.SMTP_HOST = "localhost";
  process.env.SMTP_PORT = "1025";
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

beforeEach(() => {
  vi.resetModules();
  sendMailMock.mockReset();
  sendMailMock.mockResolvedValue({ messageId: "<smtp-test>" });
  createTransportMock.mockClear();
  generateQrPngBufferMock.mockReset();
  generateQrPngBufferMock.mockResolvedValue(PNG);
  buildPassUrlMock.mockClear();
  renderMock.mockClear();
  emailOutboxUpdateManyMock.mockClear();
  emailOutboxUpdateManyMock.mockResolvedValue({ count: 1 });
  emailOutboxFindUniqueMock.mockClear();
  emailOutboxUpdateMock.mockClear();
  inviteFindUniqueMock.mockClear();
  inviteFindUniqueMock.mockImplementation(async () => dbState.inviteRow);
  inviteUpdateMock.mockClear();
  eventUpdateManyMock.mockClear();
  dbState.email = null;
  dbState.inviteRow = null;
  resetEnv();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

type ConfirmationOverrides = {
  payload?: Record<string, unknown>;
  inviteId?: string | null;
  response?: "YES" | "NO" | "MAYBE";
  withPassId?: boolean;
};

function confirmationRow(opts: ConfirmationOverrides = {}): EmailRow {
  const response = opts.response ?? "YES";
  const basePayload: Record<string, unknown> = {
    guestName: "Jess",
    eventTitle: "Test Event",
    response,
    guestCount: 1,
  };
  if (opts.withPassId ?? true) {
    basePayload.passId = "pass-abc";
  }
  return {
    id: "outbox-1",
    template: "CONFIRMATION",
    toEmail: "guest@example.com",
    subject: "RSVP received",
    inviteId: opts.inviteId === undefined ? "invite-1" : opts.inviteId,
    status: "QUEUED",
    payload: opts.payload ?? basePayload,
  };
}

describe("processEmail() — CONFIRMATION branch QR attachment", () => {
  it("attaches inline QR PNG and renders with qrAvailable: true when response=YES and passId is in payload", async () => {
    dbState.email = confirmationRow();
    const { processEmail } = await import("@/lib/email");

    await processEmail("outbox-1");

    // QR generated against the payload's passId — no fallback DB lookup.
    expect(generateQrPngBufferMock).toHaveBeenCalledTimes(1);
    expect(buildPassUrlMock).toHaveBeenCalledWith("pass-abc");
    expect(inviteFindUniqueMock).not.toHaveBeenCalled();

    // Template received qrAvailable: true.
    expect(renderMock).toHaveBeenCalledTimes(1);
    const renderedArg = renderMock.mock.calls[0][0] as {
      template: string;
      props: { qrAvailable: boolean; response: string };
    };
    expect(renderedArg.template).toBe("CONFIRMATION");
    expect(renderedArg.props.qrAvailable).toBe(true);
    expect(renderedArg.props.response).toBe("YES");

    // SMTP call carries the inline attachment.
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const sendArg = sendMailMock.mock.calls[0][0] as {
      attachments?: Array<{ filename: string; cid?: string; contentType?: string; content: Buffer }>;
    };
    expect(sendArg.attachments).toHaveLength(1);
    expect(sendArg.attachments![0].filename).toBe("rsvp-qr.png");
    expect(sendArg.attachments![0].cid).toBe("rsvp-qr.png");
    expect(sendArg.attachments![0].contentType).toBe("image/png");
    expect(sendArg.attachments![0].content).toBe(PNG);
  });

  it("response=MAYBE skips the QR pipeline entirely — no findUnique, no generation, no attachment", async () => {
    dbState.email = confirmationRow({ response: "MAYBE" });
    const { processEmail } = await import("@/lib/email");

    await processEmail("outbox-1");

    expect(generateQrPngBufferMock).not.toHaveBeenCalled();
    expect(inviteFindUniqueMock).not.toHaveBeenCalled();

    const renderedArg = renderMock.mock.calls[0][0] as {
      props: { qrAvailable: boolean; response: string };
    };
    expect(renderedArg.props.qrAvailable).toBe(false);
    expect(renderedArg.props.response).toBe("MAYBE");

    const sendArg = sendMailMock.mock.calls[0][0] as { attachments?: unknown[] };
    expect(sendArg.attachments).toBeUndefined();
  });

  it("response=NO skips the QR pipeline entirely", async () => {
    dbState.email = confirmationRow({ response: "NO" });
    const { processEmail } = await import("@/lib/email");

    await processEmail("outbox-1");

    expect(generateQrPngBufferMock).not.toHaveBeenCalled();
    expect(inviteFindUniqueMock).not.toHaveBeenCalled();

    const renderedArg = renderMock.mock.calls[0][0] as {
      props: { qrAvailable: boolean; response: string };
    };
    expect(renderedArg.props.qrAvailable).toBe(false);
    expect(renderedArg.props.response).toBe("NO");

    const sendArg = sendMailMock.mock.calls[0][0] as { attachments?: unknown[] };
    expect(sendArg.attachments).toBeUndefined();
  });

  it("response=YES, payload omits passId → fallback Invite lookup, then attaches QR", async () => {
    dbState.email = confirmationRow({ withPassId: false });
    dbState.inviteRow = { passId: "pass-from-db" };

    const { processEmail } = await import("@/lib/email");
    await processEmail("outbox-1");

    expect(inviteFindUniqueMock).toHaveBeenCalledTimes(1);
    expect(inviteFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      select: { passId: true },
    });
    expect(buildPassUrlMock).toHaveBeenCalledWith("pass-from-db");

    const renderedArg = renderMock.mock.calls[0][0] as { props: { qrAvailable: boolean } };
    expect(renderedArg.props.qrAvailable).toBe(true);

    const sendArg = sendMailMock.mock.calls[0][0] as { attachments?: unknown[] };
    expect(sendArg.attachments).toHaveLength(1);
  });

  it("response=YES, fallback lookup misses → confirmation sends with qrAvailable: false, no attachment", async () => {
    dbState.email = confirmationRow({ withPassId: false });
    dbState.inviteRow = null;

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { processEmail } = await import("@/lib/email");
    await processEmail("outbox-1");

    expect(generateQrPngBufferMock).not.toHaveBeenCalled();
    const renderedArg = renderMock.mock.calls[0][0] as { props: { qrAvailable: boolean } };
    expect(renderedArg.props.qrAvailable).toBe(false);

    const sendArg = sendMailMock.mock.calls[0][0] as { attachments?: unknown[] };
    expect(sendArg.attachments).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("response=YES, fallback lookup throws → confirmation still sends; outer catch is not triggered", async () => {
    dbState.email = confirmationRow({ withPassId: false });
    inviteFindUniqueMock.mockRejectedValueOnce(new Error("db blip"));

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { processEmail } = await import("@/lib/email");

    await expect(processEmail("outbox-1")).resolves.toBeUndefined();

    // Generation never ran (lookup failed before reaching it).
    expect(generateQrPngBufferMock).not.toHaveBeenCalled();

    const renderedArg = renderMock.mock.calls[0][0] as { props: { qrAvailable: boolean } };
    expect(renderedArg.props.qrAvailable).toBe(false);

    const sendArg = sendMailMock.mock.calls[0][0] as { attachments?: unknown[] };
    expect(sendArg.attachments).toBeUndefined();

    // Outbox row was marked SENT — the DB blip did NOT cascade into the
    // outer processEmail catch.
    const updateArg = emailOutboxUpdateMock.mock.calls[0][0] as {
      data: { status: string };
    };
    expect(updateArg.data.status).toBe("SENT");

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("response=YES, QR generation throws → confirmation still sends with qrAvailable: false", async () => {
    dbState.email = confirmationRow();
    generateQrPngBufferMock.mockRejectedValueOnce(new Error("qrcode boom"));

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { processEmail } = await import("@/lib/email");

    await expect(processEmail("outbox-1")).resolves.toBeUndefined();

    const renderedArg = renderMock.mock.calls[0][0] as { props: { qrAvailable: boolean } };
    expect(renderedArg.props.qrAvailable).toBe(false);

    const sendArg = sendMailMock.mock.calls[0][0] as { attachments?: unknown[] };
    expect(sendArg.attachments).toBeUndefined();

    // Email row was marked SENT (success path), not FAILED.
    expect(emailOutboxUpdateMock).toHaveBeenCalledTimes(1);
    const updateArg = emailOutboxUpdateMock.mock.calls[0][0] as {
      data: { status: string };
    };
    expect(updateArg.data.status).toBe("SENT");

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("INVITE emails are unaffected — no QR call, no attachment, never queries Invite for passId", async () => {
    dbState.email = {
      id: "outbox-2",
      template: "INVITE",
      toEmail: "guest@example.com",
      subject: "You're invited",
      inviteId: "invite-2",
      status: "QUEUED",
      payload: {
        eventTitle: "Test Event",
        eventDate: "Saturday, Jan 1",
        eventTime: "6:00 PM",
        hostName: "Host",
        rsvpUrl: "https://example.test/rsvp/tok",
      },
    };

    const { processEmail } = await import("@/lib/email");
    await processEmail("outbox-2");

    expect(generateQrPngBufferMock).not.toHaveBeenCalled();
    expect(inviteFindUniqueMock).not.toHaveBeenCalled();

    const sendArg = sendMailMock.mock.calls[0][0] as { attachments?: unknown };
    expect(sendArg.attachments).toBeUndefined();
  });
});
