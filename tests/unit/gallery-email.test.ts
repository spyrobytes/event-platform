import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
  process.env.POST_EVENT_GALLERY_ENABLED = "true";
  process.env.NEXT_PUBLIC_BASE_URL = "https://example.com";
  // gallery-email now mints a signed unsubscribe URL per recipient.
  process.env.RSVP_CODE_HMAC_KEY = "a".repeat(48);
});

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const dbMock = {
  invite: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  emailOutbox: {
    findFirst: vi.fn(),
    createMany: vi.fn(),
  },
  eventGallery: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  eventGalleryItem: { count: vi.fn() },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const verifyAuthMock = vi.fn();
vi.mock("@/lib/auth", () => ({ verifyAuth: verifyAuthMock }));

const requireEventOwnerMock = vi.fn();
const assertCanMutateMock = vi.fn();
vi.mock("@/lib/authorization", () => ({
  requireEventOwner: requireEventOwnerMock,
  assertCanMutate: assertCanMutateMock,
}));

const revalidateMock = vi.fn();
vi.mock("@/lib/revalidation", () => ({
  revalidateEventAndGallery: revalidateMock,
  revalidateEventPage: vi.fn(),
}));

// Mock getPublishedGalleryForEvent so the publish route can pull cover +
// photoCount without us reproducing the full resolver chain.
const getPublishedGalleryMock = vi.fn();
vi.mock("@/lib/gallery-data", () => ({
  getPublishedGalleryForEvent: getPublishedGalleryMock,
  getPublicGalleryItems: vi.fn(),
  GALLERY_PAGE_SIZE: 24,
  getGalleryForOrganizer: vi.fn(),
}));

// gallery-email is partially mocked: keep the real predicate-building and
// count, but use the real enqueue function so we can assert the createMany
// payload. (No mock — import the real module.)

const {
  countGalleryEmailRecipients,
  enqueueGalleryPublishedEmails,
} = await import("@/lib/gallery-email");

const { POST: postPublish } = await import(
  "@/app/api/events/[id]/gallery/[galleryId]/publish/route"
);
const { GET: getRecipientsPreview } = await import(
  "@/app/api/events/[id]/gallery/recipients-preview/route"
);

const mockUser = { id: "user_1", status: "ACTIVE" };

beforeEach(() => {
  vi.clearAllMocks();
  verifyAuthMock.mockResolvedValue(mockUser);
  requireEventOwnerMock.mockResolvedValue(undefined);
  assertCanMutateMock.mockReturnValue(undefined);
  // Default: no recent broadcast — dedupe doesn't fire.
  dbMock.emailOutbox.findFirst.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// countGalleryEmailRecipients
// ---------------------------------------------------------------------------

describe("countGalleryEmailRecipients", () => {
  it("filters to RESPONDED + YES + not-unsubscribed + not-revoked", async () => {
    dbMock.invite.count.mockResolvedValueOnce(7);
    const count = await countGalleryEmailRecipients("evt_1");
    expect(count).toBe(7);
    const where = dbMock.invite.count.mock.calls[0][0].where;
    expect(where.eventId).toBe("evt_1");
    expect(where.status).toBe("RESPONDED");
    expect(where.unsubscribedAt).toBeNull();
    expect(where.revokedAt).toBeNull();
    expect(where.email).toEqual({ not: null });
    expect(where.rsvp).toEqual({ response: "YES" });
  });
});

// ---------------------------------------------------------------------------
// enqueueGalleryPublishedEmails
// ---------------------------------------------------------------------------

describe("enqueueGalleryPublishedEmails", () => {
  it("creates one outbox row per eligible invite", async () => {
    dbMock.invite.findMany.mockResolvedValueOnce([
      {
        id: "inv_1",
        email: "a@example.com",
        name: "Ada",
        tokenHash: "h1",
        rsvp: { guestName: "Ada Lovelace" },
      },
      {
        id: "inv_2",
        email: "b@example.com",
        name: null,
        tokenHash: "h2",
        rsvp: { guestName: null },
      },
    ]);
    dbMock.emailOutbox.createMany.mockResolvedValueOnce({ count: 2 });

    const result = await enqueueGalleryPublishedEmails({
      eventId: "evt_1",
      galleryId: "gal_1",
      eventSlug: "summer-2026",
      eventTitle: "Summer Wedding",
      hostName: "Kay",
      coverUrl: "https://supabase.example/cover.webp",
      photoCount: 42,
    });

    expect(result.enqueued).toBe(2);
    const data = dbMock.emailOutbox.createMany.mock.calls[0][0].data;
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      inviteId: "inv_1",
      template: "GALLERY_PUBLISHED",
      toEmail: "a@example.com",
      status: "QUEUED",
    });
    // First row gets the RSVP guestName preference; second falls through to
    // a sensible default since both name + rsvp.guestName are null.
    expect(data[0].payload.guestName).toBe("Ada Lovelace");
    expect(data[1].payload.guestName).toBe("there");
    expect(data[0].payload.galleryUrl).toBe(
      "https://example.com/e/summer-2026/gallery",
    );
    expect(data[0].payload.coverUrl).toBe(
      "https://supabase.example/cover.webp",
    );
    expect(data[0].payload.photoCount).toBe(42);

    // Each row carries a verifiable HMAC unsubscribe URL bound to its
    // (inviteId, eventId). The signature module is mocked nowhere here —
    // we use the real implementation so the URL we ship is the one the
    // route will accept.
    const { verifyInviteUnsubscribe } = await import(
      "@/lib/invite-unsubscribe-signature"
    );
    const url = new URL(data[0].payload.unsubscribeUrl);
    expect(url.pathname).toBe("/unsubscribe/by-id");
    expect(url.searchParams.get("inviteId")).toBe("inv_1");
    expect(url.searchParams.get("eventId")).toBe("evt_1");
    expect(
      verifyInviteUnsubscribe(
        "inv_1",
        "evt_1",
        url.searchParams.get("sig")!,
      ),
    ).toBe(true);
    // Second row is signed independently with its own inviteId.
    const url2 = new URL(data[1].payload.unsubscribeUrl);
    expect(url2.searchParams.get("inviteId")).toBe("inv_2");
    expect(
      verifyInviteUnsubscribe(
        "inv_2",
        "evt_1",
        url2.searchParams.get("sig")!,
      ),
    ).toBe(true);
  });

  it("returns enqueued=0 with no DB write when there are no eligible invites", async () => {
    dbMock.invite.findMany.mockResolvedValueOnce([]);
    const result = await enqueueGalleryPublishedEmails({
      eventId: "evt_1",
      galleryId: "gal_1",
      eventSlug: "summer-2026",
      eventTitle: "Summer Wedding",
      hostName: "Kay",
    });
    expect(result).toEqual({ enqueued: 0, skipped: 0 });
    expect(dbMock.emailOutbox.createMany).not.toHaveBeenCalled();
  });

  it("skips invites with null email (defensive — predicate should filter, but row shape allows it)", async () => {
    dbMock.invite.findMany.mockResolvedValueOnce([
      {
        id: "inv_1",
        email: "a@example.com",
        name: "Ada",
        tokenHash: "h1",
        rsvp: { guestName: "Ada" },
      },
      {
        id: "inv_2",
        email: null,
        name: "Bob",
        tokenHash: "h2",
        rsvp: { guestName: "Bob" },
      },
    ]);
    dbMock.emailOutbox.createMany.mockResolvedValueOnce({ count: 1 });

    const result = await enqueueGalleryPublishedEmails({
      eventId: "evt_1",
      galleryId: "gal_1",
      eventSlug: "summer-2026",
      eventTitle: "Summer Wedding",
      hostName: "Kay",
    });
    expect(result).toEqual({ enqueued: 1, skipped: 1 });
  });

  it("dedupes when a recent GALLERY_PUBLISHED row exists for the event", async () => {
    // The findFirst-on-emailOutbox returns a hit → enqueue short-circuits
    // and no createMany happens, even though invites would otherwise be
    // eligible. Protects against the same-organizer-in-two-tabs case.
    dbMock.emailOutbox.findFirst.mockResolvedValueOnce({ id: "ob_recent" });

    const result = await enqueueGalleryPublishedEmails({
      eventId: "evt_1",
      galleryId: "gal_1",
      eventSlug: "summer-2026",
      eventTitle: "Summer Wedding",
      hostName: "Kay",
    });
    expect(result).toEqual({ enqueued: 0, skipped: 0, deduped: true });
    expect(dbMock.invite.findMany).not.toHaveBeenCalled();
    expect(dbMock.emailOutbox.createMany).not.toHaveBeenCalled();
  });

  it("adds '(updated)' to the subject on republish", async () => {
    dbMock.invite.findMany.mockResolvedValueOnce([
      {
        id: "inv_1",
        email: "a@example.com",
        name: "Ada",
        tokenHash: "h1",
        rsvp: { guestName: "Ada" },
      },
    ]);
    dbMock.emailOutbox.createMany.mockResolvedValueOnce({ count: 1 });

    await enqueueGalleryPublishedEmails({
      eventId: "evt_1",
      galleryId: "gal_1",
      eventSlug: "summer-2026",
      eventTitle: "Summer Wedding",
      hostName: "Kay",
      isRepublish: true,
    });

    const subject =
      dbMock.emailOutbox.createMany.mock.calls[0][0].data[0].subject;
    expect(subject).toBe(
      "Photos from Summer Wedding are ready to view (updated)",
    );
  });

  it("first publish (isRepublish omitted) gets the un-suffixed subject", async () => {
    dbMock.invite.findMany.mockResolvedValueOnce([
      {
        id: "inv_1",
        email: "a@example.com",
        name: "Ada",
        tokenHash: "h1",
        rsvp: { guestName: "Ada" },
      },
    ]);
    dbMock.emailOutbox.createMany.mockResolvedValueOnce({ count: 1 });

    await enqueueGalleryPublishedEmails({
      eventId: "evt_1",
      galleryId: "gal_1",
      eventSlug: "summer-2026",
      eventTitle: "Summer Wedding",
      hostName: "Kay",
    });

    const subject =
      dbMock.emailOutbox.createMany.mock.calls[0][0].data[0].subject;
    expect(subject).toBe("Photos from Summer Wedding are ready to view");
  });

  it("omits coverUrl + photoCount from payload when not provided", async () => {
    dbMock.invite.findMany.mockResolvedValueOnce([
      {
        id: "inv_1",
        email: "a@example.com",
        name: "Ada",
        tokenHash: "h1",
        rsvp: { guestName: "Ada" },
      },
    ]);
    dbMock.emailOutbox.createMany.mockResolvedValueOnce({ count: 1 });

    await enqueueGalleryPublishedEmails({
      eventId: "evt_1",
      galleryId: "gal_1",
      eventSlug: "summer-2026",
      eventTitle: "Summer Wedding",
      hostName: "Kay",
    });
    const payload = dbMock.emailOutbox.createMany.mock.calls[0][0].data[0].payload;
    expect("coverUrl" in payload).toBe(false);
    expect("photoCount" in payload).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /recipients-preview
// ---------------------------------------------------------------------------

describe("GET /recipients-preview", () => {
  const ctx = { params: Promise.resolve({ id: "evt_1" }) };
  const req = new NextRequest(
    "https://example.com/api/events/evt_1/gallery/recipients-preview",
    { method: "GET" },
  );

  it("returns the count and uses the same predicate as enqueue", async () => {
    dbMock.invite.count.mockResolvedValueOnce(5);
    const res = await getRecipientsPreview(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.recipientCount).toBe(5);

    const where = dbMock.invite.count.mock.calls[0][0].where;
    expect(where.status).toBe("RESPONDED");
    expect(where.rsvp).toEqual({ response: "YES" });
  });

  it("401 without auth", async () => {
    verifyAuthMock.mockResolvedValueOnce(null);
    const res = await getRecipientsPreview(req, ctx);
    expect(res.status).toBe(401);
  });

  it("404 when feature flag is off", async () => {
    process.env.POST_EVENT_GALLERY_ENABLED = "false";
    try {
      const res = await getRecipientsPreview(req, ctx);
      expect(res.status).toBe(404);
    } finally {
      process.env.POST_EVENT_GALLERY_ENABLED = "true";
    }
  });
});

// ---------------------------------------------------------------------------
// POST /publish with notifyGuests
// ---------------------------------------------------------------------------

describe("POST /publish — notifyGuests opt-in", () => {
  const ctx = {
    params: Promise.resolve({ id: "evt_1", galleryId: "gal_1" }),
  };

  const makeRequest = (body: unknown) =>
    new NextRequest(
      "https://example.com/api/events/evt_1/gallery/gal_1/publish",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

  const publishMockSetup = () => {
    dbMock.eventGallery.findFirst.mockResolvedValueOnce({
      id: "gal_1",
      status: "DRAFT",
      sourceType: "EXTERNAL_LINK",
    });
    dbMock.eventGallery.update.mockResolvedValueOnce({
      id: "gal_1",
      status: "PUBLISHED",
      publishedAt: new Date(),
      event: {
        slug: "summer-2026",
        title: "Summer Wedding",
        creator: { name: "Kay", email: "kay@example.com" },
      },
    });
  };

  it("does NOT enqueue when notifyGuests is omitted", async () => {
    publishMockSetup();
    const res = await postPublish(makeRequest({}), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.emailsQueued).toBe(0);
    expect(dbMock.invite.findMany).not.toHaveBeenCalled();
    expect(getPublishedGalleryMock).not.toHaveBeenCalled();
  });

  it("enqueues emails when notifyGuests is true", async () => {
    publishMockSetup();
    getPublishedGalleryMock.mockResolvedValueOnce({
      sourceType: "NATIVE",
      coverUrl: "https://supabase.example/cover.webp",
      items: Array.from({ length: 6 }, (_, i) => ({ id: `i${i}` })),
    });
    dbMock.invite.findMany.mockResolvedValueOnce([
      {
        id: "inv_1",
        email: "a@example.com",
        name: "Ada",
        tokenHash: "h1",
        rsvp: { guestName: "Ada" },
      },
    ]);
    dbMock.emailOutbox.createMany.mockResolvedValueOnce({ count: 1 });

    const res = await postPublish(makeRequest({ notifyGuests: true }), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.emailsQueued).toBe(1);

    const enqueued = dbMock.emailOutbox.createMany.mock.calls[0][0].data[0];
    expect(enqueued.template).toBe("GALLERY_PUBLISHED");
    expect(enqueued.payload.photoCount).toBe(6);
    expect(enqueued.payload.coverUrl).toBe(
      "https://supabase.example/cover.webp",
    );
  });

  it("flags isRepublish in the email payload when the gallery was already PUBLISHED", async () => {
    // Override the default findFirst (DRAFT) with a PUBLISHED gallery so
    // the route's `gallery.status === "PUBLISHED"` check fires.
    dbMock.eventGallery.findFirst.mockResolvedValueOnce({
      id: "gal_1",
      status: "PUBLISHED",
      sourceType: "EXTERNAL_LINK",
    });
    dbMock.eventGallery.update.mockResolvedValueOnce({
      id: "gal_1",
      status: "PUBLISHED",
      publishedAt: new Date(),
      event: {
        slug: "summer-2026",
        title: "Summer Wedding",
        creator: { name: "Kay", email: "kay@example.com" },
      },
    });
    getPublishedGalleryMock.mockResolvedValueOnce({
      sourceType: "EXTERNAL_LINK",
      coverUrl: null,
    });
    dbMock.invite.findMany.mockResolvedValueOnce([
      {
        id: "inv_1",
        email: "a@example.com",
        name: "Ada",
        tokenHash: "h1",
        rsvp: { guestName: "Ada" },
      },
    ]);
    dbMock.emailOutbox.createMany.mockResolvedValueOnce({ count: 1 });

    await postPublish(makeRequest({ notifyGuests: true }), ctx);

    // Subject reflects republish path
    const subject =
      dbMock.emailOutbox.createMany.mock.calls[0][0].data[0].subject;
    expect(subject).toContain("(updated)");
  });

  it("publishes even if the email enqueue fails (best-effort broadcast)", async () => {
    publishMockSetup();
    getPublishedGalleryMock.mockRejectedValueOnce(new Error("DB hiccup"));

    const res = await postPublish(makeRequest({ notifyGuests: true }), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("PUBLISHED");
    expect(body.data.emailsQueued).toBe(0);
    // Revalidation still ran — the gallery is live
    expect(revalidateMock).toHaveBeenCalledWith("summer-2026");
  });
});
