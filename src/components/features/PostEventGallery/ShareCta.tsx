import { ShareButton } from "@/components/features/ShareButton/ShareButton";

type Props = {
  eventTitle: string;
  eventSlug: string;
  /** When false (private event, or guest viewing via token), the section
   *  is suppressed entirely — sharing a token-gated URL would leak the
   *  token, and a public URL the recipient can't open is hostile UX.
   *  Callers gate via `event.visibility === "PUBLIC"`. */
  canShare: boolean;
};

/**
 * Bottom-of-page "share this gallery" affordance. Wraps the shared
 * `ShareButton` (which handles navigator.share + clipboard fallback +
 * the transient "Link copied" state) with the contextual framing this
 * page needs.
 *
 * URL is the canonical /e/[slug]/gallery (no token), so we never share a
 * guest-only deep link. Caller is responsible for the canShare gate;
 * we double-check defensively and bail when false to keep the section
 * out of the visual flow + the share affordance off the page entirely.
 */
export function ShareCta({ eventTitle, eventSlug, canShare }: Props) {
  if (!canShare) return null;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const shareUrl = `${baseUrl}/e/${eventSlug}/gallery`;

  return (
    <section
      aria-labelledby="post-event-share-heading"
      className="border-t border-border bg-muted/30 px-4 py-12 md:py-16"
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <h2
          id="post-event-share-heading"
          className="font-serif text-xl font-medium text-foreground md:text-2xl"
        >
          Share these memories
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
          Send the gallery to friends and family who couldn&apos;t make it.
        </p>
        <ShareButton
          title={`${eventTitle} — Album`}
          text={`Album from ${eventTitle}`}
          url={shareUrl}
          label="Share gallery"
          className="mt-2 h-11 rounded-full border border-foreground/15 bg-background px-5 text-sm font-medium text-foreground shadow-sm transition hover:shadow"
          ariaLabel="Share this gallery"
        />
      </div>
    </section>
  );
}
