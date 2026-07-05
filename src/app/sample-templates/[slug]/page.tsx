import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TEMPLATES } from "@/components/templates";
import { DEMO_EVENT_SLUG } from "@/lib/demo-event";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import { getTemplateDemo, TEMPLATE_DEMOS } from "../demo-data";
import { DemoBar } from "../DemoBar";

/**
 * Public, indexable demo pages for the landing-page template showcase.
 *
 * Renders a real template component with curated sample data — the same code
 * path as /e/[slug], no database. Linked from the TemplateShowcase plates.
 *
 * URL state:
 *  - `?theme=<id>` — section color theme (validated against the demo's own
 *    theme list; unknown values fall back to the template default).
 *  - `?edition=scrapbook` — Wedding Cinematic's Scrapbook Edition.
 */

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ theme?: string; edition?: string }>;
};

export function generateStaticParams() {
  return TEMPLATE_DEMOS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const demo = getTemplateDemo(slug);
  if (!demo) return {};

  const title = `${demo.name} — Live Template Demo`;
  return {
    title,
    description: demo.tagline,
    alternates: { canonical: `/sample-templates/${demo.slug}` },
    openGraph: {
      title,
      description: demo.tagline,
      images: [demo.ogImage],
    },
  };
}

export default async function SampleTemplatePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { theme, edition } = await searchParams;

  const demo = getTemplateDemo(slug);
  if (!demo) notFound();

  const Template = TEMPLATES[demo.templateId];

  // Validate ?theme= against the demo's own list; anything else is default.
  const activeThemeId =
    (theme && demo.themes.find((t) => t.id === theme)?.id) || null;

  let config: EventPageConfigV1 = demo.config;
  if (activeThemeId) {
    config = {
      ...config,
      theme: { ...config.theme, sectionThemeId: activeThemeId },
    };
  }

  // Hue-matched hero backdrop per theme (Grand Luxe pairs its dark florals
  // with each section theme's palette).
  const heroAssetId = demo.themeHeroAssetIds?.[activeThemeId ?? ""];
  if (heroAssetId) {
    config = {
      ...config,
      hero: { ...config.hero, heroImageAssetId: heroAssetId },
    };
  }

  // Wedding Cinematic's structural Scrapbook Edition (?edition=scrapbook).
  const isScrapbook = demo.templateId === "wedding_v2" && edition === "scrapbook";
  if (isScrapbook) {
    config = {
      ...config,
      theme: { ...config.theme, displayStyle: "scrapbook" },
    };
  }

  return (
    <>
      <Template
        config={config}
        assets={demo.assets}
        eventId="demo"
        eventSlug={DEMO_EVENT_SLUG}
        temporal={demo.temporal}
      />
      <DemoBar
        slug={demo.slug}
        themes={demo.themes}
        activeThemeId={activeThemeId}
        preservedParams={isScrapbook ? { edition: "scrapbook" } : undefined}
      />
    </>
  );
}
