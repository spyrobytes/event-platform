import { notFound, permanentRedirect } from "next/navigation";
import { Metadata } from "next";
import { db } from "@/lib/db";
import { TEMPLATES, type TemporalData, type RegistryClaimSummaryDTO, type ApprovedWishDTO } from "@/components/templates";
import { summarizeClaims } from "@/lib/registry-claims";
import { filterSectionsByVisibility } from "@/lib/guest-access";
import {
  getEventBySlug,
  getRedirectForRetiredSlug,
  resolveGuestAccess,
  loadAndMigrateConfig,
} from "@/lib/event-page-loader";
import { PageViewTracker } from "@/components/features/Analytics";
import { GuestBar } from "@/components/features/GuestBar";
import { EventJsonLd } from "@/components/seo/EventJsonLd";
import {
  HeroPostEventCta,
  PostEventGalleryTeaser,
} from "@/components/features/PostEventGallery";
import { getEnabledMapSection } from "@/lib/maps/map-utils";
import { getAbsoluteStaticMapImageUrl } from "@/lib/maps/static-map";
import { getPublishedGalleryForEvent } from "@/lib/gallery-data";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import { resolvePostEventGalleryHref } from "@/lib/gallery-urls";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

/**
 * Dynamic rendering — required because we read searchParams for guest token.
 * Previously this used ISR (revalidate=60 + generateStaticParams), but the
 * guest portal needs per-request token validation. At current scale this is
 * fine; ISR can be restored via middleware path-splitting later.
 */
export const dynamic = "force-dynamic";

/**
 * Default template ID used when event has no template or template not found
 */
const DEFAULT_TEMPLATE_ID = "wedding_v1";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tk?: string }>;
};

/**
 * Generate metadata for SEO.
 * When a guest token is present, prevents indexing to avoid token leakage.
 */
export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { tk } = await searchParams;
  const event = await getEventBySlug(slug, !!tk);

  if (!event) {
    return {
      title: "Event Not Found",
    };
  }

  // Extract hero config for og:image if available
  const config = event.pageConfig as EventPageConfigV1 | null;
  const heroAssetId = config?.hero?.heroImageAssetId;
  const heroAsset = heroAssetId
    ? event.mediaAssets.find((a: { id: string }) => a.id === heroAssetId)
    : null;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";

  // OG image priority: organizer-chosen hero asset (richer, often a
  // photograph) → static map of the venue when a map section is enabled
  // and has coords. Social-share crawlers cache the resolved URL, so each
  // unique event hits the static-map proxy ~once across all viewers.
  const mapSection = config ? getEnabledMapSection(config) : undefined;
  const mapOgImage = mapSection
    ? getAbsoluteStaticMapImageUrl(mapSection, baseUrl, { width: 1200, height: 630 })
    : null;
  const ogImage = heroAsset?.publicUrl
    ? {
        url: heroAsset.publicUrl,
        width: heroAsset.width ?? 1200,
        height: heroAsset.height ?? 630,
        alt: heroAsset.alt || event.title,
      }
    : mapOgImage
      ? {
          url: mapOgImage,
          width: 1200,
          height: 630,
          alt: `Map of ${event.venueName || event.title}`,
        }
      : null;

  return {
    title: event.title,
    description: event.description || `Join us for ${event.title}`,
    alternates: {
      canonical: `${baseUrl}/e/${slug}`,
    },
    openGraph: {
      title: event.title,
      description: event.description || `Join us for ${event.title}`,
      type: "website",
      // Always use clean URL for social sharing — never include ?tk=
      url: `${baseUrl}/e/${slug}`,
      ...(ogImage && { images: [ogImage] }),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: event.title,
      description: event.description || `Join us for ${event.title}`,
    },
    // Noindex non-PUBLIC events. UNLISTED is "accessible by direct link
    // only" — letting search engines index it defeats the visibility
    // contract. PRIVATE 404s without a token, but a token-bearing request
    // also lands here and must be excluded.
    ...((tk || event.visibility !== "PUBLIC") && {
      robots: { index: false, follow: false },
    }),
    // No-referrer only when a token is present, to prevent leaking ?tk= via
    // outbound link clicks. Browser spec requires name="referrer".
    ...(tk && {
      other: { referrer: "no-referrer" },
    }),
  };
}

