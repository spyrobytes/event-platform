// Filename starts with `_` so Next.js's App Router doesn't treat this as a route segment.

export type RsvpResponse = "YES" | "NO" | "MAYBE";

export type AccessState =
  | { kind: "ok" }
  | { kind: "revoked" }
  | { kind: "cancelled" }
  | { kind: "expired" }
  | { kind: "ended" };

export type AccessStateInput = {
  revokedAt: Date | null;
  expiresAt: Date | null;
  event: { status: string; endAt: Date | null };
};

/**
 * Priority ladder — top wins: revoked → cancelled → expired → ended.
 * `event.endAt === null` deliberately never produces an `"ended"` state
 * (a null end time means no reliable signal; don't guess from `startAt`).
 */
export function detectAccessState(
  invite: AccessStateInput,
  now: number = Date.now()
): AccessState {
  if (invite.revokedAt) return { kind: "revoked" };
  if (invite.event.status === "CANCELLED") return { kind: "cancelled" };
  if (invite.expiresAt && invite.expiresAt.getTime() < now) {
    return { kind: "expired" };
  }
  if (invite.event.endAt && invite.event.endAt.getTime() < now) {
    return { kind: "ended" };
  }
  return { kind: "ok" };
}

// Fallback chain: rsvp.guestName → invite.name → email local-part → "Guest".
export function resolveGuestName(invite: {
  name: string | null;
  email: string | null;
  rsvp: { guestName: string | null } | null;
}): string {
  if (invite.rsvp?.guestName) return invite.rsvp.guestName;
  if (invite.name) return invite.name;
  if (invite.email) return invite.email.split("@")[0];
  return "Guest";
}

// rsvp.guestCount is authoritative once recorded; pre-RSVP, fall back to
// the plusOnesAllowed cap so door staff know the upper bound.
export function resolvePartyLabel(invite: {
  plusOnesAllowed: number;
  rsvp: { guestCount: number } | null;
}): string | null {
  if (invite.rsvp && invite.rsvp.guestCount > 1) {
    return `Party of ${invite.rsvp.guestCount}`;
  }
  if (!invite.rsvp && invite.plusOnesAllowed > 0) {
    return `Up to ${1 + invite.plusOnesAllowed} guests`;
  }
  return null;
}

// Names of the additional guests the primary guest is bringing. The primary
// guest is already shown as the Pass card's H1, so this is just the +1s.
// Empty/missing names are filtered so a partially-filled RSVP doesn't render
// stray empty entries.
export function resolvePartyMembers(invite: {
  rsvp: { additionalGuestNames: string[] } | null;
}): string[] {
  return (invite.rsvp?.additionalGuestNames ?? [])
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
}

export type PassMoment = {
  // "Reception" when sourced from the wedding reception fields; null when the
  // moment is the Event row's own startAt (in which case the event title alone
  // is the label).
  label: string | null;
  startAt: Date;
  venue: string | null;
  address: string | null;
};

// Pass admits to the reception when one is configured; otherwise to the
// event's primary moment. Mirrors the rule already applied by the invite-email
// pipeline (`src/app/api/events/[id]/invites/route.ts:99-131`). The full
// multi-gated-event design is deferred — see
// `internal-docs/access-pass-gated-events-plan.md`.
export function resolvePassMoment(invite: {
  event: {
    startAt: Date;
    venueName: string | null;
    address: string | null;
    invitationConfig: {
      receptionStartAt: Date | null;
      receptionVenue: string | null;
      receptionAddress: string | null;
    } | null;
  };
}): PassMoment {
  const config = invite.event.invitationConfig;
  if (config?.receptionStartAt) {
    return {
      // TODO(i18n): hardcoded English. When non-English locales ship, key off
      // `Event.locale` (already on the schema) — likely via a small lookup
      // table here, or move the label out and translate at the call site.
      label: "Reception",
      startAt: config.receptionStartAt,
      venue: config.receptionVenue,
      address: config.receptionAddress,
    };
  }
  return {
    label: null,
    startAt: invite.event.startAt,
    venue: invite.event.venueName,
    address: invite.event.address,
  };
}

export const RSVP_BADGE: Record<
  RsvpResponse | "PENDING",
  { label: string; classes: string }
> = {
  YES: {
    label: "Attending",
    classes: "bg-green-100 text-green-800 ring-1 ring-green-200",
  },
  MAYBE: {
    label: "Maybe",
    classes: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  },
  NO: {
    label: "Declined",
    classes: "bg-red-100 text-red-800 ring-1 ring-red-200",
  },
  PENDING: {
    label: "RSVP pending",
    classes: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  },
};

export const ACCESS_BANNER: Record<
  Exclude<AccessState["kind"], "ok">,
  { title: string; subtitle: string; classes: string }
> = {
  revoked: {
    title: "Invitation revoked",
    subtitle: "This invitation is no longer valid. Please contact the host.",
    classes: "bg-red-600 text-white",
  },
  cancelled: {
    title: "Event cancelled",
    subtitle: "This event has been cancelled by the host.",
    classes: "bg-red-600 text-white",
  },
  expired: {
    title: "Invitation expired",
    subtitle: "This invitation is past its expiry date.",
    classes: "bg-amber-500 text-white",
  },
  ended: {
    title: "Event has ended",
    subtitle: "This event has already taken place.",
    classes: "bg-slate-600 text-white",
  },
};

// Generic UUID-shape regex — permissive about version bits on purpose. We
// generate via Postgres `gen_random_uuid()` (always v4 today), but a stricter
// v4-only test would silently 404 if the default ever changes.
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
