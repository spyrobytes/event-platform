import { parseSchedule, findScheduleEntry } from "@/lib/schedule-read";
import {
  buildInvitationScheduleFields,
  type InvitationScheduleFields,
} from "@/lib/invitation-schedule-fields";
import {
  formatEventDateLong,
  formatEventTime,
  formatEventDateFormal,
  formatEventTimeFormal,
} from "@/lib/utils";
import type { DateWordingStyle } from "@/schemas/invitation";

/**
 * Sub-event block assembly for the invite email (canonical-schedule plan §3,
 * PR 3b). Extracted from the invites route so the derivation is
 * unit-testable.
 *
 * The typed Event.schedule is the only source (plan §4.3, PR 6). The
 * ceremony/reception blocks ARE the invitation card's field assembly
 * (buildInvitationScheduleFields) — the invite-page-verbatim rule holds by
 * construction, not by parallel maintenance. This module adds only the
 * email-specific "Traditional" block, formatted with the same
 * wordingStyle-selected formatters.
 */

export type InviteSubEventBlocks = InvitationScheduleFields & {
  traditionalDate?: string;
  traditionalTime?: string;
  traditionalVenue?: string;
  traditionalAddress?: string;
};

/** Main event precedes the ceremony by at least this to count as a distinct
 *  "Traditional" sub-event (filters out "arrive early" padding). */
const TRADITIONAL_MIN_LEAD_MS = 30 * 60 * 1000;

export function buildSubEventBlocks(input: {
  tz: string;
  eventStartAt: Date;
  eventVenueName: string | null;
  eventAddress: string | null;
  /** Raw Event.schedule Json column */
  schedule: unknown;
  /**
   * The invitation's date-wording style (InvitationConfig.dateWordingStyle)
   * so the email keeps matching the card when the organizer picks formal
   * wording.
   */
  wordingStyle?: DateWordingStyle;
}): InviteSubEventBlocks {
  const { tz } = input;
  const formal = input.wordingStyle === "formal";
  const fmtDate = formal ? formatEventDateFormal : formatEventDateLong;
  const fmtTime = formal ? formatEventTimeFormal : formatEventTime;

  const fields = buildInvitationScheduleFields({
    tz,
    schedule: input.schedule,
    wordingStyle: input.wordingStyle,
  });

  const entries = parseSchedule(input.schedule);
  const typedCeremony = entries ? findScheduleEntry(entries, "ceremony") : null;
  const typedReception = entries
    ? findScheduleEntry(entries, "reception")
    : null;
  const typedTraditional = entries
    ? findScheduleEntry(entries, "traditional")
    : null;

  // Traditional block: an explicit role="traditional" schedule entry wins —
  // the organizer named the cultural ceremony directly. Without one, fall
  // back to the heuristic: surface the main Event row's start time as a
  // "Traditional" sub-event when (a) wedding sub-events are configured AND
  // (b) the main event precedes the ceremony by at least the threshold.
  // Anchor preference mirrors the field ladders: typed ceremony → typed
  // reception; with no anchor, skip. Both rungs format with the
  // wordingStyle-selected formatters so a formal email never mixes styles.
  const ceremonyAnchor =
    (typedCeremony ? new Date(typedCeremony.startAt) : null) ??
    (typedReception ? new Date(typedReception.startAt) : null);
  const isMainEventDistinct =
    ceremonyAnchor !== null &&
    input.eventStartAt.getTime() + TRADITIONAL_MIN_LEAD_MS <=
      ceremonyAnchor.getTime();
  const traditional = typedTraditional
    ? {
        traditionalDate: fmtDate(typedTraditional.startAt, tz),
        traditionalTime: fmtTime(typedTraditional.startAt, tz),
        traditionalVenue: typedTraditional.venue || undefined,
        traditionalAddress: typedTraditional.address || undefined,
      }
    : isMainEventDistinct
      ? {
          traditionalDate: fmtDate(input.eventStartAt, tz),
          traditionalTime: fmtTime(input.eventStartAt, tz),
          traditionalVenue: input.eventVenueName || undefined,
          traditionalAddress: input.eventAddress || undefined,
        }
      : {};

  return { ...fields, ...traditional };
}
