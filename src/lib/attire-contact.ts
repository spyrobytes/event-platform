import type { AttireExtrasVendor } from "@/schemas/event-page";

export type ResolvedAttireContact = {
  /** Visible text on the chip/button (defaults to value when no label set) */
  displayValue: string;
  /** href for the anchor, or null for plain-text rendering (e.g., handles) */
  href: string | null;
  /** Optional rel for external links */
  rel?: string;
  /** Optional target for external links */
  target?: string;
  /** Accessible label describing the action */
  ariaLabel?: string;
};

function stripNonDialChars(value: string): string {
  // Keep leading `+` and digits; drop spaces, parens, dashes.
  return value.replace(/[^\d+]/g, "");
}

function ensureHttpsScheme(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

/**
 * Resolves a vendor's flat contact triple (label / type / value) into the
 * data a renderer needs. Returns null when there's no usable contact (missing
 * value or type).
 */
export function resolveAttireContact(
  vendor: AttireExtrasVendor
): ResolvedAttireContact | null {
  const value = vendor.contactValue?.trim();
  if (!value || !vendor.contactType) return null;

  const label = vendor.contactLabel?.trim() || value;

  switch (vendor.contactType) {
    case "url": {
      const href = ensureHttpsScheme(value);
      return {
        displayValue: label,
        href,
        rel: "noopener noreferrer",
        target: "_blank",
        ariaLabel: `${label} (opens in new tab)`,
      };
    }
    case "phone": {
      const digits = stripNonDialChars(value);
      return {
        displayValue: label,
        href: digits ? `tel:${digits}` : null,
        ariaLabel: `Call ${value}`,
      };
    }
    case "email":
      return {
        displayValue: label,
        href: `mailto:${value}`,
        ariaLabel: `Email ${value}`,
      };
    case "text":
      return { displayValue: label, href: null };
  }
}
