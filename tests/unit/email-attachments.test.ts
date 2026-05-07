import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Capture nodemailer mock state across tests. Each test begins with
// `vi.resetModules()` so email.ts re-reads SMTP_HOST and the lazy
// transporter cache is cleared.
const sendMailMock =
  vi.fn<(opts: Record<string, unknown>) => Promise<{ messageId: string }>>();
const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));

vi.mock("nodemailer", () => ({
  createTransport: createTransportMock,
}));

// Avoid pulling Prisma into the test path — `email.ts` imports `db` at
// the top level. We only exercise `sendEmail`, which doesn't touch it.
vi.mock("@/lib/db", () => ({ db: {} }));

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.MAILGUN_API_KEY;
  delete process.env.MAILGUN_DOMAIN;
  delete process.env.MAILGUN_REGION_BASE_URL;
}

beforeEach(() => {
  vi.resetModules();
  sendMailMock.mockReset();
  sendMailMock.mockResolvedValue({ messageId: "<smtp-test>" });
  createTransportMock.mockClear();
  resetEnv();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("sendEmail — SMTP path with attachments", () => {
  beforeEach(() => {
    process.env.SMTP_HOST = "localhost";
    process.env.SMTP_PORT = "1025";
  });

  it("forwards an inline attachment to nodemailer with cid === filename", async () => {
    const { sendEmail } = await import("@/lib/email");

    await sendEmail({
      to: "guest@example.com",
      subject: "Test",
      html: '<img src="cid:rsvp-qr.png" />',
      attachments: [
        {
          filename: "rsvp-qr.png",
          content: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
          inline: true,
          contentType: "image/png",
        },
      ],
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const call = sendMailMock.mock.calls[0][0] as unknown as {
      attachments?: Array<{
        filename: string;
        content: Buffer;
        contentType?: string;
        cid?: string;
      }>;
    };
    expect(call.attachments).toHaveLength(1);
    expect(call.attachments![0].filename).toBe("rsvp-qr.png");
    expect(call.attachments![0].cid).toBe("rsvp-qr.png");
    expect(call.attachments![0].contentType).toBe("image/png");
  });

  it("forwards a non-inline attachment without cid", async () => {
    const { sendEmail } = await import("@/lib/email");

    await sendEmail({
      to: "guest@example.com",
      subject: "Test",
      html: "<p>hi</p>",
      attachments: [
        {
          filename: "report.pdf",
          content: Buffer.from([0x25, 0x50, 0x44, 0x46]),
          contentType: "application/pdf",
        },
      ],
    });

    const call = sendMailMock.mock.calls[0][0] as unknown as {
      attachments?: Array<{ cid?: string }>;
    };
    expect(call.attachments![0].cid).toBeUndefined();
  });

  it("does not pass attachments when omitted (existing callers unchanged)", async () => {
    const { sendEmail } = await import("@/lib/email");

    await sendEmail({
      to: "guest@example.com",
      subject: "Test",
      html: "<p>hi</p>",
    });

    const call = sendMailMock.mock.calls[0][0] as unknown as {
      attachments?: unknown;
    };
    expect(call.attachments).toBeUndefined();
  });
});

describe("sendEmail — Mailgun path with attachments", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.MAILGUN_API_KEY = "key-test";
    process.env.MAILGUN_DOMAIN = "mg.example.com";

    fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: "<mailgun-test>", message: "Queued." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("appends inline attachments under the 'inline' field name", async () => {
    const { sendEmail } = await import("@/lib/email");

    await sendEmail({
      to: "guest@example.com",
      subject: "Test",
      html: '<img src="cid:rsvp-qr.png" />',
      attachments: [
        {
          filename: "rsvp-qr.png",
          content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          inline: true,
          contentType: "image/png",
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeInstanceOf(FormData);
    const fd = init.body as FormData;

    // The "inline" key should be present with a Blob value, and the
    // Blob's filename (third FormData.append arg) should match the
    // CID reference in the HTML body.
    const inlineEntry = fd.get("inline");
    expect(inlineEntry).toBeInstanceOf(Blob);
    // Browser FormData on Node: the appended File/Blob has a `name`.
    expect((inlineEntry as File).name).toBe("rsvp-qr.png");
    expect((inlineEntry as Blob).type).toBe("image/png");
    expect(fd.get("attachment")).toBeNull();
  });

  it("appends non-inline attachments under the 'attachment' field name", async () => {
    const { sendEmail } = await import("@/lib/email");

    await sendEmail({
      to: "guest@example.com",
      subject: "Test",
      html: "<p>hi</p>",
      attachments: [
        {
          filename: "report.pdf",
          content: Buffer.from([0x25, 0x50, 0x44, 0x46]),
          contentType: "application/pdf",
        },
      ],
    });

    const fd = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(fd.get("attachment")).toBeInstanceOf(Blob);
    expect((fd.get("attachment") as File).name).toBe("report.pdf");
    expect((fd.get("attachment") as Blob).type).toBe("application/pdf");
    expect(fd.get("inline")).toBeNull();
  });

  it("does not set Content-Type manually on the Mailgun request", async () => {
    const { sendEmail } = await import("@/lib/email");

    await sendEmail({
      to: "guest@example.com",
      subject: "Test",
      html: "<p>hi</p>",
      attachments: [
        {
          filename: "rsvp-qr.png",
          content: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
          inline: true,
          contentType: "image/png",
        },
      ],
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = (init.headers ?? {}) as Record<string, string>;
    // fetch derives the boundary itself; manually setting Content-Type
    // corrupts the multipart boundary and the request fails.
    expect(headers["Content-Type"]).toBeUndefined();
    expect(headers["content-type"]).toBeUndefined();
  });

  it("falls back to application/octet-stream when contentType is missing", async () => {
    const { sendEmail } = await import("@/lib/email");

    await sendEmail({
      to: "guest@example.com",
      subject: "Test",
      html: "<p>hi</p>",
      attachments: [
        {
          filename: "blob.bin",
          content: Buffer.from([0x00, 0x01]),
        },
      ],
    });

    const fd = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect((fd.get("attachment") as Blob).type).toBe("application/octet-stream");
  });

  it("does not include attachment keys when none are provided", async () => {
    const { sendEmail } = await import("@/lib/email");

    await sendEmail({
      to: "guest@example.com",
      subject: "Test",
      html: "<p>hi</p>",
    });

    const fd = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(fd.get("inline")).toBeNull();
    expect(fd.get("attachment")).toBeNull();
  });
});
