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

  it("is independent of the rsvpUrl format (regression: the old /rsvp/ split would break here)", () => {
    // If a future change makes the invite link /invite/<token>, the old
    // `rsvpUrl.split("/rsvp/").pop()` returned the whole URL as the token.
    // Reading unsubscribeUrl directly is unaffected.
    expect(
      getUnsubscribeUrlFromPayload({
        rsvpUrl: "https://eventfxr.com/invite/abc",
        unsubscribeUrl: "https://eventfxr.com/unsubscribe/abc",
      })
    ).toBe("https://eventfxr.com/unsubscribe/abc");
  });

  it("returns undefined when unsubscribeUrl is absent", () => {
    expect(
      getUnsubscribeUrlFromPayload({ rsvpUrl: "https://eventfxr.com/rsvp/abc" })
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
