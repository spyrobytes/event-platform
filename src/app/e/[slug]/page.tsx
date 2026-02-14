import { notFound } from "next/navigation";
import { Metadata } from "next";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { TEMPLATES, type TemporalData } from "@/components/templates";
import { validateAndMigrate, createMinimalConfig } from "@/lib/config-migrations";
import { filterSectionsByVisibility, type AccessLevel } from "@/lib/guest-access";
import { PageViewTracker } from "@/components/features/Analytics";
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
 * Fetch event data by slug.
 * For PRIVATE events, returns the event only if a guest token is present.
 */
async function getEventBySlug(slug: string, hasGuestToken: boolean) {
  const event = await db.event.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      timezone: true,
      venueName: true,
      city: true,
      visibility: true,
      pageConfig: true,
      templateId: true,
      publishedAt: true,
      mediaAssets: {
        select: {
          id: true,
          kind: true,
          publicUrl: true,
          width: true,
          height: true,
          alt: true,
        },
      },
    },
  });

  if (!event) {
    return null;
  }

  // Must be published
  if (!event.publishedAt) {
    return null;
  }

  // PRIVATE events are only accessible with a guest token
  if (event.visibility === "PRIVATE" && !hasGuestToken) {
    return null;
  }

  return event;
}

/**
 * Resolve guest access level by validating the invite token against the event.
 */
async function resolveGuestAccess(
  tk: string | undefined,
  eventId: string
): Promise<{ accessLevel: AccessLevel; guestName: string | null; rsvpToken: string | null }> {
  if (!tk) {
    return { accessLevel: "public", guestName: null, rsvpToken: null };
  }

  const tokenHash = hashToken(tk);
  const invite = await db.invite.findFirst({
    where: {
      tokenHash,
      eventId,
      // No status check — valid invite = access, regardless of RSVP status.
      // Guests should be able to view details before deciding to attend.
    },
    select: { id: true, name: true },
  });

  if (invite) {
    return {
      accessLevel: "guest",
      guestName: invite.name || "Guest",
      rsvpToken: tk,
    };
  }

  // Invalid token — silently fall back to public view
  return { accessLevel: "public", guestName: null, rsvpToken: null };
}

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

  return {
    title: event.title,
    description: event.description || `Join us for ${event.title}`,
    openGraph: {
      title: event.title,
      description: event.description || `Join us for ${event.title}`,
      type: "website",
      // Always use clean URL for social sharing — never include ?tk=
      url: `${baseUrl}/e/${slug}`,
      ...(heroAsset?.publicUrl && {
        images: [
          {
            url: heroAsset.publicUrl,
            width: heroAsset.width || 1200,
            height: heroAsset.height || 630,
            alt: heroAsset.alt || event.title,
          },
        ],
      }),
    },
    twitter: {
      card: heroAsset ? "summary_large_image" : "summary",
      title: event.title,
      description: event.description || `Join us for ${event.title}`,
    },
    // Prevent indexing when token is present to avoid token leakage in search results
    ...(tk && {
      robots: { index: false, follow: false },
      other: { "Referrer-Policy": "no-referrer" },
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
    notFound();
  }

  // Resolve guest access level
  const { accessLevel } = await resolveGuestAccess(tk, event.id);

  // Resolve template ID with fallback
  const templateId = event.templateId || DEFAULT_TEMPLATE_ID;
  const resolvedTemplateId = templateId in TEMPLATES ? templateId : DEFAULT_TEMPLATE_ID;

  // Validate and migrate config if needed
  let config: EventPageConfigV1;
  if (event.pageConfig) {
    try {
      config = validateAndMigrate(event.pageConfig);
    } catch {
      config = createMinimalConfig(event.title);
    }
  } else {
    config = createMinimalConfig(event.title);
  }

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
  };

  // Use direct component reference from TEMPLATES to satisfy static component rules
  const Template = TEMPLATES[resolvedTemplateId];

  return (
    <>
      <PageViewTracker eventId={event.id} source="event_page" />
      <Template config={filteredConfig} assets={assets} eventId={event.id} temporal={temporal} />
    </>
  );
}
