import { notFound } from "next/navigation";
import { Metadata } from "next";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { TEMPLATES, type TemporalData, type RegistryClaimSummaryDTO } from "@/components/templates";
import { summarizeClaims } from "@/lib/registry-claims";
import { validateAndMigrate, createMinimalConfig } from "@/lib/config-migrations";
import { filterSectionsByVisibility, type AccessLevel } from "@/lib/guest-access";
import { PageViewTracker } from "@/components/features/Analytics";
import { GuestBar } from "@/components/features/GuestBar";
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
      status: true,
      visibility: true,
      pageConfig: true,
      templateId: true,
      publishedAt: true,
      rsvpDeadline: true,
      mediaAssets: {
        select: {
          id: true,
          kind: true,
          publicUrl: true,
          width: true,
          height: true,
          alt: true,
          blurDataUrl: true,
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

  // Cancelled events are not accessible
  if (event.status === "CANCELLED") {
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
 * Returns `tokenInvalid: true` when a token was provided but didn't match a
 * valid invite, so the UI can show a helpful message.
 */
async function resolveGuestAccess(
  tk: string | undefined,
  eventId: string
): Promise<{
  accessLevel: AccessLevel;
  guestName: string | null;
  rsvpToken: string | null;
  tokenInvalid: boolean;
  inviteId: string | null;
}> {
  if (!tk) {
    return { accessLevel: "public", guestName: null, rsvpToken: null, tokenInvalid: false, inviteId: null };
  }

  const tokenHash = hashToken(tk);
  const invite = await db.invite.findFirst({
    where: {
      tokenHash,
      eventId,
      // Allow any status except EXPIRED and BOUNCED — guests can view
      // details before deciding to attend (PENDING/SENT/OPENED/RESPONDED).
      status: { notIn: ["EXPIRED", "BOUNCED"] },
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ],
    },
    select: { id: true, name: true },
  });

  if (invite) {
    return {
      accessLevel: "guest",
      guestName: invite.name || "Guest",
      rsvpToken: tk,
      tokenInvalid: false,
      inviteId: invite.id,
    };
  }

  // Token was present but invalid/expired — fall back to public view
  console.warn("[guest-access] invalid token", {
    eventId,
    tokenPrefix: tk.slice(0, 8),
  });
  return { accessLevel: "public", guestName: null, rsvpToken: null, tokenInvalid: true, inviteId: null };
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
    alternates: {
      canonical: `${baseUrl}/e/${slug}`,
    },
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
      // Browser spec requires name="referrer" (not "Referrer-Policy") for meta tag
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
    notFound();
  }

  // Resolve guest access level
  const { accessLevel, guestName, tokenInvalid, inviteId } = await resolveGuestAccess(tk, event.id);

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

  return (
    <>
      <PageViewTracker eventId={event.id} source="event_page" />
      {tokenInvalid && <InvalidTokenBanner />}
      {accessLevel === "guest" && guestName && <GuestBar guestName={guestName} eventSlug={slug} />}
      <Template
        config={filteredConfig}
        assets={assets}
        eventId={event.id}
        temporal={temporal}
        registryClaims={registryClaims}
        canClaim={accessLevel === "guest"}
      />
    </>
  );
}

/**
 * Subtle, dismissible banner shown when the guest token in the URL is
 * invalid or expired. Renders as a server component (no JS needed for
 * the message itself — the dismiss button is handled by the client wrapper).
 */
function InvalidTokenBanner() {
  return (
    <div className="w-full bg-warning/10 border-b border-warning/20 px-4 py-2 text-center text-sm text-warning">
      This guest link is invalid or has expired. You&apos;re viewing the public
      version of this page.{" "}
      <a
        href="mailto:support@eventsfixer.com"
        className="underline hover:text-warning/80"
      >
        Contact the organizer
      </a>{" "}
      if you need a new link.
    </div>
  );
}
