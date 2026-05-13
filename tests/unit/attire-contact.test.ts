import { describe, it, expect } from "vitest";
import {
  DEFAULT_VENDOR_CARD_TITLE,
  resolveAttireContact,
} from "@/lib/attire-contact";
import type { AttireExtrasVendor } from "@/schemas/event-page";

function vendor(overrides: Partial<AttireExtrasVendor>): AttireExtrasVendor {
  return { name: "Test Vendor", ...overrides };
}

describe("DEFAULT_VENDOR_CARD_TITLE", () => {
  it("is the user-visible fallback title", () => {
    expect(DEFAULT_VENDOR_CARD_TITLE).toBe("Where to Shop");
  });
});

describe("resolveAttireContact", () => {
  describe("returns null when contact is unusable", () => {
    it("missing contactValue", () => {
      expect(
        resolveAttireContact(vendor({ contactType: "url" }))
      ).toBeNull();
    });

    it("empty / whitespace-only contactValue", () => {
      expect(
        resolveAttireContact(
          vendor({ contactType: "url", contactValue: "   " })
        )
      ).toBeNull();
    });

    it("missing contactType (even if value is set)", () => {
      expect(
        resolveAttireContact(vendor({ contactValue: "https://example.com" }))
      ).toBeNull();
    });
  });

  describe("type=url", () => {
    it("preserves an http:// scheme", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "url", contactValue: "http://example.com" })
      );
      expect(r?.anchorProps?.href).toBe("http://example.com");
    });

    it("preserves an https:// scheme (case-insensitive match)", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "url", contactValue: "HTTPS://Example.com" })
      );
      expect(r?.anchorProps?.href).toBe("HTTPS://Example.com");
    });

    it("prepends https:// when scheme is missing", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "url", contactValue: "example.com" })
      );
      expect(r?.anchorProps?.href).toBe("https://example.com");
    });

    it("strips leading slashes before prepending scheme", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "url", contactValue: "//example.com" })
      );
      expect(r?.anchorProps?.href).toBe("https://example.com");
    });

    it("sets target=_blank and rel=noopener noreferrer", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "url", contactValue: "example.com" })
      );
      expect(r?.anchorProps?.target).toBe("_blank");
      expect(r?.anchorProps?.rel).toBe("noopener noreferrer");
    });

    it("aria-label announces opens-in-new-tab", () => {
      const r = resolveAttireContact(
        vendor({
          contactType: "url",
          contactValue: "example.com",
          contactLabel: "Visit",
        })
      );
      expect(r?.anchorProps?.["aria-label"]).toBe("Visit (opens in new tab)");
    });

    it("displayValue uses label when present, else value", () => {
      const labeled = resolveAttireContact(
        vendor({
          contactType: "url",
          contactValue: "example.com",
          contactLabel: "Visit",
        })
      );
      expect(labeled?.displayValue).toBe("Visit");

      const unlabeled = resolveAttireContact(
        vendor({ contactType: "url", contactValue: "example.com" })
      );
      expect(unlabeled?.displayValue).toBe("example.com");
    });

    it("treats a label of only whitespace as absent", () => {
      const r = resolveAttireContact(
        vendor({
          contactType: "url",
          contactValue: "example.com",
          contactLabel: "   ",
        })
      );
      expect(r?.displayValue).toBe("example.com");
    });
  });

  describe("type=phone", () => {
    it("strips formatting for tel: but preserves original in display", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "phone", contactValue: "+1 (555) 123-4567" })
      );
      expect(r?.anchorProps?.href).toBe("tel:+15551234567");
      expect(r?.displayValue).toBe("+1 (555) 123-4567");
    });

    it("returns null anchorProps when no dialable digits remain", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "phone", contactValue: "(none)" })
      );
      expect(r?.anchorProps).toBeNull();
      expect(r?.displayValue).toBe("(none)");
    });

    it("aria-label announces the call action", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "phone", contactValue: "555-1234" })
      );
      expect(r?.anchorProps?.["aria-label"]).toBe("Call 555-1234");
    });
  });

  describe("type=email", () => {
    it("produces a mailto: href", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "email", contactValue: "hello@example.com" })
      );
      expect(r?.anchorProps?.href).toBe("mailto:hello@example.com");
    });

    it("aria-label announces the email action", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "email", contactValue: "hello@example.com" })
      );
      expect(r?.anchorProps?.["aria-label"]).toBe(
        "Email hello@example.com"
      );
    });
  });

  describe("type=text (Display only)", () => {
    it("returns null anchorProps so the renderer emits non-interactive text", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "text", contactValue: "@tailorshop" })
      );
      expect(r?.anchorProps).toBeNull();
      expect(r?.displayValue).toBe("@tailorshop");
    });

    it("respects a custom label", () => {
      const r = resolveAttireContact(
        vendor({
          contactType: "text",
          contactValue: "Account #12345",
          contactLabel: "Front desk",
        })
      );
      expect(r?.displayValue).toBe("Front desk");
    });
  });
});
