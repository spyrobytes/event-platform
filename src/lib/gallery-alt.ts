/**
 * Derive a usable alt text from an imported photo's original filename.
 *
 * The gallery worker fills `EventGalleryItem.alt` from this when the field is
 * blank (the schema has promised that since the model landed). Only genuinely
 * descriptive names make it through: camera-generated names (IMG_1234,
 * DSC0042, PXL_2024…), bare timestamps, and messenger export names are junk
 * for a screen reader — worse than empty alt, which at least lets AT skip the
 * image — so they map to "".
 */

const EXTENSION_RE = /\.[a-z0-9]{2,5}$/i;

/** Messenger/export prefixes — the whole name is machine-generated. */
const EXPORT_PREFIX_RE = /^(?:whatsapp|received|signal|telegram)\b/i;

/** Camera / device auto-names: known prefix + nothing but digits, separators,
 *  and the connective "at" (screenshot timestamps). No \b after the prefix —
 *  there is no word boundary between "DSC" and "0042". */
const AUTO_NAME_RE =
  /^(?:img|image|dscn?f?|pxl|pic|photo|snapshot|screenshot|scan|mvimg|burst)(?:at|[\s\d()@.:-])*$/i;

/** Nothing but digits, separators, and timestamp punctuation. */
const DIGITS_ONLY_RE = /^[\s\d()@.:-]*$/;

/** Long hex/base62 blob (content hashes, UUID fragments). */
const OPAQUE_ID_RE = /^[a-f0-9-]{16,}$/i;

const MAX_ALT_LENGTH = 140;

export function deriveAltFromFilename(
  originalName: string | null | undefined,
): string {
  if (!originalName) return "";

  const cleaned = originalName
    .replace(EXTENSION_RE, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";
  if (DIGITS_ONLY_RE.test(cleaned)) return "";
  if (EXPORT_PREFIX_RE.test(cleaned)) return "";
  if (AUTO_NAME_RE.test(cleaned)) return "";
  if (OPAQUE_ID_RE.test(cleaned.replace(/\s/g, ""))) return "";

  return cleaned.slice(0, MAX_ALT_LENGTH);
}
