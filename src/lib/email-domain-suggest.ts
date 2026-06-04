/**
 * Dependency-free "did you mean?" suggestion for common email-domain typos
 * (gmial.com → gmail.com, hotmial.com → hotmail.com, yaho.com → yahoo.com,
 * gmail.con → gmail.com). Pure and client-safe.
 *
 * This is a non-blocking UX hint only — it never rejects anything. The
 * server-side MX check (`domainCanReceiveMail`) is the authority on whether a
 * domain can actually receive mail.
 */

// Domains common among personal guests, incl. a few .ca variants (eventfxr.ca)
// and a handful of legitimate-but-less-common providers so real addresses there
// aren't flagged. Kept deliberately short — a longer list raises the chance of a
// false suggestion for someone's genuine domain.
const POPULAR_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.ca",
  "ymail.com",
  "hotmail.com",
  "hotmail.ca",
  "outlook.com",
  "live.com",
  "live.ca",
  "msn.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "mail.com",
  "email.com",
  "gmx.com",
  "fastmail.com",
  "zoho.com",
] as const;

/**
 * Optimal string alignment (Damerau-Levenshtein with adjacent transpositions),
 * so the single most common typo — a swap like `gmial`→`gmail` — is distance 1.
 */
function editDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const d: number[][] = Array.from({ length: al + 1 }, () =>
    new Array<number>(bl + 1).fill(0),
  );
  for (let i = 0; i <= al; i++) d[i][0] = i;
  for (let j = 0; j <= bl; j++) d[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost, // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return d[al][bl];
}

/**
 * Returns the corrected full email if the domain looks like a close typo of a
 * known provider, else null (empty/incomplete address, already-known domain, or
 * nothing close enough to suggest).
 */
export function suggestEmailCorrection(email: string): string | null {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  // Need a local part and a domain part.
  if (at < 1 || at === trimmed.length - 1) return null;

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  if (domain.includes(" ") || !domain.includes(".")) return null;

  const known = POPULAR_DOMAINS as readonly string[];
  if (known.includes(domain)) return null; // already valid — nothing to suggest

  let best: string | null = null;
  let bestDistance = Infinity;
  for (const candidate of POPULAR_DOMAINS) {
    const dist = editDistance(domain, candidate);
    if (dist < bestDistance) {
      bestDistance = dist;
      best = candidate;
    }
  }

  // Only a CLOSE miss (1–2 edits) on a domain long enough to be a real typo —
  // guards against suggesting a popular domain for someone's short custom one.
  if (best && bestDistance >= 1 && bestDistance <= 2 && domain.length >= 4) {
    return `${local}@${best}`;
  }
  return null;
}

export { POPULAR_DOMAINS };
