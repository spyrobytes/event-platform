import Link from "next/link";
import Image from "next/image";
import { isAllowedImageHost } from "@/lib/images/host";

/**
 * Discovery block rendered at the bottom of the public event page when a
 * gallery is published. Links to /e/[slug]/gallery for the full landing.
 *
 * Currently rendered as a sibling of the template (not above its footer)
 * because the template owns the full page composition — proper above-footer
 * placement requires per-template integration, tracked separately.
 */

type Props = {
  eventSlug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  /** Forwarded so unlisted/private viewers don't lose context on the gallery page. */
  inviteToken?: string;
};

export function PostEventGalleryTeaser({
  eventSlug,
  title,
  description,
  coverUrl,
  inviteToken,
}: Props) {
  const href = inviteToken
    ? `/e/${eventSlug}/gallery?tk=${encodeURIComponent(inviteToken)}`
    : `/e/${eventSlug}/gallery`;

  return (
    <section className="border-t border-border bg-background py-12 px-4 md:py-16">
      <div className="mx-auto max-w-4xl">
        <Link
          href={href}
          className="group flex flex-col gap-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md md:flex-row md:items-stretch"
        >
          {coverUrl && (
            <div className="relative aspect-[4/3] w-full md:aspect-auto md:w-2/5">
              <Image
                src={coverUrl}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover transition group-hover:scale-[1.02]"
                unoptimized={!isAllowedImageHost(coverUrl)}
              />
            </div>
          )}
          <div className="flex flex-1 flex-col justify-center gap-3 p-6 md:p-8">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Photo Gallery
            </div>
            <h2 className="text-2xl font-semibold leading-tight text-foreground md:text-3xl">
              {title}
            </h2>
            {description && (
              <p className="line-clamp-3 text-base leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
            <div className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-foreground">
              View gallery
              <span aria-hidden className="transition group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
