import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Setup mirrors `email-qr.test.ts` but exercises the Mailgun (fetch) path
// to validate IndeterminateSendError handling. Confirmed-failure path is
// also covered to assert the FAILED transition still happens.

vi.mock("nodemailer", () => ({
  createTransport: vi.fn(() => ({ sendMail: vi.fn() })),
}));

vi.mock("@/lib/qr", () => ({
  buildPassUrl: (passId: string) => `https://example.test/invite/pass/${passId}`,
  generateQrPngBuffer: vi.fn(async () => Buffer.from([0x89])),
  QR_ATTACHMENT_FILENAME: "rsvp-qr.png",
}));

vi.mock("@react-email/components", () => ({
  render: vi.fn(async () => "<html>rendered</html>"),
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
  NoResponseReminderEmail: (props: unknown) => ({
    template: "NO_RESPONSE_REMINDER",
    props,
  }),
}));

type EmailRow = {
  id: string;
  template: "INVITE";
  toEmail: string;
  subject: string;
  payload: Record<string, unknown>;
  inviteId: string | null;
  status: string;
};

const dbState = { email: null as EmailRow | null };

const emailOutboxUpdateManyMock = vi.fn(async () => ({ count: 1 }));
const emailOutboxFindUniqueMock = vi.fn(async () => dbState.email);
const emailOutboxFindManyMock = vi.fn(async () => [] as unknown[]);
const emailOutboxUpdateMock = vi.fn(async () => ({}));
const inviteFindUniqueMock = vi.fn(async () => null);
const inviteFindManyMock = vi.fn(async () => [] as unknown[]);
const inviteUpdateMock = vi.fn(async () => ({ eventId: "evt-1" }));
const eventUpdateManyMock = vi.fn(async () => ({ count: 0 }));

vi.mock("@/lib/db", () => ({
  db: {
    emailOutbox: {
      updateMany: emailOutboxUpdateManyMock,
      findUnique: emailOutboxFindUniqueMock,
      findMany: emailOutboxFindManyMock,
      update: emailOutboxUpdateMock,
    },
    invite: {
      findUnique: inviteFindUniqueMock,
      findMany: inviteFindManyMock,
      update: inviteUpdateMock,
    },
    event: { updateMany: eventUpdateManyMock },
  },
}));

const ORIGINAL_ENV = { ...process.env };

function setMailgunMode() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.SMTP_HOST;
  process.env.MAILGUN_API_KEY = "test-key";
  process.env.MAILGUN_DOMAIN = "mg.example.test";
  process.env.MAILGUN_REGION_BASE_URL = "https://api.mailgun.test";
}

