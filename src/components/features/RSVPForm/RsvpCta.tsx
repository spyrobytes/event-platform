import type { CSSProperties } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  eventSlug: string;
  /** Optional override for the button label. */
  label?: string;
  /** Visual variant — passed through to the underlying Button. */
  variant?: "default" | "outline" | "secondary";
  /** Optional description shown beneath the button. */
  helpText?: string;
  /** Extra classes appended to the underlying Button — lets renderers on
   *  dark/cinematic backgrounds override the default variant's foreground. */
  buttonClassName?: string;
  /** Inline style applied to the underlying Button — useful for setting
   *  background-color directly when `bg-accent` can't resolve cleanly
   *  inside a template scope. */
  buttonStyle?: CSSProperties;
  /** Extra classes for the helpText paragraph — lets dark-backed renderers
   *  bump the contrast (e.g. `text-white/70` instead of `text-muted-foreground`). */
  helpTextClassName?: string;
};

/**
 * Replaces the inline RSVPForm on public event pages with a CTA that links
 * to the code-gated portal at /e/[slug]/rsvp.
 *
 * Why a CTA, not the form: the inline form on a public page is reachable
 * without an invite code (`eventId`-only path), which lets anyone POST an
 * RSVP. The portal forces a code first, so submissions resolve to a real
 * Invite. See docs/public-event-portal/rsvp-from-public-portal-Implementation-plan-v3.md
 * §1, §11 (PR 5).
 */
export function RsvpCta({
  eventSlug,
  label = "RSVP",
  variant = "default",
  helpText = "Have your invitation code ready.",
  buttonClassName,
  buttonStyle,
  helpTextClassName,
}: Props) {
  return (
    <div className="text-center">
      {/* The Button itself isn't a router link, so we wrap it in <Link> and
          render it as a presentational element. The whole link is clickable
          and Tailwind classes from Button cascade through. */}
      <Link href={`/e/${eventSlug}/rsvp`} className="inline-block">
        <Button
          type="button"
          size="lg"
          variant={variant}
          className={buttonClassName}
          style={buttonStyle}
        >
          {label}
        </Button>
      </Link>
      {helpText && (
        <p
          className={cn(
            "mt-3 text-sm",
            helpTextClassName ?? "text-muted-foreground"
          )}
        >
          {helpText}
        </p>
      )}
    </div>
  );
}
