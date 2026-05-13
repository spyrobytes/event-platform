import { describe, it, expect } from "vitest";
import { resolveAttireContact } from "@/lib/attire-contact";
import type { AttireExtrasVendor } from "@/schemas/event-page";

function vendor(overrides: Partial<AttireExtrasVendor>): AttireExtrasVendor {
  return { name: "Test Vendor", ...overrides };
}

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
      expect(r?.href).toBe("http://example.com");
    });

    it("preserves an https:// scheme (case-insensitive match)", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "url", contactValue: "HTTPS://Example.com" })
      );
      expect(r?.href).toBe("HTTPS://Example.com");
    });

    it("prepends https:// when scheme is missing", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "url", contactValue: "example.com" })
      );
      expect(r?.href).toBe("https://example.com");
    });

    it("strips leading slashes before prepending scheme", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "url", contactValue: "//example.com" })
      );
      expect(r?.href).toBe("https://example.com");
    });

    it("sets target=_blank and rel=noopener noreferrer", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "url", contactValue: "example.com" })
      );
      expect(r?.target).toBe("_blank");
      expect(r?.rel).toBe("noopener noreferrer");
    });

    it("ariaLabel announces opens-in-new-tab", () => {
      const r = resolveAttireContact(
        vendor({
          contactType: "url",
          contactValue: "example.com",
          contactLabel: "Visit",
        })
      );
      expect(r?.ariaLabel).toBe("Visit (opens in new tab)");
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
      expect(r?.href).toBe("tel:+15551234567");
      expect(r?.displayValue).toBe("+1 (555) 123-4567");
    });

    it("returns null href when no dialable digits remain", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "phone", contactValue: "(none)" })
      );
      expect(r?.href).toBeNull();
      expect(r?.displayValue).toBe("(none)");
    });

    it("ariaLabel announces the call action", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "phone", contactValue: "555-1234" })
      );
      expect(r?.ariaLabel).toBe("Call 555-1234");
    });
  });

  describe("type=email", () => {
    it("produces a mailto: href", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "email", contactValue: "hello@example.com" })
      );
      expect(r?.href).toBe("mailto:hello@example.com");
    });

    it("ariaLabel announces the email action", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "email", contactValue: "hello@example.com" })
      );
      expect(r?.ariaLabel).toBe("Email hello@example.com");
    });
  });

  describe("type=text (Display only)", () => {
    it("returns a null href so the renderer emits non-interactive text", () => {
      const r = resolveAttireContact(
        vendor({ contactType: "text", contactValue: "@tailorshop" })
      );
      expect(r?.href).toBeNull();
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
