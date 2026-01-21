import { notFound } from "next/navigation";
import { Metadata } from "next";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { TEMPLATES } from "@/components/templates";
import { validateAndMigrate, createMinimalConfig } from "@/lib/config-migrations";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

/**
 * Preview pages should not be cached
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Default template ID used when event has no template or template not found
 */
const DEFAULT_TEMPLATE_ID = "wedding_v1";

type PageProps = {
  params: Promise<{ token: string }>;
};

/**
 * Find event by preview token
 * Returns null if token invalid or expired
 */
async function getEventByPreviewToken(token: string) {
  const hashedToken = hashToken(token);

  const event = await db.event.findUnique({
    where: { previewToken: hashedToken },
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
      previewTokenExpiresAt: true,
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

  // Check if token has expired
  if (event.previewTokenExpiresAt && event.previewTokenExpiresAt < new Date()) {
    return null;
  }

  return event;
}

/**
 * Generate metadata for preview pages
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const event = await getEventByPreviewToken(token);

  if (!event) {
    return {
      title: "Preview Not Available",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `Preview: ${event.title}`,
    description: event.description || `Preview of ${event.title}`,
    robots: { index: false, follow: false },
  };
}

/**
 * Preview banner component
 */
function PreviewBanner() {
  return (
    <div className="fixed left-0 right-0 top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
      <div className="flex items-center justify-center gap-2">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
        <span>Preview Mode - This page is not yet published</span>
      </div>
    </div>
  );
}

/**
 * Public preview page
 * Renders the event using its configured template with a preview banner
 */
export default async function PreviewPage({ params }: PageProps) {
  const { token } = await params;
  const event = await getEventByPreviewToken(token);

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

  // Use direct component reference from TEMPLATES
  const Template = TEMPLATES[resolvedTemplateId];

  return (
    <>
      <PreviewBanner />
      <div className="pt-10">
        <Template config={config} assets={assets} eventId={event.id} />
      </div>
    </>
  );
}
