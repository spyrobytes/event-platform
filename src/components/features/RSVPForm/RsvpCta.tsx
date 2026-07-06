import type { CSSProperties } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DEMO_RSVP_CTA, isDemoEventSlug } from "@/lib/demo-event";
import { HEX6_RE, mostReadable } from "@/lib/color";
import { cn } from "@/lib/utils";

/*
 * Every RsvpCta caller is a template renderer, and template scopes redefine
 * --accent as a HEX string (wedding-v2/tokens.ts, reused by v3) — so the
 * Button default variant's `bg-accent` (= rgb(var(--accent)), an app-shell
 * RGB-triplet utility) computes to transparent inside them. The defaults
 * below therefore consume the template hex ramp directly, with a dark-ink
 * text fallback (mirroring HighContrastRSVP) so a pale accent stays legible
 * even in the unthemed state where --lux-accent-ink is never injected.
 */
const TEMPLATE_BUTTON_CLASS =
  "text-[var(--lux-accent-ink,var(--text,#1e1b17))] hover:opacity-90 transition-opacity";
const TEMPLATE_BUTTON_STYLE: CSSProperties = {
  backgroundColor: "var(--lux-accent, var(--accent, #7a8c72))",
};
const TEMPLATE_HELP_TEXT_CLASS =
  "text-[var(--lux-ink-soft,var(--text-2,#786f65))]";

type Props = {
  eventSlug: string;
  /** Optional override for the button label. */
  label?: string;
  /** Visual variant — passed through to the underlying Button. */
  variant?: "default" | "outline" | "secondary";
  /** Optional description shown beneath the button. */
  helpText?: string;
  /**
   * Accent hex for callers OUTSIDE the template token ramp (the V1 sections
   * sit on the app-shell theme, where --accent is an RGB triplet the inline
   * template default above can't consume). Button ink is picked with
   * mostReadable, helpText keeps the app-shell muted color.
   */
  accentHex?: string;
  /** Extra classes appended to the underlying Button — overrides the
   *  template-ramp default (e.g. a renderer whose design wants white ink). */
  buttonClassName?: string;
  /** Inline style applied to the underlying Button — overrides the
   *  template-ramp default background. */
  buttonStyle?: CSSProperties;
  /** Extra classes for the helpText paragraph — overrides the template-ramp
   *  default (e.g. `text-white/70` on a dark bespoke panel). */
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
  accentHex,
  buttonClassName,
  buttonStyle,
  helpTextClassName,
}: Props) {
  // Demo pages (/sample-templates/*) have no backing event, so the RSVP
  // portal link would 404. Swap in the sign-up CTA instead — styling props
  // stay untouched so the button remains native to each template's renderer.
  // The demo copy DELIBERATELY supersedes any caller-supplied label/helpText
  // (e.g. Conference's "Register", Party's "RSVP →"): on a demo, every RSVP
  // CTA must funnel to sign-up, whatever the template calls it. Copy lives
  // in DEMO_RSVP_CTA next to the sentinel definition.
  const isDemo = isDemoEventSlug(eventSlug);
  const href = isDemo ? DEMO_RSVP_CTA.href : `/e/${eventSlug}/rsvp`;
  const resolvedLabel = isDemo ? DEMO_RSVP_CTA.label : label;
  const resolvedHelpText = isDemo ? DEMO_RSVP_CTA.helpText : helpText;

  const validAccentHex = accentHex && HEX6_RE.test(accentHex) ? accentHex : undefined;
  const resolvedButtonStyle =
    buttonStyle ??
    (validAccentHex
      ? {
          backgroundColor: validAccentHex,
          color: mostReadable(validAccentHex, "#ffffff", "#1e1b17"),
        }
      : TEMPLATE_BUTTON_STYLE);
  const resolvedButtonClassName =
    buttonClassName ??
    (validAccentHex
      ? "hover:opacity-90 transition-opacity"
      : TEMPLATE_BUTTON_CLASS);
  const resolvedHelpTextClassName =
    helpTextClassName ??
    (validAccentHex ? "text-muted-foreground" : TEMPLATE_HELP_TEXT_CLASS);

  return (
    <div className="text-center">
      {/* The Button itself isn't a router link, so we wrap it in <Link> and
          render it as a presentational element. The whole link is clickable
          and Tailwind classes from Button cascade through. */}
      <Link href={href} className="inline-block">
        <Button
          type="button"
          size="lg"
          variant={variant}
          className={resolvedButtonClassName}
          style={resolvedButtonStyle}
        >
          {resolvedLabel}
        </Button>
      </Link>
      {resolvedHelpText && (
        <p className={cn("mt-3 text-sm", resolvedHelpTextClassName)}>
          {resolvedHelpText}
        </p>
      )}
    </div>
  );
}
