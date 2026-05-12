import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the DB layer so we can drive findUnique outcomes per test.
const dbMock = {
  event: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  eventPageVersion: {
    create: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

// Auth always succeeds in these tests — we're exercising the validation gate,
// not the auth gate.
vi.mock("@/lib/auth", () => ({
  verifyAuth: vi.fn(async () => ({ id: "user_1", roles: ["organizer"] })),
}));
vi.mock("@/lib/authorization", () => ({
  requireEventOwner: vi.fn(async () => undefined),
  assertCanPublish: vi.fn(() => undefined),
  assertCanMutate: vi.fn(() => undefined),
  verifyEventOwnership: vi.fn(async () => true),
}));
vi.mock("@/lib/revalidation", () => ({
  revalidateEventPage: vi.fn(async () => undefined),
}));

const { POST: PUBLISH_POST } = await import("@/app/api/events/[id]/publish/route");
const { POST: PAGECONFIG_POST } = await import(
  "@/app/api/events/[id]/page-config/route"
);

beforeEach(() => {
  vi.clearAllMocks();
});

function makePublishRequest(): NextRequest {
  return new NextRequest("https://example.com/api/events/evt_1/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
}

function makePageConfigPublishRequest(): NextRequest {
  return new NextRequest("https://example.com/api/events/evt_1/page-config", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "publish" }),
  });
}

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const baseTheme = { preset: "modern", primaryColor: "#000000", fontPair: "modern" };
const baseHero = { title: "Test", align: "center", overlay: "soft" };

function makeConfig(sections: unknown[]): Record<string, unknown> {
  return { schemaVersion: 1, theme: baseTheme, hero: baseHero, sections };
}

const completeMapSection = {
  type: "map",
  enabled: true,
  data: {
    heading: "Location",
    formattedAddress: "100 King St W, Toronto",
    latitude: 43.6481,
    longitude: -79.3829,
    zoom: 15,
    showDirectionsLink: true,
  },
};

const incompleteMapSection = {
  type: "map",
  enabled: true,
  data: {
    heading: "Location",
    formattedAddress: "100 King St W, Toronto",
    // no coordinates
    zoom: 15,
    showDirectionsLink: true,
  },
};

describe("POST /api/events/[id]/publish — map section validation", () => {
  it("rejects with 400 when an enabled map section is missing coordinates", async () => {
    dbMock.event.findUnique.mockResolvedValueOnce({
      status: "DRAFT",
      title: "Test Event",
      startAt: futureDate,
      pageConfig: makeConfig([incompleteMapSection]),
    });

    const response = await PUBLISH_POST(makePublishRequest(), {
      params: Promise.resolve({ id: "evt_1" }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/coordinates/i);
    expect(dbMock.event.update).not.toHaveBeenCalled();
  });

  it("rejects with 400 when an enabled map section is missing address", async () => {
    dbMock.event.findUnique.mockResolvedValueOnce({
      status: "DRAFT",
      title: "Test Event",
      startAt: futureDate,
      pageConfig: makeConfig([
        {
          type: "map",
          enabled: true,
          data: {
            heading: "Location",
            latitude: 43.6481,
            longitude: -79.3829,
            zoom: 15,
            showDirectionsLink: true,
          },
        },
      ]),
    });

    const response = await PUBLISH_POST(makePublishRequest(), {
      params: Promise.resolve({ id: "evt_1" }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/address/i);
    expect(dbMock.event.update).not.toHaveBeenCalled();
  });

  it("passes through to update() when the map section is publish-ready", async () => {
    dbMock.event.findUnique.mockResolvedValueOnce({
      status: "DRAFT",
      title: "Test Event",
      startAt: futureDate,
      pageConfig: makeConfig([completeMapSection]),
    });
    dbMock.event.update.mockResolvedValueOnce({
      id: "evt_1",
      title: "Test Event",
      slug: "test-event",
      status: "PUBLISHED",
      visibility: "PUBLIC",
      publishedAt: new Date(),
      startAt: futureDate,
      endAt: null,
    });

    const response = await PUBLISH_POST(makePublishRequest(), {
      params: Promise.resolve({ id: "evt_1" }),
    });
    expect(response.status).toBe(200);
    expect(dbMock.event.update).toHaveBeenCalled();
  });

  it("passes through when the map section is disabled regardless of data", async () => {
    dbMock.event.findUnique.mockResolvedValueOnce({
      status: "DRAFT",
      title: "Test Event",
      startAt: futureDate,
      pageConfig: makeConfig([{ type: "map", enabled: false, data: {} }]),
    });
    dbMock.event.update.mockResolvedValueOnce({
      id: "evt_1",
      title: "Test Event",
      slug: "test-event",
      status: "PUBLISHED",
      visibility: "PUBLIC",
      publishedAt: new Date(),
      startAt: futureDate,
      endAt: null,
    });

    const response = await PUBLISH_POST(makePublishRequest(), {
      params: Promise.resolve({ id: "evt_1" }),
    });
    expect(response.status).toBe(200);
  });
});

describe("POST /api/events/[id]/page-config action=publish — map section validation", () => {
  it("rejects with 400 when an enabled map section is missing coordinates", async () => {
    dbMock.event.findUnique.mockResolvedValueOnce({
      slug: "test-event",
      title: "Test Event",
      templateId: "wedding_v1",
      pageConfig: makeConfig([incompleteMapSection]),
    });

    // The page-config POST handler is typed as `Response | undefined` because
    // the route has both "publish" and "unpublish" branches; Zod parsing
    // guarantees one matches at runtime, but TS can't see through it.
    const response = await PAGECONFIG_POST(makePageConfigPublishRequest(), {
      params: Promise.resolve({ id: "evt_1" }),
    });
    expect(response).toBeDefined();
    expect(response!.status).toBe(400);
    const body = await response!.json();
    expect(body.error).toMatch(/coordinates/i);
    expect(dbMock.event.update).not.toHaveBeenCalled();
  });

  it("passes through to update() when the map section is publish-ready", async () => {
    dbMock.event.findUnique.mockResolvedValueOnce({
      slug: "test-event",
      title: "Test Event",
      templateId: "wedding_v1",
      pageConfig: makeConfig([completeMapSection]),
    });
    dbMock.event.update.mockResolvedValueOnce({
      slug: "test-event",
    });

    const response = await PAGECONFIG_POST(makePageConfigPublishRequest(), {
      params: Promise.resolve({ id: "evt_1" }),
    });
    expect(response).toBeDefined();
    expect(response!.status).toBe(200);
    expect(dbMock.event.update).toHaveBeenCalled();
  });
});
