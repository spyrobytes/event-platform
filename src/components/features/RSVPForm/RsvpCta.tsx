import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  eventSlug: string;
  /** Optional override for the button label. */
  label?: string;
  /** Visual variant — passed through to the underlying Button. */
  variant?: "default" | "outline" | "secondary";
  /** Optional description shown beneath the button. */
  helpText?: string;
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
}: Props) {
  return (
    <div className="text-center">
      {/* The Button itself isn't a router link, so we wrap it in <Link> and
          render it as a presentational element. The whole link is clickable
          and Tailwind classes from Button cascade through. */}
      <Link href={`/e/${eventSlug}/rsvp`} className="inline-block">
        <Button type="button" size="lg" variant={variant}>
          {label}
        </Button>
      </Link>
      {helpText && (
        <p className="mt-3 text-sm text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}
