import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import {
  getEventBySlug,
  getRedirectForRetiredSlug,
  resolveGuestAccess,
} from "@/lib/event-page-loader";
import { getPublishedGalleryForEvent } from "@/lib/gallery-data";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import {
  GalleryExternalLinkLanding,
  PostEventGalleryGrid,
} from "@/components/features/PostEventGallery";
import Link from "next/link";

/**
 * Inherits the same access semantics as /e/[slug] — see §8.4. Force-dynamic
 * because we read the guest token from searchParams just like the main page.
 */
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tk?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { tk } = await searchParams;

  if (!isPostEventGalleryEnabled()) {
    return { title: "Gallery" };
  }

  const event = await getEventBySlug(slug, !!tk);
  if (!event) return { title: "Gallery Not Found" };

  const gallery = await getPublishedGalleryForEvent(event.id);
  if (!gallery) return { title: "Gallery" };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const title = gallery.title
    ? `${gallery.title} — ${event.title}`
    : `${event.title} — Photos`;

  return {
    title,
    description: gallery.description ?? `Photos from ${event.title}`,
    alternates: { canonical: `${baseUrl}/e/${slug}/gallery` },
    openGraph: {
      title,
      description: gallery.description ?? `Photos from ${event.title}`,
      type: "website",
      url: `${baseUrl}/e/${slug}/gallery`,
      ...(gallery.coverUrl && {
        images: [{ url: gallery.coverUrl }],
      }),
    },
    ...((tk || event.visibility !== "PUBLIC") && {
      robots: { index: false, follow: false },
    }),
    ...(tk && { other: { referrer: "no-referrer" } }),
  };
}

export default async function PostEventGalleryPage({
  params,
  searchParams,
}: PageProps) {
  if (!isPostEventGalleryEnabled()) notFound();

  const { slug } = await params;
  const { tk } = await searchParams;

  const event = await getEventBySlug(slug, !!tk);
  if (!event) {
    const renamed = await getRedirectForRetiredSlug(slug);
    if (renamed) {
      const qs = tk ? `?tk=${encodeURIComponent(tk)}` : "";
      permanentRedirect(`/e/${renamed}/gallery${qs}`);
    }
    notFound();
  }

  // resolveGuestAccess handles the same token/visibility rules used by
  // /e/[slug]. Unlike sibling sub-routes (/registry, /wishes, /live), the
  // post-event gallery isn't a page-config section, so filterSectionsByVisibility
  // can't gate it. PRIVATE events require a valid guest token here — without
  // this check, any non-empty ?tk= would pass getEventBySlug and expose the
  // gallery (the result of resolveGuestAccess was previously discarded).
  const { accessLevel } = await resolveGuestAccess(tk, event.id);
  if (event.visibility === "PRIVATE" && accessLevel !== "guest") notFound();

  const gallery = await getPublishedGalleryForEvent(event.id);
  if (!gallery) notFound();

  if (gallery.sourceType === "EXTERNAL_LINK") {
    return (
      <GalleryExternalLinkLanding
        eventTitle={event.title}
        eventSlug={slug}
        galleryTitle={gallery.title ?? `${event.title} Photos`}
        description={gallery.description}
        coverUrl={gallery.coverUrl}
        externalUrl={gallery.externalLink.url}
        ctaLabel={gallery.externalLink.ctaLabel}
        trustedHostName={gallery.externalLink.trustedHostName}
        inviteToken={tk}
      />
    );
  }

  // Native variant — render the grid + lightbox within event theme chrome
  // (simple back link header; full template integration is PR #2.5).
  const backHref = tk ? `/e/${slug}?tk=${encodeURIComponent(tk)}` : `/e/${slug}`;
  const title = gallery.title ?? `${event.title} Photos`;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <span aria-hidden>←</span>
            <span>Back to {event.title}</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div className="mb-8 space-y-3 text-center">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Photo Gallery
          </div>
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
            {title}
          </h1>
          {gallery.description && (
            <p className="mx-auto max-w-prose text-base leading-relaxed text-muted-foreground">
              {gallery.description}
            </p>
          )}
        </div>
        <PostEventGalleryGrid
          eventId={event.id}
          initialItems={gallery.items}
          initialNextCursor={gallery.pageInfo.nextCursor}
          inviteToken={tk}
          variant={gallery.presentation.variant}
        />
      </main>
    </div>
  );
}
