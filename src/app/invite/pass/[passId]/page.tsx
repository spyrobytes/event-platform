import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatEventDateLong, formatEventTime } from "@/lib/utils";
import { isWeddingTemplate } from "@/lib/section-nav-defaults";
import { SIDE_PILL_LABEL } from "@/lib/rsvp-side";
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
          side: true,
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
          templateId: true,
          passBackdropStyle: true,
          passBackdropImageUrl: true,
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

  // Fall back to NONE at read time if no backdrop image is configured —
  // an organizer who removed the image after picking a photo style
  // shouldn't see a broken card.
  const backdropImageUrl = invite.event.passBackdropImageUrl;
  const effectiveBackdrop =
    backdropImageUrl && invite.event.passBackdropStyle !== "NONE"
      ? invite.event.passBackdropStyle
      : "NONE";
  const isCardBackdrop = effectiveBackdrop === "CARD";

  const sideLabel =
    isWeddingTemplate(invite.event.templateId) && invite.rsvp?.side
      ? SIDE_PILL_LABEL[invite.rsvp.side]
      : null;

  const cardContent = (
    <>
      <h1
        className={`text-[40px] font-semibold leading-[1.1] break-words ${
          isCardBackdrop ? "text-white" : "text-slate-900"
        }`}
      >
        {guestName}
      </h1>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium ${rsvpBadge.classes}`}
        >
          {rsvpBadge.label}
        </span>
        {sideLabel && (
          <span
            className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium ${
              isCardBackdrop
                ? "bg-white/15 text-white ring-1 ring-white/30"
                : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
            }`}
          >
            {sideLabel}
          </span>
        )}
      </div>

      {partyLabel && (
        <p
          className={`mt-4 text-sm font-medium ${
            isCardBackdrop ? "text-white/90" : "text-slate-600"
          }`}
        >
          {partyLabel}
        </p>
      )}

      {partyMembers.length > 0 && (
        <p
          className={`mt-1 text-sm break-words ${
            isCardBackdrop ? "text-white/80" : "text-slate-500"
          }`}
        >
          with {partyMembers.join(", ")}
        </p>
      )}

      <div
        className={`mt-8 border-t pt-6 ${
          isCardBackdrop ? "border-white/20" : "border-slate-200"
        }`}
      >
        <p
          className={`text-base font-medium ${
            isCardBackdrop ? "text-white" : "text-slate-900"
          }`}
        >
          {invite.event.title}
        </p>
        {passMoment.label && (
          <p
            className={`mt-0.5 text-xs uppercase tracking-wide ${
              isCardBackdrop ? "text-white/70" : "text-slate-500"
            }`}
          >
            {passMoment.label}
          </p>
        )}
        <p
          className={`mt-1 text-sm ${
            isCardBackdrop ? "text-white/85" : "text-slate-600"
          }`}
        >
          {eventDate} · {eventTime}
        </p>
        {passMoment.venue && (
          <p
            className={`mt-2 text-sm ${
              isCardBackdrop ? "text-white/90" : "text-slate-700"
            }`}
          >
            {passMoment.venue}
          </p>
        )}
        {passMoment.address && (
          <p
            className={`text-xs ${
              isCardBackdrop ? "text-white/70" : "text-slate-500"
            }`}
          >
            {passMoment.address}
          </p>
        )}
      </div>
    </>
  );

  if (effectiveBackdrop === "CARD" && backdropImageUrl) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden shadow-lg">
          <Image
            src={backdropImageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 384px"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/85" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-center">
            {cardContent}
          </div>
        </div>
      </main>
    );
  }

  if (effectiveBackdrop === "PAGE" && backdropImageUrl) {
    return (
      <main className="relative min-h-dvh flex items-center justify-center px-6 py-12">
        <Image
          src={backdropImageUrl}
          alt=""
          fill
          sizes="100vw"
          className="object-cover -z-10"
          priority
        />
        <div className="absolute inset-0 bg-black/45 -z-10" />
        <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
          {cardContent}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
        {cardContent}
      </div>
    </main>
  );
}
