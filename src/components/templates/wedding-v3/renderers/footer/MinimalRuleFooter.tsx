"use client";

/**
 * Minimal Rule Footer — The Editorial / Intimate Note
 *
 * Dark "back cover" footer with inverted colors.
 * Thin top rule, couple names in large faded serif as watermark,
 * navigation links, and subtle credit line.
 */

import type { FooterRendererProps } from "../../types";
import styles from "./MinimalRuleFooter.module.css";

export function MinimalRuleFooter({
  monogram,
  coupleNames,
  dateText,
  sections,
}: FooterRendererProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Watermark — large faded monogram or couple names */}
        {(monogram || coupleNames) && (
          <div className={styles.watermark} aria-hidden="true">
            {monogram || coupleNames}
          </div>
        )}

        {/* Top row: names + date */}
        <div className={styles.topRow}>
          <span className={styles.names}>
            {coupleNames || "Our Wedding"}
          </span>
          {dateText && (
            <span className={styles.date}>{dateText}</span>
          )}
        </div>

        {/* Navigation links */}
        {sections.length > 0 && (
          <nav className={styles.nav} aria-label="Footer navigation">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className={styles.navLink}>
                {s.label}
              </a>
            ))}
          </nav>
        )}

        {/* Credit line */}
        <p className={styles.credit}>Powered by Events Fixer</p>
      </div>
    </footer>
  );
}
