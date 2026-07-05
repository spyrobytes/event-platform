/**
 * Slug registry for the public /sample-templates/* demo pages.
 *
 * Deliberately a leaf module with zero template imports: `demo-data.ts`
 * (which pulls in the whole template component tree) types its entries
 * against this list, while lightweight consumers — sitemap.ts, the landing
 * TemplateShowcase plates — import only these strings. Renaming or adding a
 * demo here type-errors every consumer instead of silently drifting.
 */
export const DEMO_TEMPLATE_SLUGS = [
  "cinematic",
  "grand-luxe",
  "celebration",
] as const;

export type DemoTemplateSlug = (typeof DEMO_TEMPLATE_SLUGS)[number];

export function demoTemplatePath(slug: DemoTemplateSlug): string {
  return `/sample-templates/${slug}`;
}
