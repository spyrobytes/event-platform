import { describe, it, expect } from "vitest";
import { buildNavItems } from "@/lib/section-nav-defaults";
import type { Section, LivestreamSection, StreamReference } from "@/schemas/event-page";

const validPrimary: StreamReference = {
  provider: "youtube",
  sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  videoId: "dQw4w9WgXcQ",
};

function livestream(overrides: Partial<LivestreamSection> = {}): LivestreamSection {
  return {
    type: "livestream",
    enabled: true,
    nav: { show: true },
    data: { heading: "Live Stream", ctaLabel: "Watch live", showCountdown: true, useNocookie: true },
    ...overrides,
  };
}

describe("buildNavItems — livestream renderable-content gate", () => {
  it("includes an enabled livestream with a primary URL", () => {
    const sections: Section[] = [livestream({ data: { heading: "Live Stream", ctaLabel: "Watch live", showCountdown: true, useNocookie: true, primary: validPrimary } })];
    const { visible } = buildNavItems(sections, "wedding_v1");
    expect(visible.find((n) => n.id === "livestream")).toBeDefined();
  });

  it("hides an enabled livestream when the primary URL is missing", () => {
    // The renderer returns null in preview mode for this case, so the nav
    // link would scroll to a #live anchor that doesn't exist in the DOM.
    const sections: Section[] = [livestream()];
    const { visible, overflow } = buildNavItems(sections, "wedding_v1");
    expect(visible.find((n) => n.id === "livestream")).toBeUndefined();
    expect(overflow.find((n) => n.id === "livestream")).toBeUndefined();
  });

  it("hides livestream when nav.show is explicit true but primary is missing", () => {
    // Even when the organizer has explicitly opted into the nav slot, an
    // empty section must not produce a phantom link.
    const sections: Section[] = [
      livestream({ nav: { show: true }, data: { heading: "Live Stream", ctaLabel: "Watch live", showCountdown: true, useNocookie: true } }),
    ];
    const { visible } = buildNavItems(sections, "wedding_v1");
    expect(visible.find((n) => n.id === "livestream")).toBeUndefined();
  });

  it("still hides livestream when only replay is set (no primary)", () => {
    // Replay-only configurations are reachable on the /e/[slug]/live
    // sub-page (which gates on primary || replay), but the main-page
    // preview returns null without `primary`, so the nav anchor would
    // not exist in the DOM. The asymmetry is intentional — see the
    // comment in `hasRenderableContent`.
    const sections: Section[] = [
      livestream({
        data: {
          heading: "Live Stream",
          ctaLabel: "Watch live",
          showCountdown: true,
          useNocookie: true,
          replay: validPrimary,
        },
      }),
    ];
    const { visible } = buildNavItems(sections, "wedding_v1");
    expect(visible.find((n) => n.id === "livestream")).toBeUndefined();
  });
});
