import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

type BrandCreditProps = {
  /** Extra classes for the root link (e.g. a CSS-module credit class) */
  className?: string;
  /** Inline styles for the root link — typically font-family/size and the muted
   *  color the surrounding footer uses for its "Powered by" label */
  style?: CSSProperties;
};

/** EventFXr landing page. Relative so it resolves on whatever host serves the
 *  event page (preview, prod) and stays canonical to this app. */
const LANDING_HREF = "/";

/**
 * "Powered by EventFXr" attribution badge for guest-facing event-page footers.
 *
 * Presentation-only — drop inside an existing <footer>. The "Powered by" label
 * inherits the link's color (set by the caller via `className`/`style`) so it
 * stays as understated as each template intends, while the logo carries the
 * fixed brand green/magenta. Links to the landing page in a new tab so guests
 * don't lose the event page they're viewing.
 *
 * Light-panel scrim: the fixed brand colors go nearly invisible on a light/mid
 * section-theme panel (magenta ~1.05:1 on cerulean). On those panels the V3
 * theme generator emits `--lux-credit-*`, backing the badge with a small dark
 * chip and flipping the label light so it reads on the plate. The var()
 * fallbacks below resolve to "no chip" everywhere else (dark themes, default,
 * and any footer outside the section-theme system), so the badge is unchanged.
 */
export function BrandCredit({ className, style }: BrandCreditProps) {
  return (
    <a
      href={LANDING_HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Powered by EventFXr"
      className={cn("inline-flex items-center gap-1.5 no-underline", className)}
      style={{
        borderRadius: 999,
        padding: "var(--lux-credit-pad, 0)",
        background: "var(--lux-credit-scrim, transparent)",
        border: "var(--lux-credit-border, 0)",
        ...style,
      }}
    >
      <span style={{ color: "var(--lux-credit-ink, currentColor)" }}>Powered by</span>
      <Logo variant="full" size="sm" priority={false} animate={false} />
    </a>
  );
}
