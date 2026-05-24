import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import {
  getEventBySlug,
  getRedirectForRetiredSlug,
  resolveGuestAccess,
} from "@/lib/event-page-loader";
import { getPublishedGalleryForEvent } from "@/lib/gallery-data";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import { GalleryExternalLinkLanding } from "@/components/features/PostEventGallery";

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
  // /e/[slug]. We only need to access-gate, not personalize — the gallery
  // payload doesn't depend on guest identity in Phase 1.
  await resolveGuestAccess(tk, event.id);

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

  // Native source — Phase 4 wires up the grid. For now this branch can't be
  // hit because no native gallery can be PUBLISHED until import items exist.
  notFound();
}
