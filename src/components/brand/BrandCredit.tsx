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
 */
export function BrandCredit({ className, style }: BrandCreditProps) {
  return (
    <a
      href={LANDING_HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Powered by EventFXr"
      className={cn("inline-flex items-center gap-1.5 no-underline", className)}
      style={style}
    >
      <span>Powered by</span>
      <Logo variant="full" size="sm" priority={false} animate={false} />
    </a>
  );
}
