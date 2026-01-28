import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCSV, formatDateForCSV } from "@/lib/csv";
import type { Prisma } from "@prisma/client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const VALID_FILTERS = ["all", "attending", "pending", "responded", "not_attending"] as const;
type FilterType = (typeof VALID_FILTERS)[number];

/**
 * GET /api/events/[id]/invites/export
 * Export invites as CSV
 * Query params:
 *   - filter: all | attending | pending | responded | not_attending
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // 1. Authenticate
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await context.params;

    // 2. Get filter from query params
    const searchParams = request.nextUrl.searchParams;
    const filter = (searchParams.get("filter") || "all") as FilterType;

    if (!VALID_FILTERS.includes(filter)) {
      return NextResponse.json(
        { error: `Invalid filter. Must be one of: ${VALID_FILTERS.join(", ")}` },
        { status: 400 }
      );
    }

    // 3. Verify ownership
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, creatorId: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.creatorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4. Build filter conditions
    const where: Prisma.InviteWhereInput = { eventId };

    switch (filter) {
      case "attending":
        where.rsvp = { response: "YES" };
        break;
      case "not_attending":
        where.rsvp = { response: "NO" };
        break;
      case "pending":
        where.status = { in: ["PENDING", "SENT", "OPENED"] };
        where.rsvp = null;
        break;
      case "responded":
        where.rsvp = { isNot: null };
        break;
      // "all" - no additional filters
    }

    // 5. Fetch invites with RSVPs
    const invites = await db.invite.findMany({
      where,
      include: {
        rsvp: {
          select: {
            response: true,
            guestName: true,
            guestCount: true,
            notes: true,
            respondedAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 6. Generate CSV
    const headers = [
      "Name",
      "Email",
      "Invite Status",
      "RSVP Response",
      "Guest Count",
      "Responded Date",
      "Notes",
      "Invite Sent Date",
    ];

    const rows = invites.map((invite) => [
      invite.name || invite.rsvp?.guestName || "",
      invite.email,
      invite.status,
      invite.rsvp?.response || "",
      invite.rsvp?.guestCount || "",
      formatDateForCSV(invite.rsvp?.respondedAt),
      invite.rsvp?.notes || "",
      formatDateForCSV(invite.sentAt),
    ]);

    const csv = generateCSV(headers, rows);

    // 7. Create filename
    const safeTitle = event.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const date = new Date().toISOString().split("T")[0];
    const filename = `${safeTitle}_invites_${filter}_${date}.csv`;

    // 8. Return CSV response
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export invites" },
      { status: 500 }
    );
  }
}
