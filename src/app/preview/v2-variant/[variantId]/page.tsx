import { notFound } from "next/navigation";
import { WeddingTemplateV2 } from "@/components/templates/wedding-v2/WeddingTemplateV2";
import { V2_VARIANT_IDS } from "@/components/templates/wedding-v2/variants";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

/**
 * Preview route for V2 design variants.
 * Renders the wedding template with sample content and the selected variant.
 * Used by the Playwright screenshot script — not linked in the UI.
 */

type Params = { variantId: string };

export function generateStaticParams() {
  return V2_VARIANT_IDS.map((id) => ({ variantId: id }));
}

const SAMPLE_CONFIG: Omit<EventPageConfigV1, "variantId"> = {
  schemaVersion: 1 as const,
  theme: {
    preset: "classic",
    primaryColor: "#7a8c72",
    fontPair: "serif_sans",
  },
  hero: {
    title: "Alexandra & Benjamin",
    subtitle: "Saturday, June 14th, 2025",
    align: "center",
    overlay: "soft",
    style: "cinematic",
    showCountdown: true,
    showScheduleCards: true,
    coupleNames: "Alexandra & Benjamin",
    monogram: "A&B",
  },
  sections: [
    {
      type: "story",
      enabled: true,
      data: {
        heading: "Our Story",
        content: "From a chance encounter at a bookshop in Paris to building a life together across two continents, our journey has been nothing short of extraordinary. We found in each other a partner, a best friend, and a home.",
        layout: "timeline",
        milestones: [
          { year: "2019", title: "First Meeting", description: "A rainy afternoon at Shakespeare and Company bookshop" },
          { year: "2020", title: "First Adventure", description: "A spontaneous road trip through the French countryside" },
          { year: "2022", title: "Moving In", description: "Our first apartment with a tiny balcony and big dreams" },
          { year: "2024", title: "The Proposal", description: "Under the old oak tree where we had our first picnic" },
        ],
      },
    },
    {
      type: "details",
      enabled: true,
      data: {
        dateText: "June 14th, 2025",
        locationText: "The Grand Estate, Napa Valley, California",
        venueDescription: "A stunning hilltop venue surrounded by vineyards and oak groves",
        events: [
          { name: "Wedding Ceremony", date: "2:00 PM", location: "The Garden Terrace" },
          { name: "Cocktail Hour", date: "3:30 PM", location: "The Vineyard Patio" },
          { name: "Reception & Dinner", date: "5:00 PM", location: "The Grand Ballroom" },
        ],
      },
    },
    {
      type: "schedule",
      enabled: true,
      data: {
        heading: "Wedding Weekend",
        items: [],
        groups: [
          {
            label: "Friday",
            date: "June 13",
            items: [
              { time: "6:00 PM", title: "Welcome Dinner", description: "Casual gathering at the vineyard" },
            ],
          },
          {
            label: "Saturday",
            date: "June 14",
            items: [
              { time: "2:00 PM", title: "Ceremony", description: "Garden terrace" },
              { time: "3:30 PM", title: "Cocktails", description: "Vineyard patio" },
              { time: "5:00 PM", title: "Reception", description: "Grand ballroom" },
            ],
          },
        ],
      },
    },
    {
      type: "gallery",
      enabled: true,
      data: {
        heading: "Our Moments",
        displayMode: "masonry",
        showCaptions: true,
      },
    },
    {
      type: "faq",
      enabled: true,
      data: {
        heading: "Questions & Answers",
        items: [
          { q: "What should I wear?", a: "We encourage formal attire. Think elegant and comfortable for an evening of celebration." },
          { q: "Can I bring a plus one?", a: "Please refer to your invitation for details regarding additional guests." },
          { q: "Is there parking available?", a: "Yes, complimentary valet parking will be available at the venue entrance." },
        ],
      },
    },
  ],
  chrome: {
    topbar: true,
    scrollProgress: true,
    mountainDividers: true,
    footerSkyline: true,
    botanicals: true,
  },
};

export default async function V2VariantPreviewPage({ params }: { params: Promise<Params> }) {
  const { variantId } = await params;

  if (!V2_VARIANT_IDS.includes(variantId as typeof V2_VARIANT_IDS[number])) {
    notFound();
  }

  const config: EventPageConfigV1 = {
    ...SAMPLE_CONFIG,
    variantId,
  };

  // Empty assets array — preview uses no uploaded images
  const assets: MediaAsset[] = [];

  return (
    <main>
      <WeddingTemplateV2 config={config} assets={assets} />
    </main>
  );
}
