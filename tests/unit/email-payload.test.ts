import { describe, it, expect } from "vitest";
import { getUnsubscribeUrlFromPayload } from "@/lib/email-payload";

describe("getUnsubscribeUrlFromPayload", () => {
  it("returns the unsubscribe URL stored in the payload", () => {
    expect(
      getUnsubscribeUrlFromPayload({
        rsvpUrl: "https://eventfxr.com/rsvp/abc",
        unsubscribeUrl: "https://eventfxr.com/unsubscribe/abc",
      })
    ).toBe("https://eventfxr.com/unsubscribe/abc");
  });

  it("prefers the stored unsubscribeUrl even when rsvpUrl is a /invite/ link (the fragile fallback is never reached)", () => {
    // A future /invite/<token> rsvpUrl only ever appears in payloads that also
    // carry unsubscribeUrl, so the stored value wins and the /rsvp/ fallback
    // below is never exercised by a link-format change.
    expect(
      getUnsubscribeUrlFromPayload({
        rsvpUrl: "https://eventfxr.com/invite/abc",
        unsubscribeUrl: "https://eventfxr.com/unsubscribe/abc",
      })
    ).toBe("https://eventfxr.com/unsubscribe/abc");
  });

  it("falls back to deriving from rsvpUrl for legacy payloads with no unsubscribeUrl", () => {
    // Invite emails queued before unsubscribeUrl was stored (2026-01-12 →
    // 2026-04-08) carry only an old-format /rsvp/<token> URL. Map /rsvp/ to
    // /unsubscribe/, reusing the same host + token — equivalent to the old
    // cron derivation, so those reminders keep a working unsubscribe link.
    expect(
      getUnsubscribeUrlFromPayload({ rsvpUrl: "https://eventfxr.com/rsvp/abc" })
    ).toBe("https://eventfxr.com/unsubscribe/abc");
  });

  it("returns undefined when neither unsubscribeUrl nor a /rsvp/ rsvpUrl is present", () => {
    expect(getUnsubscribeUrlFromPayload({})).toBeUndefined();
    // A /invite/ rsvpUrl with no unsubscribeUrl can't occur in real data, but
    // the fallback is deliberately /rsvp/-specific, so it does not match here.
    expect(
      getUnsubscribeUrlFromPayload({ rsvpUrl: "https://eventfxr.com/invite/abc" })
    ).toBeUndefined();
  });

  it("returns undefined for an empty-string unsubscribeUrl", () => {
    expect(getUnsubscribeUrlFromPayload({ unsubscribeUrl: "" })).toBeUndefined();
  });

  it("returns undefined for a non-string unsubscribeUrl", () => {
    expect(
      getUnsubscribeUrlFromPayload({ unsubscribeUrl: 123 })
    ).toBeUndefined();
  });

  it("returns undefined for null / non-object payloads", () => {
    expect(getUnsubscribeUrlFromPayload(null)).toBeUndefined();
    expect(getUnsubscribeUrlFromPayload(undefined)).toBeUndefined();
    expect(getUnsubscribeUrlFromPayload("not-an-object")).toBeUndefined();
  });
});
