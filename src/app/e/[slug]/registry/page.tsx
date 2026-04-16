import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { TEMPLATES, type TemporalData, type RegistryClaimSummaryDTO } from "@/components/templates";
import { summarizeClaims } from "@/lib/registry-claims";
import { filterSectionsByVisibility } from "@/lib/guest-access";
import {
  getEventBySlug,
  resolveGuestAccess,
  loadAndMigrateConfig,
} from "@/lib/event-page-loader";
import { PageViewTracker } from "@/components/features/Analytics";
import { GuestBar } from "@/components/features/GuestBar";
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
 * Full registry page — renders the event's template with sections filtered
 * down to just the registry. Public-viewable; claim controls only light up
 * for guests with a valid invite token (same gating as the main event page).
 */
export default async function FullRegistryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { tk } = await searchParams;

  const event = await getEventBySlug(slug, !!tk);
  if (!event) notFound();

  const { accessLevel, guestName, tokenInvalid, inviteId } =
    await resolveGuestAccess(tk, event.id);

  const templateId = event.templateId || DEFAULT_TEMPLATE_ID;
  const resolvedTemplateId = templateId in TEMPLATES ? templateId : DEFAULT_TEMPLATE_ID;

  const config = loadAndMigrateConfig(event.pageConfig, {
    eventId: event.id,
    eventTitle: event.title,
  });

  // Filter by visibility first, then narrow to registry only. If the registry
  // section isn't present (or was filtered out for this viewer), 404 —
  // there's nothing meaningful to render here.
  const filteredSections = filterSectionsByVisibility(config.sections, accessLevel);
  const registryOnly = filteredSections.filter((s) => s.type === "registry" && s.enabled);
  if (registryOnly.length === 0) notFound();

  const filteredConfig: EventPageConfigV1 = { ...config, sections: registryOnly };

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

  // Claim summaries — same logic as /e/[slug], but only fetched if the
  // registry actually made it through visibility filtering (it did, since
  // we just checked). Guests only; public visitors get read-only cards.
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

  const backHref = `/e/${slug}${tk ? `?tk=${encodeURIComponent(tk)}` : ""}`;

  return (
    <>
      <PageViewTracker eventId={event.id} source="event_page" />
      {tokenInvalid && <InvalidTokenBanner />}
      {accessLevel === "guest" && guestName && <GuestBar guestName={guestName} eventSlug={slug} />}
      <div style={{ padding: "16px 24px" }}>
        <Link
          href={backHref}
          style={{
            fontFamily: "var(--sans, system-ui)",
            fontSize: "0.9rem",
            color: "var(--accent, #7a8c72)",
            textDecoration: "none",
          }}
        >
          ← Back to {event.title}
        </Link>
      </div>
      <Template
        config={filteredConfig}
        assets={assets}
        eventId={event.id}
        eventSlug={slug}
        temporal={temporal}
        registryClaims={registryClaims}
        canClaim={accessLevel === "guest"}
        registryMode="full"
      />
    </>
  );
}

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
