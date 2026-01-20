import { notFound } from "next/navigation";
import { Metadata } from "next";
import { db } from "@/lib/db";
import { getTemplate } from "@/components/templates";
import { validateAndMigrate, createMinimalConfig } from "@/lib/config-migrations";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

type PageProps = {
  params: Promise<{ slug: string }>;
};

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

  // Get template component
  const templateId = event.templateId || "wedding_v1";
  const Template = getTemplate(templateId);

  if (!Template) {
    // Fallback to default template
    const DefaultTemplate = getTemplate("wedding_v1");
    if (!DefaultTemplate) {
      throw new Error(`No template found for event ${event.id}`);
    }
  }

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

  const TemplateComponent = Template || getTemplate("wedding_v1")!;

  return <TemplateComponent config={config} assets={assets} />;
}
