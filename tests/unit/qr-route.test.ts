import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const findUniqueMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: { invite: { findUnique: findUniqueMock } },
}));

const VALID_PASS_ID = "0123abcd-aaaa-bbbb-cccc-ddddeeeeffff";
const ANOTHER_PASS_ID = "ffff1111-2222-3333-4444-555566667777";

const { GET } = await import("@/app/api/qr/[passId]/route");

beforeEach(() => {
  findUniqueMock.mockReset();
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://eventfxr.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeRequest(passId: string, query = ""): {
  request: NextRequest;
  context: { params: Promise<{ passId: string }> };
} {
  const url = `https://eventfxr.com/api/qr/${passId}${query}`;
  return {
    request: new NextRequest(url, { method: "GET" }),
    context: { params: Promise.resolve({ passId }) },
  };
}

describe("GET /api/qr/[passId]", () => {
  it("returns 200 SVG for a valid passId by default", async () => {
    findUniqueMock.mockResolvedValue({ id: "inv_1" });
    const { request, context } = makeRequest(VALID_PASS_ID);

    const res = await GET(request, context);
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/^image\/svg\+xml/);
    expect(body).toContain("<svg");
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable"
    );
    expect(res.headers.get("CDN-Cache-Control")).toBe(
      "public, max-age=31536000"
    );
  });

  it("returns 200 PNG when ?format=png", async () => {
    findUniqueMock.mockResolvedValue({ id: "inv_1" });
    const { request, context } = makeRequest(VALID_PASS_ID, "?format=png");

    const res = await GET(request, context);
    const buf = Buffer.from(await res.arrayBuffer());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    // PNG magic bytes
    expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable"
    );
  });

  it("falls back to SVG for unknown format values", async () => {
    findUniqueMock.mockResolvedValue({ id: "inv_1" });
    const { request, context } = makeRequest(VALID_PASS_ID, "?format=xyz");

    const res = await GET(request, context);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/^image\/svg\+xml/);
  });

  it("returns 404 for a malformed (non-UUID) passId without hitting the DB", async () => {
    const { request, context } = makeRequest("not-a-uuid");

    const res = await GET(request, context);

    expect(res.status).toBe(404);
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(res.headers.get("Cache-Control")).toBeNull();
  });

  it("returns 404 with one DB hit for a syntactically-valid but unknown passId", async () => {
    findUniqueMock.mockResolvedValue(null);
    const { request, context } = makeRequest(ANOTHER_PASS_ID);

    const res = await GET(request, context);

    expect(res.status).toBe(404);
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { passId: ANOTHER_PASS_ID },
      select: { id: true },
    });
    expect(res.headers.get("Cache-Control")).toBeNull();
  });

  it("returns 200 with QR for a revoked invite (image isn't revoked, pass view is)", async () => {
    // The route only checks existence; revokedAt is irrelevant here.
    findUniqueMock.mockResolvedValue({ id: "inv_revoked" });
    const { request, context } = makeRequest(VALID_PASS_ID);

    const res = await GET(request, context);

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable"
    );
  });
});
