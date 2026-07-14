import { parseSchedule, findScheduleEntry } from "@/lib/schedule-read";
import {
  formatEventDateLong,
  formatEventTime,
  formatEventDateFormal,
  formatEventTimeFormal,
} from "@/lib/utils";
import type { DateWordingStyle } from "@/schemas/invitation";

/**
 * Ceremony/reception field assembly for the invitation card (canonical-
 * schedule plan §3, PR 3c). Shared by the guest page (`/invite/[token]`)
 * and the organizer preview so the two can never drift, and mirrors the
 * invite email's `buildSubEventBlocks` ladders (invite-page-verbatim rule:
 * the email must show exactly what the card shows).
 *
 * Field precedence:
 *   date/time strings: free-text wording (transitional shim, plan §4.3)
 *     → typed Event.schedule entry → legacy InvitationConfig.*StartAt
 *   venue/address: typed Event.schedule entry → legacy InvitationConfig
 *
 * `wordingStyle` applies only to the derived rungs (typed + legacy StartAt);
 * free-text renders verbatim — it IS the organizer's wording.
 */

export type InvitationScheduleConfig = {
  ceremonyStartAt: Date | string | null;
  ceremonyDate: string | null;
  ceremonyTime: string | null;
  ceremonyVenue: string | null;
  ceremonyAddress: string | null;
  receptionStartAt: Date | string | null;
  receptionDate: string | null;
  receptionTime: string | null;
  receptionVenue: string | null;
  receptionAddress: string | null;
};

export type InvitationScheduleFields = {
  ceremonyDate?: string;
  ceremonyTime?: string;
  ceremonyVenue?: string;
  ceremonyAddress?: string;
  receptionDate?: string;
  receptionTime?: string;
  receptionVenue?: string;
  receptionAddress?: string;
};

export function buildInvitationScheduleFields(input: {
  tz: string;
  /** Raw Event.schedule Json column */
  schedule: unknown;
  config: InvitationScheduleConfig | null;
  wordingStyle?: DateWordingStyle;
}): InvitationScheduleFields {
  const { tz, config: cfg } = input;
  const formal = input.wordingStyle === "formal";
  const fmtDate = formal ? formatEventDateFormal : formatEventDateLong;
  const fmtTime = formal ? formatEventTimeFormal : formatEventTime;

  const entries = parseSchedule(input.schedule);
  const typedCeremony = entries ? findScheduleEntry(entries, "ceremony") : null;
  const typedReception = entries ? findScheduleEntry(entries, "reception") : null;

  return {
    ceremonyDate:
      cfg?.ceremonyDate ||
      (typedCeremony
        ? fmtDate(typedCeremony.startAt, tz)
        : cfg?.ceremonyStartAt
          ? fmtDate(cfg.ceremonyStartAt, tz)
          : undefined),
    ceremonyTime:
      cfg?.ceremonyTime ||
      (typedCeremony
        ? fmtTime(typedCeremony.startAt, tz)
        : cfg?.ceremonyStartAt
          ? fmtTime(cfg.ceremonyStartAt, tz)
          : undefined),
    ceremonyVenue: typedCeremony?.venue || cfg?.ceremonyVenue || undefined,
    ceremonyAddress: typedCeremony?.address || cfg?.ceremonyAddress || undefined,
    receptionDate:
      cfg?.receptionDate ||
      (typedReception
        ? fmtDate(typedReception.startAt, tz)
        : cfg?.receptionStartAt
          ? fmtDate(cfg.receptionStartAt, tz)
          : undefined),
    receptionTime:
      cfg?.receptionTime ||
      (typedReception
        ? fmtTime(typedReception.startAt, tz)
        : cfg?.receptionStartAt
          ? fmtTime(cfg.receptionStartAt, tz)
          : undefined),
    receptionVenue: typedReception?.venue || cfg?.receptionVenue || undefined,
    receptionAddress:
      typedReception?.address || cfg?.receptionAddress || undefined,
  };
}
