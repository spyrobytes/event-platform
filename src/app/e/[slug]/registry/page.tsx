import { notFound, permanentRedirect } from "next/navigation";
import { Metadata } from "next";
import { db } from "@/lib/db";
import { TEMPLATES, type TemporalData, type RegistryClaimSummaryDTO } from "@/components/templates";
import { summarizeClaims } from "@/lib/registry-claims";
import { filterSectionsByVisibility } from "@/lib/guest-access";
import { applyTypedScheduleToSections } from "@/lib/schedule-section-data";
import {
  getEventBySlug,
  getRedirectForRetiredSlug,
  resolveGuestAccess,
  loadAndMigrateConfig,
} from "@/lib/event-page-loader";
import { PageViewTracker } from "@/components/features/Analytics";
import { GuestBar } from "@/components/features/GuestBar";
import { getPublishedGalleryForEvent } from "@/lib/gallery-data";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import { resolvePostEventGalleryHref } from "@/lib/gallery-urls";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

/**
 * Same rationale as /e/[slug]: per-request token validation.
 */
export const dynamic = "force-dynamic";

const DEFAULT_TEMPLATE_ID = "wedding_v1";

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
  const event = await getEventBySlug(slug, tk);

  if (!event) return { title: "Registry Not Found" };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  return {
    title: `Gift Registry — ${event.title}`,
    description: `Gift registry for ${event.title}`,
    alternates: { canonical: `${baseUrl}/e/${slug}/registry` },
    openGraph: {
      title: `Gift Registry — ${event.title}`,
      description: `Gift registry for ${event.title}`,
      type: "website",
      url: `${baseUrl}/e/${slug}/registry`,
    },
    ...(tk && {
      robots: { index: false, follow: false },
      other: { referrer: "no-referrer" },
    }),
  };
}

/**
 * Full registry page — identical layout to the main event page (hero, nav,
 * all sections, footer) but with the registry section in "full" mode showing
 * all items instead of the 4-item preview. Public-viewable; claim controls
 * only light up for guests with a valid invite token.
 */
export default async function FullRegistryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { tk } = await searchParams;

  const event = await getEventBySlug(slug, tk);
  if (!event) {
    const renamed = await getRedirectForRetiredSlug(slug);
    if (renamed) {
      const qs = tk ? `?tk=${encodeURIComponent(tk)}` : "";
      permanentRedirect(`/e/${renamed}/registry${qs}`);
    }
    notFound();
  }

  const { accessLevel, guestName, tokenInvalid, inviteId } =
    await resolveGuestAccess(tk, event.id);

  const templateId = event.templateId || DEFAULT_TEMPLATE_ID;
  const resolvedTemplateId = templateId in TEMPLATES ? templateId : DEFAULT_TEMPLATE_ID;

  const config = loadAndMigrateConfig(event.pageConfig, {
    eventId: event.id,
    eventTitle: event.title,
  });

  // All sections are passed to the template so nav/footer links match the
  // landing page. The template's renderSection gates on navLinkBase to only
  // render the registry section in the body. 404 if no registry section.
  const filteredSections = filterSectionsByVisibility(config.sections, accessLevel);
  const hasRegistry = filteredSections.some((s) => s.type === "registry" && s.enabled);
  if (!hasRegistry) notFound();

  // Same typed-schedule substitution as /e/[slug] — this route renders the
  // full template (nav parity), so the schedule section must match it.
  const filteredConfig: EventPageConfigV1 = {
    ...config,
    sections: applyTypedScheduleToSections(
      filteredSections,
      event.schedule,
      event.timezone
    ),
  };
  const navLinkBase = `/e/${slug}${tk ? `?tk=${encodeURIComponent(tk)}` : ""}`;

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

  const temporal: TemporalData = {
    startAt: event.startAt?.toISOString() ?? null,
    endAt: event.endAt?.toISOString() ?? null,
    timezone: event.timezone,
    rsvpDeadline: event.rsvpDeadline?.toISOString() ?? null,
    schedule: event.schedule,
  };

  const Template = TEMPLATES[resolvedTemplateId];

  // Claim summaries — same logic as /e/[slug]. Guests only; public visitors
  // get read-only cards.
  let registryClaims: Record<string, RegistryClaimSummaryDTO> | undefined;
  if (accessLevel === "guest") {
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

  // Mirror /e/[slug]: surface the Photos nav link when a gallery is
  // published so navigation across sub-pages stays consistent.
  const postEventGallery = isPostEventGalleryEnabled()
    ? await getPublishedGalleryForEvent(event.id)
    : null;
  const postEventGalleryHref = resolvePostEventGalleryHref({
    hasPublishedGallery: postEventGallery !== null,
    eventSlug: slug,
    eventVisibility: event.visibility,
    inviteToken: tk,
    tokenInvalid,
  });

  const bannerOffset = tokenInvalid ? { "--banner-offset": "40px" } as React.CSSProperties : undefined;

  return (
    <div style={bannerOffset}>
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
        registryMode="full"
        navLinkBase={navLinkBase}
        subPageSection="registry"
        canShare={event.visibility === "PUBLIC"}
        postEventGalleryHref={postEventGalleryHref}
      />
    </div>
  );
}

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
