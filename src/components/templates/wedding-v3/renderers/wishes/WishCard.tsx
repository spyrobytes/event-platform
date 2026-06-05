import type { ApprovedWish } from "./WishesRenderer";
import styles from "./WishesRenderer.module.css";

/**
 * A single ripped-paper wish card. Presentational + server-safe, so it's shared
 * by the preview grid (WishesRenderer) and the full-page client grid
 * (WishesGrid). The list key is owned by the caller's `.map`, not here.
 */
export function WishCard({ wish }: { wish: ApprovedWish }) {
  return (
    <article className={styles.card}>
      <p className={styles.message}>{wish.message}</p>
      {wish.authorName && (
        <footer className={styles.author}>— {wish.authorName}</footer>
      )}
    </article>
  );
}
