import { notFound } from "next/navigation";
import { Metadata } from "next";
import { db } from "@/lib/db";
import { TEMPLATES, type TemporalData } from "@/components/templates";
import { validateAndMigrate, createMinimalConfig } from "@/lib/config-migrations";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

/**
 * ISR Configuration
 * - Pages are statically generated at build time
 * - Revalidated every 60 seconds as a fallback
 * - On-demand revalidation triggered when page config is updated
 */
export const revalidate = 60;

/**
 * Default template ID used when event has no template or template not found
 */
const DEFAULT_TEMPLATE_ID = "wedding_v1";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Generate static params for published events
 * This pre-generates pages at build time for all published events
 * Returns empty array if database is not available (e.g., CI builds)
 */
export async function generateStaticParams() {
  // Skip static generation if DATABASE_URL is not set (e.g., CI builds)
  // Pages will be generated on-demand via ISR instead
  if (!process.env.DATABASE_URL) {
    return [];
  }

  try {
    const publishedEvents = await db.event.findMany({
      where: {
        publishedAt: { not: null },
      },
      select: {
        slug: true,
      },
      take: 1000, // Limit to prevent build time issues
    });

    return publishedEvents.map((event) => ({
      slug: event.slug,
    }));
  } catch {
    // If database connection fails, return empty array
    // Pages will be generated on-demand via ISR
    return [];
  }
}

/**
 * Fetch event data by slug
 * Returns null if event not found or page not published
 */
async function getEventBySlug(slug: string) {
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

  // Check if page is published
  if (!event.publishedAt) {
    return null;
  }

  return event;
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

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

  return {
    title: event.title,
    description: event.description || `Join us for ${event.title}`,
    openGraph: {
      title: event.title,
      description: event.description || `Join us for ${event.title}`,
      type: "website",
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
  };
}

/**
 * Public event page
 * Renders the event using its configured template
 */
export default async function PublicEventPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

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

  return <Template config={config} assets={assets} eventId={event.id} temporal={temporal} />;
}
