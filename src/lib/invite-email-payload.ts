import { parseSchedule, findScheduleEntry } from "@/lib/schedule-read";
import { formatEventDateFormal, formatEventTimeFormal } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";
import type { DateWordingStyle } from "@/schemas/invitation";

/**
 * Sub-event block assembly for the invite email (canonical-schedule plan §3,
 * PR 3b). Extracted from the invites route so the derivation is
 * unit-testable.
 *
 * The typed Event.schedule is the only source (plan §4.3, PR 6): the
 * free-text wording and legacy InvitationConfig.*StartAt rungs are gone.
 * Per the invite-page-verbatim rule the email must show exactly what the
 * invitation card shows, so `wordingStyle` picks the same deterministic
 * formatter the card uses.
 */

export type InviteSubEventBlocks = {
  ceremonyDate?: string;
  ceremonyTime?: string;
  ceremonyVenue?: string;
  ceremonyAddress?: string;
  traditionalDate?: string;
  traditionalTime?: string;
  traditionalVenue?: string;
  traditionalAddress?: string;
  receptionDate?: string;
  receptionTime?: string;
  receptionVenue?: string;
  receptionAddress?: string;
};

const DATE_FMT = "EEEE, MMMM d, yyyy";
const TIME_FMT = "h:mm a";

/** Main event precedes the ceremony by at least this to count as a distinct
 *  "Traditional" sub-event (filters out "arrive early" padding). */
const TRADITIONAL_MIN_LEAD_MS = 30 * 60 * 1000;

export function buildSubEventBlocks(input: {
  tz: string;
  eventStartAt: Date;
  /** Preformatted main-event strings (the route already derives these) */
  eventDate: string;
  eventTime: string;
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
  const fmtDate = (d: Date | string) =>
    formal ? formatEventDateFormal(d, tz) : formatInTimeZone(d, tz, DATE_FMT);
  const fmtTime = (d: Date | string) =>
    formal ? formatEventTimeFormal(d, tz) : formatInTimeZone(d, tz, TIME_FMT);

  const entries = parseSchedule(input.schedule);
  const typedCeremony = entries ? findScheduleEntry(entries, "ceremony") : null;
  const typedReception = entries
    ? findScheduleEntry(entries, "reception")
    : null;
  const typedTraditional = entries
    ? findScheduleEntry(entries, "traditional")
    : null;

  const ceremony = typedCeremony
    ? {
        ceremonyDate: fmtDate(typedCeremony.startAt),
        ceremonyTime: fmtTime(typedCeremony.startAt),
        ceremonyVenue: typedCeremony.venue || undefined,
        ceremonyAddress: typedCeremony.address || undefined,
      }
    : {};

  // Traditional block: an explicit role="traditional" schedule entry wins —
  // the organizer named the cultural ceremony directly. Without one, fall
  // back to the heuristic: surface the main Event row's start time as a
  // "Traditional" sub-event when (a) wedding sub-events are configured AND
  // (b) the main event precedes the ceremony by at least the threshold.
  // Anchor preference mirrors the field ladders: typed ceremony → typed
  // reception; with no anchor, skip.
  const ceremonyAnchor =
    (typedCeremony ? new Date(typedCeremony.startAt) : null) ??
    (typedReception ? new Date(typedReception.startAt) : null);
  const isMainEventDistinct =
    ceremonyAnchor !== null &&
    input.eventStartAt.getTime() + TRADITIONAL_MIN_LEAD_MS <=
      ceremonyAnchor.getTime();
  const traditional = typedTraditional
    ? {
        traditionalDate: fmtDate(typedTraditional.startAt),
        traditionalTime: fmtTime(typedTraditional.startAt),
        traditionalVenue: typedTraditional.venue || undefined,
        traditionalAddress: typedTraditional.address || undefined,
      }
    : isMainEventDistinct
      ? {
          traditionalDate: input.eventDate,
          traditionalTime: input.eventTime,
          traditionalVenue: input.eventVenueName || undefined,
          traditionalAddress: input.eventAddress || undefined,
        }
      : {};

  const reception = typedReception
    ? {
        receptionDate: fmtDate(typedReception.startAt),
        receptionTime: fmtTime(typedReception.startAt),
        receptionVenue: typedReception.venue || undefined,
        receptionAddress: typedReception.address || undefined,
      }
    : {};

  return { ...ceremony, ...traditional, ...reception };
}