/**
 * Public event page with guest portal support.
 * Renders the event using its configured template, filtering sections
 * based on the viewer's access level (public vs authenticated guest).
 */
export default async function PublicEventPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { tk } = await searchParams;

  const event = await getEventBySlug(slug, !!tk);

  if (!event) {
    const renamed = await getRedirectForRetiredSlug(slug);
    if (renamed) {
      const qs = tk ? `?tk=${encodeURIComponent(tk)}` : "";
      permanentRedirect(`/e/${renamed}${qs}`);
    }
    notFound();
  }

  // Resolve guest access level
  const { accessLevel, guestName, tokenInvalid, inviteId } = await resolveGuestAccess(tk, event.id);

  // Resolve template ID with fallback
  const templateId = event.templateId || DEFAULT_TEMPLATE_ID;
  const resolvedTemplateId = templateId in TEMPLATES ? templateId : DEFAULT_TEMPLATE_ID;

  const config: EventPageConfigV1 = loadAndMigrateConfig(event.pageConfig, {
    eventId: event.id,
    eventTitle: event.title,
  });

  // Filter sections by visibility BEFORE passing to template
  const filteredSections = filterSectionsByVisibility(config.sections, accessLevel);
  const filteredConfig: EventPageConfigV1 = { ...config, sections: filteredSections };

  // Cast media assets to the expected type
  const assets = event.mediaAssets.map((asset: {
    id: string;
    kind: string;
    publicUrl: string | null;
    width: number | null;
    height: number | null;
    alt: string;
    blurDataUrl: string | null;
  }) => ({
    ...asset,
    eventId: event.id,
    ownerUserId: "",
    bucket: "",
    path: "",
    mimeType: "",
    sizeBytes: 0,
    createdAt: new Date(),
  })) as unknown as MediaAsset[];

  // Build temporal data for time-aware rendering
  const temporal: TemporalData = {
    startAt: event.startAt?.toISOString() ?? null,
    endAt: event.endAt?.toISOString() ?? null,
    timezone: event.timezone,
    rsvpDeadline: event.rsvpDeadline?.toISOString() ?? null,
  };

  // Use direct component reference from TEMPLATES to satisfy static component rules
  const Template = TEMPLATES[resolvedTemplateId];

  // Registry claims — only fetched when the viewer has a valid invite token,
  // since claims are guest-only. Organizer claims (source=ORGANIZER) are
  // skipped because the item-level `purchased` flag already drives rendering.
  let registryClaims: Record<string, RegistryClaimSummaryDTO> | undefined;
  if (accessLevel === "guest") {
    const hasRegistry = filteredSections.some((s) => s.type === "registry");
    if (hasRegistry) {
      const claims = await db.registryClaim.findMany({
        where: { eventId: event.id, source: "GUEST" },
        select: {
          id: true,
          itemId: true,
          inviteId: true,
          quantity: true,
          source: true,
        },
      });
      const summary = summarizeClaims({
        allClaims: claims.map((c) => ({ ...c, source: c.source as "GUEST" | "ORGANIZER" })),
        myInviteId: inviteId,
      });
      registryClaims = Object.fromEntries(summary);
    }
  }

  // Approved wedding wishes — fetched whenever the wishes section is enabled.
  // Public visitors see the same approved messages as guests (moderation is
  // the gate, not access level). Empty array when nothing has been approved
  // yet; renderer treats that as "render nothing".
  let approvedWishes: ApprovedWishDTO[] | undefined;
  const hasWishes = filteredSections.some((s) => s.type === "wishes" && s.enabled);
  if (hasWishes) {
    const rows = await db.rSVP.findMany({
      where: {
        eventId: event.id,
        messageStatus: "APPROVED",
        messageToHost: { not: null },
      },
      select: {
        id: true,
        guestName: true,
        messageToHost: true,
        messageApprovedAt: true,
        respondedAt: true,
      },
      orderBy: [
        { messageApprovedAt: "desc" },
        { respondedAt: "desc" },
      ],
    });
    approvedWishes = rows.map((r) => ({
      id: r.id,
      message: r.messageToHost ?? "",
      authorName: r.guestName,
    }));
  }

  // Surface a teaser at the bottom of the page when a post-event gallery is
  // published. Discoverability story for Phase 1; per-template hero CTA +
  // above-footer placement come in a follow-up polish PR (#2.5).
  const postEventGallery = isPostEventGalleryEnabled()
    ? await getPublishedGalleryForEvent(event.id)
    : null;

  const bannerOffset = tokenInvalid ? { "--banner-offset": "40px" } as React.CSSProperties : undefined;

  // Captured once at request time so the SSR livestream phase agrees with
  // the real clock — without it, an already-started or already-ended stream
  // renders the "hasn't started" placeholder until the client tick fires.
  // The React Compiler's purity rule targets client-component memoization;
  // server components legitimately need request-time clock reads, so the
  // disable is correct here (the value is consumed as a hydration-stable
  // prop, not as derived state).
  // eslint-disable-next-line react-hooks/purity
  const initialNowMs = Date.now();

  // Event JSON-LD only renders for indexable views. Token-bearing requests
  // and non-PUBLIC events are noindex (see generateMetadata above), so we
  // also skip emitting structured data for them — it would be wasted bytes
  // and a weak signal to crawlers that ignore the noindex directive.
  const includeJsonLd = !tk && event.visibility === "PUBLIC";

  return (
    <div style={bannerOffset}>
      {includeJsonLd && (
        <EventJsonLd
          event={event}
          mapSection={getEnabledMapSection(filteredConfig)}
        />
      )}
      <PageViewTracker eventId={event.id} source="event_page" />
      {tokenInvalid && <InvalidTokenBanner />}
      {accessLevel === "guest" && guestName && <GuestBar guestName={guestName} eventSlug={slug} />}
      <Template
        config={filteredConfig}
        assets={assets}
        eventId={event.id}
        eventSlug={slug}
        temporal={temporal}
        registryClaims={registryClaims}
        canClaim={accessLevel === "guest"}
        registryMode="preview"
        approvedWishes={approvedWishes}
        wishesMode="preview"
        livestreamMode="preview"
        initialNowMs={initialNowMs}
        inviteToken={tk}
        canShare={event.visibility === "PUBLIC"}
        postEventGalleryCta={
          postEventGallery ? (
            <HeroPostEventCta eventSlug={slug} inviteToken={tk} />
          ) : undefined
        }
        postEventGalleryTeaser={
          postEventGallery ? (
            <PostEventGalleryTeaser
              eventSlug={slug}
              title={postEventGallery.title ?? `${event.title} Photos`}
              description={postEventGallery.description}
              coverUrl={postEventGallery.coverUrl}
              inviteToken={tk}
            />
          ) : undefined
        }
        postEventGalleryHref={resolvePostEventGalleryHref({
          hasPublishedGallery: postEventGallery !== null,
          eventSlug: slug,
          eventVisibility: event.visibility,
          inviteToken: tk,
          tokenInvalid,
        })}
      />
    </div>
  );
}

/**
 * Subtle, dismissible banner shown when the guest token in the URL is
 * invalid or expired. Renders as a server component (no JS needed for
 * the message itself — the dismiss button is handled by the client wrapper).
 */
function InvalidTokenBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[150] bg-amber-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-md">
      This guest link is invalid or has expired. You&apos;re viewing the public
      version of this page.{" "}
      <a
        href="mailto:support@eventfxr.com"
        className="underline hover:text-white/80"
      >
        Contact the organizer
      </a>{" "}
      if you need a new link.
    </div>
  );
}
