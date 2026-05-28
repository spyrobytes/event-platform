import { notFound, permanentRedirect } from "next/navigation";
import { Metadata } from "next";
import { db } from "@/lib/db";
import { TEMPLATES, type TemporalData, type ApprovedWishDTO } from "@/components/templates";
import { filterSectionsByVisibility } from "@/lib/guest-access";
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
  const event = await getEventBySlug(slug, !!tk);

  if (!event) return { title: "Wishes Not Found" };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  return {
    title: `Wedding Wishes — ${event.title}`,
    description: `Wedding wishes for ${event.title}`,
    alternates: { canonical: `${baseUrl}/e/${slug}/wishes` },
    openGraph: {
      title: `Wedding Wishes — ${event.title}`,
      description: `Wedding wishes for ${event.title}`,
      type: "website",
      url: `${baseUrl}/e/${slug}/wishes`,
    },
    ...(tk && {
      robots: { index: false, follow: false },
      other: { referrer: "no-referrer" },
    }),
  };
}

/**
 * Full wedding-wishes page — identical layout to the main event page (hero,
 * nav, all sections, footer) but with the wishes section in "full" mode
 * showing every approved message instead of the previewCount preview.
 * Public-viewable; only approved (moderated) messages are exposed.
 */
export default async function FullWishesPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { tk } = await searchParams;

  const event = await getEventBySlug(slug, !!tk);
  if (!event) {
    const renamed = await getRedirectForRetiredSlug(slug);
    if (renamed) {
      const qs = tk ? `?tk=${encodeURIComponent(tk)}` : "";
      permanentRedirect(`/e/${renamed}/wishes${qs}`);
    }
    notFound();
  }

  const { accessLevel, guestName, tokenInvalid } =
    await resolveGuestAccess(tk, event.id);

  const templateId = event.templateId || DEFAULT_TEMPLATE_ID;
  const resolvedTemplateId = templateId in TEMPLATES ? templateId : DEFAULT_TEMPLATE_ID;

  const config = loadAndMigrateConfig(event.pageConfig, {
    eventId: event.id,
    eventTitle: event.title,
  });

  // All sections are passed to the template so nav/footer links match the
  // landing page. The template's renderSection gates on subPageSection to
  // only render the wishes section in the body. 404 if no wishes section.
  const filteredSections = filterSectionsByVisibility(config.sections, accessLevel);
  const hasWishes = filteredSections.some((s) => s.type === "wishes" && s.enabled);
  if (!hasWishes) notFound();

  const filteredConfig: EventPageConfigV1 = { ...config, sections: filteredSections };
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
  };

  const Template = TEMPLATES[resolvedTemplateId];

  // Fetch all approved wishes — no preview cap on the dedicated page.
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
  const approvedWishes: ApprovedWishDTO[] = rows.map((r) => ({
    id: r.id,
    message: r.messageToHost ?? "",
    authorName: r.guestName,
  }));

  // Mirror the main page's gallery discovery — without this, guests
  // navigating to /wishes lose the Photos nav link the V3 template
  // surfaces when a published gallery exists. Feature flag gates the
  // query exactly like /e/[slug] does.
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
        canClaim={accessLevel === "guest"}
        approvedWishes={approvedWishes}
        wishesMode="full"
        inviteToken={tk}
        navLinkBase={navLinkBase}
        subPageSection="wishes"
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
