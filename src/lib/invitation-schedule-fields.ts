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
 * The typed Event.schedule is the only source (plan §4.3, PR 6): free-text
 * wording and the legacy InvitationConfig.*StartAt columns are gone.
 * `wordingStyle` picks the deterministic formatter for date/time strings.
 */

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
  wordingStyle?: DateWordingStyle;
}): InvitationScheduleFields {
  const { tz } = input;
  const formal = input.wordingStyle === "formal";
  const fmtDate = formal ? formatEventDateFormal : formatEventDateLong;
  const fmtTime = formal ? formatEventTimeFormal : formatEventTime;

  const entries = parseSchedule(input.schedule);
  const typedCeremony = entries ? findScheduleEntry(entries, "ceremony") : null;
  const typedReception = entries
    ? findScheduleEntry(entries, "reception")
    : null;

  return {
    ceremonyDate: typedCeremony
      ? fmtDate(typedCeremony.startAt, tz)
      : undefined,
    ceremonyTime: typedCeremony
      ? fmtTime(typedCeremony.startAt, tz)
      : undefined,
    ceremonyVenue: typedCeremony?.venue || undefined,
    ceremonyAddress: typedCeremony?.address || undefined,
    receptionDate: typedReception
      ? fmtDate(typedReception.startAt, tz)
      : undefined,
    receptionTime: typedReception
      ? fmtTime(typedReception.startAt, tz)
      : undefined,
    receptionVenue: typedReception?.venue || undefined,
    receptionAddress: typedReception?.address || undefined,
  };
}
