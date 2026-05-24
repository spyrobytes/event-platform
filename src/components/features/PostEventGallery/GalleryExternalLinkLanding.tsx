import Image from "next/image";
import Link from "next/link";

/**
 * Polished landing card for an external-link gallery, rendered on the
 * dedicated /e/[slug]/gallery route. Keeps users in our chrome until they
 * explicitly click the outbound CTA — the teaser links here rather than
 * directly out to the external URL.
 */

type Props = {
  eventTitle: string;
  eventSlug: string;
  galleryTitle: string;
  description: string | null;
  coverUrl: string | null;
  externalUrl: string;
  ctaLabel: string;
  trustedHostName: string | null;
  /** Carried through on the "back to event" link for unlisted/private viewers. */
  inviteToken?: string;
};

export function GalleryExternalLinkLanding({
  eventTitle,
  eventSlug,
  galleryTitle,
  description,
  coverUrl,
  externalUrl,
  ctaLabel,
  trustedHostName,
  inviteToken,
}: Props) {
  const backHref = inviteToken
    ? `/e/${eventSlug}?tk=${encodeURIComponent(inviteToken)}`
    : `/e/${eventSlug}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <span aria-hidden>←</span>
            <span>Back to {eventTitle}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 md:py-20">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          {coverUrl && (
            <div className="relative aspect-[16/9] w-full">
              <Image
                src={coverUrl}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                priority
              />
            </div>
          )}
          <div className="space-y-6 p-6 text-center md:p-10">
            <div className="space-y-3">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Photo Gallery
              </div>
              <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
                {galleryTitle}
              </h1>
              {description && (
                <p className="mx-auto max-w-prose text-base leading-relaxed text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            <div className="flex flex-col items-center gap-3">
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
              >
                {ctaLabel}
                <span aria-hidden>↗</span>
              </a>
              {trustedHostName && (
                <p className="text-xs text-muted-foreground">
                  Hosted on {trustedHostName}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
