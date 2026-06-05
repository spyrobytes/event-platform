"use client";

import { useProgressiveReveal, WISHES_REVEAL } from "@/hooks/use-progressive-reveal";
import { RevealMoreButton } from "@/components/media/RevealMoreButton";
import { WishCard } from "./WishCard";
import type { ApprovedWish } from "./WishesRenderer";
import styles from "./WishesRenderer.module.css";

/**
 * Full wishes page grid. The ripped-paper cards are paint-heavy, so on MOBILE
 * this caps how many render at once and reveals more on tap; tablet/desktop get
 * the whole wall unchanged (WISHES_REVEAL is REVEAL_ALL there). Pairs with the
 * mobile CSS that drops the live SVG filters and skips off-screen cards.
 */
export function WishesGrid({ wishes }: { wishes: ApprovedWish[] }) {
  const { visibleCount, hasMore, remaining, revealMore } = useProgressiveReveal(
    wishes.length,
    WISHES_REVEAL,
  );
  const visible = wishes.slice(0, visibleCount);

  return (
    <>
      <div className={styles.grid}>
        {visible.map((wish) => (
          <WishCard key={wish.id} wish={wish} />
        ))}
      </div>

      {hasMore && (
        <RevealMoreButton
          label="Show more wishes"
          remaining={remaining}
          onClick={revealMore}
          className={styles.ctaLink}
        />
      )}
    </>
  );
}
