import { db } from "@/lib/db";

/**
 * Structurally identical to `ApprovedWishDTO` in
 * `src/components/templates/index.ts` — defined here rather than imported
 * so `lib/` keeps zero imports from `components/` (the DTO is the template
 * layer's contract; this is the data layer's mirror of it).
 */
export type ApprovedWish = {
  id: string;
  message: string;
  authorName: string;
};

type GetApprovedWishesOptions = {
  /**
   * When set, returns at most `limit` wishes plus a `hasMore` flag
   * (used by the post-event gallery echo). Omit for the full list.
   */
  limit?: number;
};

/**
 * The single read path for the public wishes wall: guest wishes captured on
 * the RSVP form (`RSVP.messageToHost`, gated on `messageStatus=APPROVED`)
 * merged with organizer-entered `ManualWish` rows (collected outside the
 * invite/RSVP pipeline — born approved, no moderation gate).
 *
 * Ordering: newest first by "when it became public" — `messageApprovedAt`
 * for guest wishes (falling back to `respondedAt` for any legacy row
 * approved before the timestamp existed), `createdAt` for manual wishes.
 *
 * Used by `/e/[slug]` (preview), `/e/[slug]/wishes` (full) and the
 * post-event gallery `WishesEcho`.
 */
export async function getApprovedWishes(
  eventId: string,
  options: GetApprovedWishesOptions = {}
): Promise<{ wishes: ApprovedWish[]; hasMore: boolean }> {
  const { limit } = options;
  // With a limit, fetch limit+1 from EACH source: after merging, the top
  // `limit` rows can come from either side, and one extra row is enough to
  // know whether anything got cut. `undefined` means "no cap" to Prisma.
  const take = limit !== undefined ? limit + 1 : undefined;

  const [rsvpRows, manualRows] = await Promise.all([
    db.rSVP.findMany({
      where: {
        eventId,
        messageStatus: "APPROVED",
        messageToHost: { not: null },
      },
      select: {
        id: true,
        guestName: true,
        messageToHost: true,
        messageApprovedAt: true,
        respondedAt: true,
      },
      orderBy: [{ messageApprovedAt: "desc" }, { respondedAt: "desc" }],
      take,
    }),
    db.manualWish.findMany({
      where: { eventId },
      select: {
        id: true,
        authorName: true,
        message: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
    }),
  ]);

  const merged = [
    ...rsvpRows.map((r) => ({
      wish: {
        id: r.id,
        message: r.messageToHost ?? "",
        authorName: r.guestName,
      },
      sortKey: (r.messageApprovedAt ?? r.respondedAt).getTime(),
    })),
    ...manualRows.map((m) => ({
      wish: {
        id: m.id,
        message: m.message,
        authorName: m.authorName,
      },
      sortKey: m.createdAt.getTime(),
    })),
  ].sort((a, b) => b.sortKey - a.sortKey);

  const hasMore = limit !== undefined && merged.length > limit;
  const wishes = (hasMore ? merged.slice(0, limit) : merged).map((e) => e.wish);

  return { wishes, hasMore };
}
