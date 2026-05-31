import type { AttireExtrasVendor } from "@/schemas/event-page";
import { stripNonDialChars } from "@/lib/phone";

/** Default heading shown on the extras card when the user hasn't set one. */
export const DEFAULT_VENDOR_CARD_TITLE = "Where to Shop";

export type ResolvedAttireContact = {
  /** Visible text on the chip/button (defaults to value when no label set) */
  displayValue: string;
  /**
   * Props to spread onto an `<a>` element. Null when the contact should
   * render as plain text (e.g., social handle, "display only" type, or a
   * phone value with no dialable digits).
   */
  anchorProps:
    | {
        href: string;
        target?: string;
        rel?: string;
        "aria-label"?: string;
      }
    | null;
};

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
    case "url":
      return {
        displayValue: label,
        anchorProps: {
          href: ensureHttpsScheme(value),
          target: "_blank",
          rel: "noopener noreferrer",
          "aria-label": `${label} (opens in new tab)`,
        },
      };
    case "phone": {
      const digits = stripNonDialChars(value);
      return {
        displayValue: label,
        anchorProps: digits
          ? { href: `tel:${digits}`, "aria-label": `Call ${value}` }
          : null,
      };
    }
    case "email":
      return {
        displayValue: label,
        anchorProps: {
          href: `mailto:${value}`,
          "aria-label": `Email ${value}`,
        },
      };
    case "text":
      return { displayValue: label, anchorProps: null };
  }
}
