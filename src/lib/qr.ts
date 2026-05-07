import QRCode from "qrcode";

/**
 * Default QR error-correction level.
 *
 * `M` (~15% recoverable) balances payload density against scan reliability
 * for the URLs we encode (`/invite/pass/<UUID>`, ~70 chars). Bumping to `Q`
 * or `H` is only worth it once we add a logo overlay (deferred — see plan
 * §1 Non-Goals).
 */
const DEFAULT_ERROR_CORRECTION = "M" as const;

const DEFAULT_SIZE_PX = 512;

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL;
  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_BASE_URL is not set — required to build pass URLs for QR codes."
    );
  }
  return raw.replace(/\/+$/, "");
}

/**
 * Build the public pass-view URL for a given invite.
 *
 * The pass view (`/invite/pass/[passId]`) renders a compact, read-only
 * summary of the invite for venue staff. Keyed on `Invite.passId` rather
 * than the raw token so QRs survive token regenerations. See plan §2.5.
 */
export function buildPassUrl(passId: string): string {
  return `${getBaseUrl()}/invite/pass/${passId}`;
}

/** SVG output — for in-browser display where vector scaling matters. */
export async function generateQrSvg(
  url: string,
  size: number = DEFAULT_SIZE_PX
): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: DEFAULT_ERROR_CORRECTION,
    width: size,
    margin: 1,
  });
}

/** PNG buffer — for email attachments (only format reliable across Outlook/Gmail/Apple Mail). */
export async function generateQrPngBuffer(
  url: string,
  size: number = DEFAULT_SIZE_PX
): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: DEFAULT_ERROR_CORRECTION,
    width: size,
    margin: 1,
  });
}

/**
 * `data:image/png;base64,…` URL for inline previews. Not for emails — use
 * {@link generateQrPngBuffer} with CID-inline attachments instead.
 */
export async function generateQrDataUrl(
  url: string,
  size: number = DEFAULT_SIZE_PX
): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: DEFAULT_ERROR_CORRECTION,
    width: size,
    margin: 1,
  });
}

/**
 * Build a stable, filesystem-safe download filename for a guest's QR PNG.
 *
 * Centralised so the dashboard modal, future bulk-export, and any ad-hoc
 * tooling produce the same shape. The 8-char passId prefix disambiguates
 * downloads when multiple guests share a first name.
 */
export function buildQrFilename(
  guestName: string | null,
  passId: string
): string {
  const safe =
    (guestName ?? "invite")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "invite";
  return `rsvp-${safe}-${passId.slice(0, 8)}.png`;
}
