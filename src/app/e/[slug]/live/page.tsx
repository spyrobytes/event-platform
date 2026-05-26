import { notFound, permanentRedirect } from "next/navigation";
import { Metadata } from "next";
import { TEMPLATES, type TemporalData } from "@/components/templates";
import { filterSectionsByVisibility } from "@/lib/guest-access";
import {
  getEventBySlug,
  getRedirectForRetiredSlug,
  resolveGuestAccess,
  loadAndMigrateConfig,
} from "@/lib/event-page-loader";
import { PageViewTracker } from "@/components/features/Analytics";
import { GuestBar } from "@/components/features/GuestBar";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

/**
 * Per-request token validation — same pattern as /e/[slug] and the other
 * sub-pages (registry, wishes).
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

  if (!event) return { title: "Livestream Not Found" };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  return {
    title: `Live Stream — ${event.title}`,
    description: `Watch the livestream for ${event.title}`,
    alternates: { canonical: `${baseUrl}/e/${slug}/live` },
    openGraph: {
      title: `Live Stream — ${event.title}`,
      description: `Watch the livestream for ${event.title}`,
      type: "website",
      url: `${baseUrl}/e/${slug}/live`,
    },
    // Stream URLs often carry private hashes / unlisted tokens; suppress
    // indexing whenever a guest token is present (mirrors /registry, /wishes).
    ...(tk && {
      robots: { index: false, follow: false },
      other: { referrer: "no-referrer" },
    }),
  };
}

/**
 * Dedicated livestream viewing page. Identical chrome (hero, nav, footer)
 * to the main event page, but the template's renderSection gates on
 * `subPageSection="livestream"` so only the livestream renders in the body.
 * 404 if the event has no enabled livestream section visible to the viewer.
 */
export default async function LivestreamPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { tk } = await searchParams;

  const event = await getEventBySlug(slug, !!tk);
  if (!event) {
    const renamed = await getRedirectForRetiredSlug(slug);
    if (renamed) {
      const qs = tk ? `?tk=${encodeURIComponent(tk)}` : "";
      permanentRedirect(`/e/${renamed}/live${qs}`);
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

  const filteredSections = filterSectionsByVisibility(config.sections, accessLevel);
  // 404 when there's no primary URL too — not just on `enabled: false` —
  // because the player branch has nothing to render and the only fallback
  // is "stream link hasn't been added yet," which is a dead end for a
  // viewer who clicked a "Watch live" CTA. Mirrors the nav eligibility
  // check in `hasRenderableContent` so phantom links can't slip through.
  const hasRenderableLivestream = filteredSections.some(
    (s) => s.type === "livestream" && s.enabled && Boolean(s.data.primary)
  );
  if (!hasRenderableLivestream) notFound();

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

  const bannerOffset = tokenInvalid
    ? ({ "--banner-offset": "40px" } as React.CSSProperties)
    : undefined;

  // Captured once at request time so the SSR livestream phase agrees with
  // the real clock — without it, an already-started or already-ended stream
  // renders the "hasn't started" placeholder until the client tick fires.
  // The React Compiler's purity rule targets client-component memoization;
  // server components legitimately need request-time clock reads, so the
  // disable is correct here (the value is consumed as a hydration-stable
  // prop, not as derived state).
  // eslint-disable-next-line react-hooks/purity
  const initialNowMs = Date.now();

  return (
    <div style={bannerOffset}>
      <PageViewTracker eventId={event.id} source="event_page" />
      {tokenInvalid && <InvalidTokenBanner />}
      {accessLevel === "guest" && guestName && (
        <GuestBar guestName={guestName} eventSlug={slug} />
      )}
      <Template
        config={filteredConfig}
        assets={assets}
        eventId={event.id}
        eventSlug={slug}
        temporal={temporal}
        inviteToken={tk}
        livestreamMode="full"
        initialNowMs={initialNowMs}
        navLinkBase={navLinkBase}
        subPageSection="livestream"
        canShare={event.visibility === "PUBLIC"}
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
