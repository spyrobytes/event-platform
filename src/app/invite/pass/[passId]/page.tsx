import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatEventDateLong, formatEventTime } from "@/lib/utils";
import {
  ACCESS_BANNER,
  RSVP_BADGE,
  UUID_V4_PATTERN,
  detectAccessState,
  resolveGuestName,
  resolvePartyLabel,
  type RsvpResponse,
} from "./_helpers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invitation",
  description: "Event invitation details",
  robots: { index: false, follow: false },
  // Deliberately generic — link unfurls in iMessage, Slack, etc. must
  // not leak guest identity or RSVP state. See plan §Task 3.5 (S5).
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

  // Reject malformed passId before the DB call. Postgres' uuid type would
  // raise on a parse error; rejecting here avoids the round-trip and keeps
  // the 404 path cheap for crawler / scanner garbage.
  if (!UUID_V4_PATTERN.test(passId)) {
    notFound();
  }

  const invite = await db.invite.findUnique({
    where: { passId },
    include: {
      rsvp: true,
      event: {
        select: {
          title: true,
          startAt: true,
          endAt: true,
          status: true,
          timezone: true,
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
  const rsvpKey: RsvpResponse | "PENDING" =
    (invite.rsvp?.response as RsvpResponse | undefined) ?? "PENDING";
  const rsvpBadge = RSVP_BADGE[rsvpKey];
  const eventDate = formatEventDateLong(invite.event.startAt, invite.event.timezone);
  const eventTime = formatEventTime(invite.event.startAt, invite.event.timezone);

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

        <div className="mt-8 border-t border-slate-200 pt-6">
          <p className="text-base font-medium text-slate-900">{invite.event.title}</p>
          <p className="mt-1 text-sm text-slate-600">
            {eventDate} · {eventTime}
          </p>
        </div>
      </div>
    </main>
  );
}
