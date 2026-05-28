import Link from "next/link";
import { buildPublicGalleryHref } from "@/lib/gallery-urls";

type Props = {
  eventSlug: string;
  /** Forwarded so unlisted/private viewers don't lose context. */
  inviteToken?: string;
  /** Optional label override — templates can vary this if their voice
   *  differs from the default. */
  label?: string;
};

/**
 * Small "View Album" CTA that templates render just after their hero
 * block when a published gallery exists. Intentionally neutral styling
 * (rounded pill, foreground/background tokens) so it harmonizes with
 * every template — individual templates can wrap it in their own
 * positioning + theming if they want a stronger statement.
 *
 * Per the consolidated plan §8.3, this CTA + the teaser are the two
 * discoverability surfaces for a published post-event gallery on
 * /e/[slug]. The dedicated /e/[slug]/gallery route is where both lead.
 */
export function HeroPostEventCta({ eventSlug, inviteToken, label = "View Album" }: Props) {
  const href = buildPublicGalleryHref(eventSlug, inviteToken);
  return (
    <div className="flex justify-center py-6">
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background/70 px-5 py-2.5 text-sm font-medium text-foreground shadow-sm backdrop-blur transition hover:bg-background hover:shadow"
      >
        <span aria-hidden>📷</span>
        <span>{label}</span>
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
