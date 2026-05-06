import { permanentRedirect } from "next/navigation";

/**
 * Legacy public event URL. The canonical public event surface is now
 * `/e/[slug]`, which renders the organizer-configured template and
 * supports the guest portal via `?tk=`. This route exists only to 308
 * any traffic that still hits the old URL — search-engine cached
 * results, externally posted links, etc. — so authority migrates
 * cleanly.
 *
 * The redirect is unconditional: visibility/published gating happens
 * downstream at `/e/[slug]` (`getEventBySlug` in event-page-loader.ts),
 * so a missing/private/cancelled event correctly resolves to a 404
 * one hop later.
 */
type PageParams = Promise<{ slug: string }>;

export default async function LegacyEventDetailRedirect({
  params,
}: {
  params: PageParams;
}) {
  const { slug } = await params;
  permanentRedirect(`/e/${slug}`);
}
