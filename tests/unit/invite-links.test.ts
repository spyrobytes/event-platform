import { describe, it, expect } from "vitest";
import { buildInviteUrl } from "@/lib/invite-links";

describe("buildInviteUrl", () => {
  it("builds the canonical /invite/[token] URL", () => {
    expect(buildInviteUrl("https://eventfxr.test", "tok123")).toBe(
      "https://eventfxr.test/invite/tok123"
    );
  });

  it("does not point at the bare /rsvp form (regression guard for the share-link split)", () => {
    // #3: the table share buttons and the planning panel must agree on the
    // canonical surface. /rsvp lacks the deadline UX the invite path carries.
    expect(buildInviteUrl("https://x.test", "t")).not.toContain("/rsvp/");
  });
});
