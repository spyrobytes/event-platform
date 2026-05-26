// Shared types for the Livestream feature components. Kept separate so
// the renderer dispatch in createWeddingTemplate.tsx and WeddingTemplateV2
// can reference a stable shape without pulling in client-only code.

import type { LivestreamSectionData } from "@/schemas/event-page";

export type LivestreamRenderMode = "preview" | "full";

export type LivestreamPhase = "before" | "ready" | "ended";

export type LivestreamRendererProps = {
  data: LivestreamSectionData;
  eventSlug: string;
  inviteToken?: string;
  // Whether the viewer is on the main event page ("preview" — render CTA
  // card) or on the dedicated /e/[slug]/live sub-page ("full" — render
  // the actual player).
  mode: LivestreamRenderMode;
  // Event timezone for human-readable date formatting in the CTA copy.
  // Optional — if absent we fall back to viewer local time.
  timezone?: string;
};

/**
 * Pure phase computation. Reused by the server renderer (initial paint)
 * and the client countdown (live transitions). Missing timing fields
 * collapse to "ready" — i.e. an enabled stream with no schedule is
 * treated as always-on, which matches organizer expectation for ad-hoc
 * "we're going live now, paste the URL" cases.
 */
export function getLivestreamPhase(
  data: Pick<LivestreamSectionData, "startAt" | "endAt">,
  nowMs: number
): LivestreamPhase {
  if (data.endAt) {
    const endMs = Date.parse(data.endAt);
    if (!Number.isNaN(endMs) && nowMs >= endMs) return "ended";
  }
  if (data.startAt) {
    const startMs = Date.parse(data.startAt);
    if (!Number.isNaN(startMs) && nowMs < startMs) return "before";
  }
  return "ready";
}

// Deep-links to the #live anchor on the sub-page so the viewer lands at the
// player section, not the hero. The sub-page reuses the full template chrome
// (hero, nav, footer), so without the fragment users have to scroll past the
// hero to find the stream.
export function buildLiveSubpageHref(eventSlug: string, inviteToken?: string): string {
  const base = inviteToken
    ? `/e/${eventSlug}/live?tk=${encodeURIComponent(inviteToken)}`
    : `/e/${eventSlug}/live`;
  return `${base}#live`;
}
