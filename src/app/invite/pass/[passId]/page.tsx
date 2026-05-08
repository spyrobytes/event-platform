import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatEventDateLong, formatEventTime } from "@/lib/utils";
import {
  ACCESS_BANNER,
  RSVP_BADGE,
  UUID_PATTERN,
  detectAccessState,
  resolveGuestName,
  resolvePartyLabel,
  resolvePartyMembers,
  resolvePassMoment,
} from "./_helpers";

// TODO(rate-limit): wire `src/lib/rate-limit.ts` when the public-portal
// endpoints get their audit pass — first-hit hammering with random valid-
// shape UUIDs is bounded only by CDN+DB capacity. (Mirrors the same TODO
// on /api/qr/[passId]; both routes share the same threat model.)

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invitation",
  description: "Event invitation details",
  robots: { index: false, follow: false },
  // Generic on purpose — link unfurls must not leak guest identity / RSVP state.
  openGraph: {
    title: "Event Invitation",
    description: "View your invitation details",
  },
};

type PageProps = {
  params: Promise<{ passId: string }>;
};

export default async function InvitePassPage({ params }: PageProps) {
  const { passId } = await params;

  // Cheap 404 — Postgres uuid would parse-error on garbage. Mirrors /api/qr/[passId].
  if (!UUID_PATTERN.test(passId)) {
    notFound();
  }

  const invite = await db.invite.findUnique({
    where: { passId },
    include: {
      // Scoped select — the RSVP table carries dietaryRestrictions, music
      // suggestions, etc. that the pass view never reads.
      rsvp: {
        select: {
          guestName: true,
          guestCount: true,
          response: true,
          additionalGuestNames: true,
        },
      },
      event: {
        select: {
          title: true,
          startAt: true,
          endAt: true,
          status: true,
          timezone: true,
          venueName: true,
          address: true,
          invitationConfig: {
            select: {
              receptionStartAt: true,
              receptionVenue: true,
              receptionAddress: true,
            },
          },
        },
      },
    },
  });

  if (!invite) {
    notFound();
  }

  const state = detectAccessState(invite);

  if (state.kind !== "ok") {
    const banner = ACCESS_BANNER[state.kind];
    return (
      <main className="min-h-dvh flex items-center justify-center bg-slate-50 px-6 py-12">
        <div
          className={`w-full max-w-sm rounded-2xl p-8 text-center shadow-lg ${banner.classes}`}
        >
          <h1 className="text-2xl font-semibold leading-tight">{banner.title}</h1>
          <p className="mt-3 text-base/6 opacity-95">{banner.subtitle}</p>
          <p className="mt-6 border-t border-white/20 pt-4 text-sm opacity-90">
            {invite.event.title}
          </p>
        </div>
      </main>
    );
  }

  const guestName = resolveGuestName(invite);
  const partyLabel = resolvePartyLabel(invite);
  const partyMembers = resolvePartyMembers(invite);
  const rsvpKey = invite.rsvp?.response ?? "PENDING";
  const rsvpBadge = RSVP_BADGE[rsvpKey];
  const passMoment = resolvePassMoment(invite);
  const eventDate = formatEventDateLong(passMoment.startAt, invite.event.timezone);
  const eventTime = formatEventTime(passMoment.startAt, invite.event.timezone);

  return (
    <main className="min-h-dvh flex items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
        <h1 className="text-[40px] font-semibold leading-[1.1] text-slate-900 break-words">
          {guestName}
        </h1>

        <div className="mt-6 flex justify-center">
          <span
            className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium ${rsvpBadge.classes}`}
          >
            {rsvpBadge.label}
          </span>
        </div>

        {partyLabel && (
          <p className="mt-4 text-sm font-medium text-slate-600">{partyLabel}</p>
        )}

        {partyMembers.length > 0 && (
          <p className="mt-1 text-sm text-slate-500 break-words">
            with {partyMembers.join(", ")}
          </p>
        )}

        <div className="mt-8 border-t border-slate-200 pt-6">
          <p className="text-base font-medium text-slate-900">{invite.event.title}</p>
          {passMoment.label && (
            <p className="mt-0.5 text-xs uppercase tracking-wide text-slate-500">
              {passMoment.label}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-600">
            {eventDate} · {eventTime}
          </p>
          {passMoment.venue && (
            <p className="mt-2 text-sm text-slate-700">{passMoment.venue}</p>
          )}
          {passMoment.address && (
            <p className="text-xs text-slate-500">{passMoment.address}</p>
          )}
        </div>
      </div>
    </main>
  );
}
