// Server-only: imports `getApprovedWishes` (→ Prisma's `db` → `pg` →
// Node `net`/`tls`).
//
// DO NOT add this to the PostEventGallery barrel (`index.ts`). The
// barrel is consumed by client components (notably the dashboard
// gallery page) and re-exporting WishesEcho from it dragged `pg` into
// the browser bundle — the CI build failure on PR #133's first push.
// Server pages must import this file by its direct path.
import Link from "next/link";
import { getApprovedWishes } from "@/lib/wishes";

const WISHES_ECHO_LIMIT = 6;

type Props = {
  eventId: string;
  eventSlug: string;
  /** Forwarded to the "See all wishes" link so guest-token-gated viewers
   *  don't lose context jumping to /e/[slug]/wishes. */
  inviteToken?: string;
};

/**
 * Compact preview of approved wishes, rendered between the gallery grid
 * and the share CTA when `presentation.showWishesEcho` is true.
 *
 * Reads the SAME merged source as `/e/[slug]/wishes` (guest RSVP messages
 * + organizer-entered manual wishes, via `getApprovedWishes`) but caps at
 * WISHES_ECHO_LIMIT and links out to the full page for the rest. We
 * intentionally don't reuse a template's wishes renderer here — the
 * post-event page is template-agnostic shell, so it has its own neutral
 * card style.
 *
 * Renders nothing when no approved wishes exist; callers should still
 * conditionally render on `presentation.showWishesEcho` so an empty
 * query doesn't even hit the DB when the toggle is off.
 */
export async function WishesEcho({ eventId, eventSlug, inviteToken }: Props) {
  const { wishes, hasMore } = await getApprovedWishes(eventId, {
    limit: WISHES_ECHO_LIMIT,
  });

  if (wishes.length === 0) return null;
  const wishesHref = inviteToken
    ? `/e/${eventSlug}/wishes?tk=${encodeURIComponent(inviteToken)}`
    : `/e/${eventSlug}/wishes`;

  return (
    <section
      aria-labelledby="post-event-wishes-heading"
      className="border-t border-border px-4 py-16 md:py-20"
    >
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Guest Wishes
          </p>
          <h2
            id="post-event-wishes-heading"
            className="mt-2 font-serif text-2xl font-medium leading-tight text-foreground md:text-3xl"
          >
            Notes from the day
          </h2>
        </div>

        <ul
          role="list"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {wishes.map((wish) => (
            <li
              key={wish.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <p className="text-sm leading-relaxed text-foreground">
                {wish.message}
              </p>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                — {wish.authorName}
              </p>
            </li>
          ))}
        </ul>

        {hasMore && (
          <div className="text-center">
            <Link
              href={wishesHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Read all wishes
              <span aria-hidden>→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