function inviteRow(): EmailRow {
  return {
    id: "outbox-1",
    template: "INVITE",
    toEmail: "guest@example.com",
    subject: "Test invite",
    inviteId: "invite-1",
    status: "QUEUED",
    payload: {
      guestName: "Jess",
      eventTitle: "Test Event",
      eventDate: "Sat",
      eventTime: "6PM",
      hostName: "Host",
      rsvpUrl: "https://example.test/rsvp/x",
    },
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.resetModules();
  setMailgunMode();
  emailOutboxUpdateManyMock.mockClear();
  emailOutboxUpdateManyMock.mockResolvedValue({ count: 1 });
  emailOutboxFindUniqueMock.mockClear();
  emailOutboxFindManyMock.mockClear();
  emailOutboxFindManyMock.mockResolvedValue([]);
  emailOutboxUpdateMock.mockClear();
  inviteFindUniqueMock.mockClear();
  inviteFindManyMock.mockClear();
  inviteFindManyMock.mockResolvedValue([]);
  inviteUpdateMock.mockClear();
  eventUpdateManyMock.mockClear();
  dbState.email = inviteRow();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe("processEmail() — indeterminate Mailgun failures", () => {
  it("does NOT flip to FAILED when fetch throws AbortError", async () => {
    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error("aborted"), { name: "AbortError" })
    );

    const { processEmail } = await import("@/lib/email");

    // Should resolve (not throw) so the cron loop's per-email try/catch
    // doesn't classify this as a hard failure.
    await expect(processEmail("outbox-1")).resolves.toBeUndefined();

    // Two updateMany calls expected:
    //   1. The atomic claim (QUEUED -> SENDING) at the top of processEmail.
    //   2. The indeterminate-branch update that records the error message
    //      while leaving status untouched.
    expect(emailOutboxUpdateManyMock).toHaveBeenCalledTimes(2);

    type UpdateCall = {
      where: { id: string; status: string };
      data: Record<string, unknown>;
    };
    const calls = emailOutboxUpdateManyMock.mock.calls as unknown as UpdateCall[][];

    const claimCall = calls[0][0];
    expect(claimCall.where.status).toBe("QUEUED");
    expect(claimCall.data.status).toBe("SENDING");

    const indeterminateCall = calls[1][0];
    expect(indeterminateCall.where.status).toBe("SENDING");
    expect(indeterminateCall.data).not.toHaveProperty("status");
    expect(indeterminateCall.data.error).toContain("Mailgun send did not receive a response");
    // Cause name is appended for operator triage.
    expect(indeterminateCall.data.error).toContain("(AbortError)");

    // Most importantly, no FAILED transition.
    expect(calls.some((c) => c[0].data.status === "FAILED")).toBe(false);
  });

  it("does NOT flip to FAILED when fetch throws a TypeError (network/DNS)", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    const { processEmail } = await import("@/lib/email");

    await expect(processEmail("outbox-1")).resolves.toBeUndefined();

    type UpdateCall = {
      where: { id: string; status: string };
      data: Record<string, unknown>;
    };
    const calls = emailOutboxUpdateManyMock.mock.calls as unknown as UpdateCall[][];
    expect(calls.some((c) => c[0].data.status === "FAILED")).toBe(false);
    // TypeError surfaces as a different cause-name, distinguishable from
    // AbortError without log-diving.
    const indeterminate = calls.find(
      (c) => c[0].where.status === "SENDING" && !c[0].data.status
    );
    expect(indeterminate?.[0].data.error).toContain("(TypeError)");
  });

  it("DOES flip to FAILED when Mailgun returns a 4xx with body (confirmed failure)", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("Bad recipient", { status: 400 })
    );

    const { processEmail } = await import("@/lib/email");

    // Confirmed failure re-throws, matching pre-PR behavior.
    await expect(processEmail("outbox-1")).rejects.toThrow(/Mailgun error: 400/);

    type UpdateCall = { data: { status?: string } };
    const calls = emailOutboxUpdateManyMock.mock.calls as unknown as UpdateCall[][];
    expect(calls.some((c) => c[0].data.status === "FAILED")).toBe(true);
  });

  it("DOES flip to FAILED on a 5xx (confirmed failure path is unchanged)", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("Internal", { status: 500 })
    );

    const { processEmail } = await import("@/lib/email");

    await expect(processEmail("outbox-1")).rejects.toThrow(/Mailgun error: 500/);

    type UpdateCall = { data: { status?: string } };
    const calls = emailOutboxUpdateManyMock.mock.calls as unknown as UpdateCall[][];
    expect(calls.some((c) => c[0].data.status === "FAILED")).toBe(true);
  });

  it("preserves the underlying cause on IndeterminateSendError", async () => {
    const { IndeterminateSendError } = await import("@/lib/email");
    const root = new Error("original network failure");
    const err = new IndeterminateSendError("wrapper message", root);

    expect(err.name).toBe("IndeterminateSendError");
    expect(err.message).toBe("wrapper message");
    expect(err.cause).toBe(root);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("processQueuedEmails() — recovery sweep filter", () => {
  it("reclaims SENDING rows only when error IS NULL (skips indeterminate)", async () => {
    // No queued emails so the function exits after the sweep.
    emailOutboxFindManyMock.mockResolvedValue([]);
    inviteFindManyMock.mockResolvedValue([]);

    const { processQueuedEmails } = await import("@/lib/email");
    await processQueuedEmails();

    type UpdateCall = {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    const calls = emailOutboxUpdateManyMock.mock.calls as unknown as UpdateCall[][];

    // The first updateMany in the sweep is the SENDING reclaim — not the
    // FAILED retry. Identify by the data shape: reclaim sets status QUEUED.
    const reclaimCall = calls.find(
      (c) => c[0].where.status === "SENDING" && c[0].data.status === "QUEUED"
    );
    expect(reclaimCall).toBeDefined();
    // The whole point of this test: indeterminate rows (which carry an
    // `error` message) must be excluded from auto-re-queue.
    expect(reclaimCall?.[0].where.error).toBeNull();
  });

  it("FAILED retry path is unfiltered by error (only attempt cap + age)", async () => {
    emailOutboxFindManyMock.mockResolvedValue([]);
    inviteFindManyMock.mockResolvedValue([]);

    const { processQueuedEmails } = await import("@/lib/email");
    await processQueuedEmails();

    type UpdateCall = {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    const calls = emailOutboxUpdateManyMock.mock.calls as unknown as UpdateCall[][];
    const failedRetry = calls.find(
      (c) => c[0].where.status === "FAILED" && c[0].data.status === "QUEUED"
    );
    expect(failedRetry).toBeDefined();
    // FAILED rows always carry an error message — filtering on error: null
    // here would defeat the retry. Sanity-check that we did NOT add it.
    expect(failedRetry?.[0].where).not.toHaveProperty("error");
  });
});

