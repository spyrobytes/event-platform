import Link from "next/link";
import Image from "next/image";
import { isAllowedImageHost } from "@/lib/images/host";
import { buildPublicGalleryHref } from "@/lib/gallery-urls";

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
  const href = buildPublicGalleryHref(eventSlug, inviteToken);

  // Literal neutral palette (white card + dark text) rather than Tailwind
  // theme tokens. Templates wrap this teaser in their own themed article
  // (e.g. wedding V2/V3's cream <article> with charcoal --text), and theme
  // tokens like `bg-card` / `text-foreground` resolve to page-level dark-mode
  // values that fight the wedding palette. A neutral white card lands the
  // same way on either a light or dark wrapper: stark contrast, no cascade
  // dependency.
  return (
    <section className="border-t border-zinc-200 bg-zinc-50 py-12 px-4 md:py-16">
      <div className="mx-auto max-w-4xl">
        <Link
          href={href}
          className="group flex flex-col gap-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-sm transition hover:shadow-md md:flex-row md:items-stretch"
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
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Album
            </div>
            <h2 className="text-2xl font-bold leading-tight text-zinc-900 md:text-3xl">
              {title}
            </h2>
            {description && (
              <p className="line-clamp-3 text-base leading-relaxed text-zinc-600">
                {description}
              </p>
            )}
            <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
              View Album
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
