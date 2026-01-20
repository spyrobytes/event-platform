/**
 * Test route for visual regression testing of templates
 * This route renders templates with sample data without requiring database access
 *
 * Only available in development/test environments
 */

import { notFound } from "next/navigation";
import { TEMPLATES } from "@/components/templates";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

// Only allow in development/test
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ templateId: string }>;
};

// Sample config for testing
const SAMPLE_CONFIG: EventPageConfigV1 = {
  schemaVersion: 1,
  theme: {
    preset: "modern",
    primaryColor: "#6366f1",
    fontPair: "modern",
  },
  hero: {
    title: "Sample Event Title",
    subtitle: "A beautiful celebration of togetherness",
    align: "center",
    overlay: "soft",
  },
  sections: [
    {
      type: "details",
      enabled: true,
      data: {
        dateText: "Saturday, December 14, 2024 at 4:00 PM",
        locationText: "Grand Ballroom, The Ritz Hotel, New York City",
      },
    },
    {
      type: "schedule",
      enabled: true,
      data: {
        items: [
          { time: "4:00 PM", title: "Guest Arrival", description: "Welcome drinks and mingling" },
          { time: "5:00 PM", title: "Opening Ceremony", description: "Welcome address and introductions" },
          { time: "6:00 PM", title: "Dinner Service", description: "Three-course gourmet meal" },
          { time: "8:00 PM", title: "Entertainment", description: "Live music and dancing" },
          { time: "10:00 PM", title: "Closing", description: "Final toasts and farewell" },
        ],
      },
    },
    {
      type: "faq",
      enabled: true,
      data: {
        items: [
          { q: "What is the dress code?", a: "Business casual or semi-formal attire is recommended." },
          { q: "Is parking available?", a: "Yes, complimentary valet parking is provided for all guests." },
          { q: "Can I bring a plus one?", a: "Please check your invitation for plus-one details." },
          { q: "Will there be vegetarian options?", a: "Yes, we offer vegetarian, vegan, and gluten-free options. Please let us know your dietary requirements." },
        ],
      },
    },
    {
      type: "gallery",
      enabled: true,
      data: {
        assetIds: [],
      },
    },
  ],
};

// Empty assets for testing (no images)
const SAMPLE_ASSETS: MediaAsset[] = [];

export default async function TemplatePreviewPage({ params }: PageProps) {
  // Block in production
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_TEST_ROUTES) {
    notFound();
  }

  const { templateId } = await params;

  // Verify template exists
  if (!(templateId in TEMPLATES)) {
    notFound();
  }

  const Template = TEMPLATES[templateId];

  return <Template config={SAMPLE_CONFIG} assets={SAMPLE_ASSETS} />;
}
