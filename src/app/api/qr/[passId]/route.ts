import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildPassUrl, generateQrSvg, generateQrPngBuffer } from "@/lib/qr";

/**
 * GET /api/qr/[passId]
 *
 * Returns a QR code that encodes the public pass-view URL
 * (`/invite/pass/[passId]`). Default response is SVG; pass `?format=png`
 * for a PNG. Any other `format` value silently falls back to SVG.
 *
 * Auth-free by design. `passId` is a public-by-design read-only
 * credential per the QR plan §2.5 — UUID v4 entropy (~122 bits) makes
 * enumeration infeasible, and possession of a passId only enables the
 * read-only pass-view rendering, not RSVP submission, unsubscribe, or
 * any write action.
 *
 * Revoked invites still return 200 with the QR. The image isn't
 * "revoked" — the pass view itself does a live DB read and shows the
 * revoked-state banner. This keeps the route deterministic and CDN-
 * cacheable across the invite lifecycle.
 */

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "CDN-Cache-Control": "public, max-age=31536000",
} as const;

type RouteContext = {
  params: Promise<{ passId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { passId } = await context.params;

  // Validate UUID shape before any DB hit. Postgres' uuid type would
  // raise on a malformed value, but rejecting here keeps a 404 path
  // that doesn't pay a round-trip on garbage input.
  if (!UUID_V4_PATTERN.test(passId)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const invite = await db.invite.findUnique({
    where: { passId },
    select: { id: true },
  });
  if (!invite) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "png" ? "png" : "svg";
  const url = buildPassUrl(passId);

  if (format === "png") {
    const buffer = await generateQrPngBuffer(url);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        ...CACHE_HEADERS,
        "Content-Type": "image/png",
        "Content-Length": String(buffer.length),
      },
    });
  }

  const svg = await generateQrSvg(url);
  return new NextResponse(svg, {
    status: 200,
    headers: {
      ...CACHE_HEADERS,
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
