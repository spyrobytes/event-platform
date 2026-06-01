import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// next/navigation: redirect() and notFound() throw Next-internal sentinels in
// production. We mirror that with recognizable throws so we can assert the call
// site (and the redirect target) without pulling in Next's runtime.
const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const inviteFindUnique = vi.fn();
const configFindUnique = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    invite: { findUnique: inviteFindUnique },
    invitationConfig: { findUnique: configFindUnique },
  },
}));

// Stub the heavy invitation components so we can assert which branch rendered:
// the closed-state view (real, defined in the page module) vs. the RSVP form.
vi.mock("@/components/features/Invitation", () => ({
  InvitationShell: ({ children }: { children: ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
  InvitationRSVPForm: () => <form data-testid="rsvp-form" />,
}));
vi.mock("@/components/features/Analytics", () => ({
  PageViewTracker: () => null,
  MarkOpenedBeacon: () => null,
}));
vi.mock("@/lib/event-page-loader", () => ({
  loadAndMigrateConfig: () => ({ sections: [] }),
}));
vi.mock("@/lib/section-nav-defaults", () => ({
  isWeddingTemplate: () => false,
}));

const { default: InviteRSVPPage } = await import(
  "@/app/invite/[token]/rsvp/page"
);

const future = new Date(Date.now() + 7 * 864e5);
const past = new Date(Date.now() - 1000);

function makeInvite(
  overrides: Record<string, unknown> = {},
  eventOverrides: Record<string, unknown> = {}
) {
  return {
    id: "inv_1",
    name: "Alice",
    email: "a@example.com",
    plusOnesAllowed: 0,
    status: "PENDING",
    expiresAt: null,
    rsvp: null,
    ...overrides,
    event: {
      id: "evt_1",
      title: "Wedding",
      slug: "alice-bob",
      status: "PUBLISHED",
      timezone: "UTC",
      rsvpDeadline: future,
      pageConfig: null,
      templateId: null,
      ...eventOverrides,
    },
  };
}

const call = () =>
  InviteRSVPPage({ params: Promise.resolve({ token: "tok" }) });

beforeEach(() => {
  redirectMock.mockClear();
  notFoundMock.mockClear();
  inviteFindUnique.mockReset();
  configFindUnique.mockReset().mockResolvedValue(null);
});

describe("InviteRSVPPage — terminal states redirect to /invite/[token]", () => {
  it("redirects a REVOKED invite (the gap this PR closes)", async () => {
    inviteFindUnique.mockResolvedValue(makeInvite({ status: "REVOKED" }));
    await expect(call()).rejects.toThrow("NEXT_REDIRECT:/invite/tok");
    expect(redirectMock).toHaveBeenCalledWith("/invite/tok");
    // Never reaches the form.
    expect(screen.queryByTestId("rsvp-form")).toBeNull();
  });

  it("redirects a CANCELLED event", async () => {
    inviteFindUnique.mockResolvedValue(makeInvite({}, { status: "CANCELLED" }));
    await expect(call()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/invite/tok");
  });

  it("redirects an EXPIRED invite", async () => {
    inviteFindUnique.mockResolvedValue(makeInvite({ status: "EXPIRED" }));
    await expect(call()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/invite/tok");
  });

  it("404s an unknown token", async () => {
    inviteFindUnique.mockResolvedValue(null);
    await expect(call()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });
});

describe("InviteRSVPPage — RSVP deadline", () => {
  it("renders the closed view (not the form, no redirect) once the deadline has passed", async () => {
    inviteFindUnique.mockResolvedValue(makeInvite({}, { rsvpDeadline: past }));
    render(await call());
    expect(screen.getByText("RSVP Period Closed")).toBeInTheDocument();
    expect(screen.queryByTestId("rsvp-form")).toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("renders the RSVP form when the deadline is still in the future", async () => {
    inviteFindUnique.mockResolvedValue(makeInvite({}, { rsvpDeadline: future }));
    render(await call());
    expect(screen.getByTestId("rsvp-form")).toBeInTheDocument();
    expect(screen.queryByText("RSVP Period Closed")).toBeNull();
  });
});
