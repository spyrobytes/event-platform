import Link from "next/link";
import { cn } from "@/lib/utils";
import type { WishesSection } from "@/schemas/event-page";
import { WishCard } from "./WishCard";
import { WishesGrid } from "./WishesGrid";
import styles from "./WishesRenderer.module.css";

export type ApprovedWish = {
  id: string;
  message: string;
  authorName: string;
};

/** Props match the V3 SectionRendererProps contract directly so the V3
 *  factory can pass the renderer through without an adapter wrapper. */
type WishesRendererProps = {
  data: WishesSection["data"];
  /** Approved wishes, ordered most-recent-first by the server query.
   *  In preview mode, the renderer slices to data.previewCount. */
  approvedWishes?: ApprovedWish[];
  /** preview = main event page (top N + "View all" CTA when overflow exists).
   *  full = /e/[slug]/wishes (all approved wishes, no CTA). */
  wishesMode?: "preview" | "full";
  eventSlug?: string;
  /** Guest invite token, propagated to the "View all" CTA so the full page
   *  preserves authenticated context. */
  inviteToken?: string;
};

export function WishesRenderer({
  data,
  approvedWishes = [],
  wishesMode = "preview",
  eventSlug,
  inviteToken,
}: WishesRendererProps) {
  const previewCount = data.previewCount ?? 3;
  const visibleWishes =
    wishesMode === "preview" ? approvedWishes.slice(0, previewCount) : approvedWishes;
  const overflowCount = Math.max(0, approvedWishes.length - previewCount);

  // Don't render an empty section to public viewers — would just show
  // a heading with no body. Organizers see the editor instead.
  if (visibleWishes.length === 0) {
    return null;
  }

  // The `#wishes` fragment matters: the sub-page renders the full hero above
  // the wishes wall, and landing at the top reads as "there are no wishes
  // here" — the anchor drops visitors straight onto the wall.
  const fullPageHref =
    wishesMode === "preview" && eventSlug && overflowCount > 0
      ? `/e/${eventSlug}/wishes${inviteToken ? `?tk=${encodeURIComponent(inviteToken)}` : ""}#wishes`
      : null;

  const heading = data.heading || "Wedding Wishes";

  return (
    <section
      id="wishes"
      className={cn(styles.wishVars, styles.section)}
      aria-labelledby="wedding-wishes-heading"
    >
      <div className={styles.header}>
        {data.eyebrow && <p className={styles.eyebrow}>{data.eyebrow}</p>}
        <h2 id="wedding-wishes-heading" className={styles.heading}>
          {heading}
        </h2>
        {data.intro && <p className={styles.intro}>{data.intro}</p>}
      </div>

      {/* No-JS fallback: the clamp ships in the server HTML and the only way
          past it is the JS-only spotlight — without scripting the tail of a
          long wish would be permanently unreachable. Unclamp every message
          and hide the inert buttons. Attribute selectors because module
          class names are hashed; a <style> in <noscript> is the one surface
          module CSS can't reach (approved inline-style exception). Rendered
          in <body> after the stylesheets, so equal specificity wins the tie
          without !important. */}
      <noscript>
        <style>{`[data-wish-clamped]{display:block;overflow:visible;-webkit-line-clamp:unset}[data-wish-readmore]{display:none}`}</style>
      </noscript>

      {wishesMode === "full" ? (
        // Full page can render the whole wall; cap + reveal on mobile only.
        <WishesGrid wishes={visibleWishes} />
      ) : (
        <div className={styles.grid}>
          {visibleWishes.map((wish) => (
            <WishCard key={wish.id} wish={wish} />
          ))}
        </div>
      )}

      {fullPageHref && (
        <div className={styles.cta}>
          <Link href={fullPageHref} className={styles.ctaLink}>
            View all wishes ({overflowCount} more) →
          </Link>
        </div>
      )}
    </section>
  );
}
