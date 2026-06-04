import { promises as dns } from "node:dns";

/**
 * Best-effort check that an email's domain can actually receive mail, used to
 * reject typo'd / non-existent domains at RSVP time before they bounce and hurt
 * sender reputation.
 *
 * FAIL-OPEN by design: returns `true` on timeout, SERVFAIL, network error, or
 * anything ambiguous — a flaky DNS lookup must never block a real RSVP. Returns
 * `false` ONLY when the domain definitively has neither MX nor A records (per
 * RFC 5321 a domain with an A record but no MX can still receive mail).
 *
 * Server-only (imports `node:dns`); call from the RSVP submit handlers, which
 * run on the Node.js runtime.
 */

const LOOKUP_TIMEOUT_MS = 3000;

function isNoRecordError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  return code === "ENOTFOUND" || code === "ENODATA";
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error("dns-timeout")), ms);
  });
  // Clear the timer once the race settles so we don't leave a dangling 3s
  // timeout (and an unhandled rejection) after the lookup already resolved.
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function domainCanReceiveMail(email: string): Promise<boolean> {
  const at = email.lastIndexOf("@");
  if (at < 1) return true; // syntax is the schema's job; don't reject here
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || domain.includes(" ")) return true;

  // 1. MX records — the normal case for any mail-receiving domain.
  try {
    const mx = await withTimeout(dns.resolveMx(domain), LOOKUP_TIMEOUT_MS);
    if (mx.length > 0) return true;
  } catch (err) {
    // Timeout / SERVFAIL / network → fail-open. Only a definitive
    // "no record" verdict falls through to the A-record fallback below.
    if (!isNoRecordError(err)) return true;
  }

  // 2. No MX (or ENODATA): RFC 5321 implicit-MX fallback to an address record.
  try {
    const a = await withTimeout(dns.resolve4(domain), LOOKUP_TIMEOUT_MS);
    return a.length > 0;
  } catch (err) {
    if (!isNoRecordError(err)) return true; // fail-open on ambiguous errors
    return false; // definitively no MX and no A → can't receive mail
  }
}
