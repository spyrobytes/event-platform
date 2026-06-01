import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

beforeAll(() => {
  process.env.NEXT_PUBLIC_BASE_URL = "https://eventfxr.test";
});

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const inviteFindUnique = vi.fn();
const configFindUnique = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    invite: { findUnique: inviteFindUnique },
    invitationConfig: { findUnique: configFindUnique },
  },
}));

// Stub the invitation template components — we only care about the page's
// deadline/responded banners, not template internals.
vi.mock("@/components/features/Invitation", () => {
  const Stub = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    InvitationShell: Stub,
    InvitationCard: Stub,
    EnvelopeReveal: Stub,
    EnvelopeRevealV2: Stub,
    SplitRevealCard: Stub,
    SplitRevealCardV2: Stub,
    LayeredUnfold: Stub,
    CinematicScroll: Stub,
    TimeBasedReveal: Stub,
    TimeBasedRevealV2: Stub,
    GoldenCardReveal: Stub,
    FlipFlapReveal: Stub,
    WeddingStorybook: Stub,
    templateMetadata: { ENVELOPE_REVEAL: { type: "wrapper" } },
  };
});
vi.mock("@/components/features/Analytics", () => ({
  PageViewTracker: () => null,
  MarkOpenedBeacon: () => null,
}));

const { default: InvitationPage } = await import("@/app/invite/[token]/page");

const future = new Date(Date.now() + 7 * 864e5);
const past = new Date(Date.now() - 1000);

function makeInvite(
  overrides: Record<string, unknown> = {},
  eventOverrides: Record<string, unknown> = {}
) {
  return {
    id: "inv_1",
    eventId: "evt_1",
    name: "Alice",
    email: "a@example.com",
    status: "PENDING",
    expiresAt: null,
    rsvp: null,
    ...overrides,
    event: {
      id: "evt_1",
      title: "Wedding",
      slug: "alice-bob",
      description: null,
      startAt: future,
      endAt: null,
      timezone: "UTC",
      venueName: "Hall",
      address: null,
      city: "NYC",
      country: null,
      coverImageUrl: null,
      status: "PUBLISHED",
      maxAttendees: null,
      rsvpDeadline: future,
      ...eventOverrides,
    },
  };
}

const renderPage = async () =>
  render(await InvitationPage({ params: Promise.resolve({ token: "tok" }) }));

beforeEach(() => {
  inviteFindUnique.mockReset();
  configFindUnique.mockReset().mockResolvedValue(null);
});

describe("InvitationPage — RSVP-closed banner", () => {
  it("shows the closed banner when the deadline has passed and the guest hasn't responded", async () => {
    inviteFindUnique.mockResolvedValue(makeInvite({}, { rsvpDeadline: past }));
    await renderPage();
    expect(screen.getByText("RSVP for this event has closed.")).toBeInTheDocument();
  });

  it("does not show the closed banner before the deadline", async () => {
    inviteFindUnique.mockResolvedValue(makeInvite({}, { rsvpDeadline: future }));
    await renderPage();
    expect(screen.queryByText("RSVP for this event has closed.")).toBeNull();
  });

  it("does not show the closed banner when there is no deadline set", async () => {
    inviteFindUnique.mockResolvedValue(makeInvite({}, { rsvpDeadline: null }));
    await renderPage();
    expect(screen.queryByText("RSVP for this event has closed.")).toBeNull();
  });

  it("prefers the responded banner over the closed banner (responded + past deadline)", async () => {
    inviteFindUnique.mockResolvedValue(
      makeInvite(
        { rsvp: { id: "r1", response: "YES", guestName: "Alice", guestCount: 1, respondedAt: future } },
        { rsvpDeadline: past }
      )
    );
    await renderPage();
    expect(screen.getByText(/You responded:/)).toBeInTheDocument();
    expect(screen.queryByText("RSVP for this event has closed.")).toBeNull();
  });
});
