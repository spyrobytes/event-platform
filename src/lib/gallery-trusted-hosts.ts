/**
 * Hostname → provider-name map for external-link galleries.
 *
 * When an organizer pastes an external album URL and the hostname matches
 * one of these entries, the public landing card renders a small "Hosted on
 * <provider>" badge next to the CTA. Non-matching hostnames just show no
 * badge — we accept any `https://` URL (decision §8.1).
 *
 * Adding a provider: add its bare hostname AND any common variants users
 * might paste (mobile shorteners, alt subdomains). Match is case-insensitive
 * and exact (not suffix), so `pixieset.com` won't match `notpixieset.com`.
 */
const TRUSTED_HOSTS: Record<string, string> = {
  "pixieset.com": "Pixieset",
  "www.pixieset.com": "Pixieset",
  "smugmug.com": "SmugMug",
  "www.smugmug.com": "SmugMug",
  "drive.google.com": "Google Drive",
  "photos.google.com": "Google Photos",
  "dropbox.com": "Dropbox",
  "www.dropbox.com": "Dropbox",
  "onedrive.live.com": "OneDrive",
  "1drv.ms": "OneDrive",
  "icloud.com": "iCloud",
  "www.icloud.com": "iCloud",
  "share.icloud.com": "iCloud",
  "flickr.com": "Flickr",
  "www.flickr.com": "Flickr",
  "shootproof.com": "ShootProof",
  "www.shootproof.com": "ShootProof",
};

/**
 * Returns the friendly provider name for a URL's hostname, or null if the
 * host isn't recognized. Returns null for malformed URLs rather than
 * throwing — callers should treat "no badge" as the safe default.
 */
export function getTrustedHostName(url: string): string | null {
  try {
    const parsed = new URL(url);
    return TRUSTED_HOSTS[parsed.hostname.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}
