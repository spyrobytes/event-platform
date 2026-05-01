import type { WishesSection } from "@/schemas/event-page";
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

  const fullPageHref =
    wishesMode === "preview" && eventSlug && overflowCount > 0
      ? `/e/${eventSlug}/wishes${inviteToken ? `?tk=${encodeURIComponent(inviteToken)}` : ""}`
      : null;

  const heading = data.heading || "Wedding Wishes";

  return (
    <section className={styles.section} aria-labelledby="wedding-wishes-heading">
      <div className={styles.header}>
        {data.eyebrow && <p className={styles.eyebrow}>{data.eyebrow}</p>}
        <h2 id="wedding-wishes-heading" className={styles.heading}>
          {heading}
        </h2>
        {data.intro && <p className={styles.intro}>{data.intro}</p>}
      </div>

      <div className={styles.grid}>
        {visibleWishes.map((wish) => (
          <article key={wish.id} className={styles.card}>
            <p className={styles.message}>{wish.message}</p>
            {wish.authorName && (
              <footer className={styles.author}>— {wish.authorName}</footer>
            )}
          </article>
        ))}
      </div>

      {fullPageHref && (
        <div className={styles.cta}>
          <a href={fullPageHref} className={styles.ctaLink}>
            View all wishes ({overflowCount} more) →
          </a>
        </div>
      )}
    </section>
  );
}
