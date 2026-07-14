import { formatInTimeZone } from "date-fns-tz";
import { parseSchedule, findScheduleEntry } from "@/lib/schedule-read";

/**
 * Sub-event block assembly for the invite email (canonical-schedule plan §3,
 * PR 3b). Extracted from the invites route so the precedence ladders are
 * unit-testable.
 *
 * Field precedence, per the invite-page-verbatim rule (the email must show
 * exactly what the invitation card shows):
 *   date/time strings: free-text wording (transitional shim, plan §4.3)
 *     → typed Event.schedule entry → legacy InvitationConfig.*StartAt
 *   venue/address: typed Event.schedule entry → legacy InvitationConfig
 * The typed schedule is canonical wherever no free-text override exists.
 */

export type InviteSubEventConfig = {
  ceremonyStartAt: Date | null;
  ceremonyDate: string | null;
  ceremonyTime: string | null;
  ceremonyVenue: string | null;
  ceremonyAddress: string | null;
  receptionStartAt: Date | null;
  receptionDate: string | null;
  receptionTime: string | null;
  receptionVenue: string | null;
  receptionAddress: string | null;
};

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
  invitationConfig: InviteSubEventConfig | null;
}): InviteSubEventBlocks {
  const { tz, invitationConfig: cfg } = input;

  const entries = parseSchedule(input.schedule);
  const typedCeremony = entries ? findScheduleEntry(entries, "ceremony") : null;
  const typedReception = entries ? findScheduleEntry(entries, "reception") : null;

  const ceremonyHasAny =
    typedCeremony ||
    cfg?.ceremonyStartAt ||
    cfg?.ceremonyDate ||
    cfg?.ceremonyTime ||
    cfg?.ceremonyVenue;
  const ceremony = ceremonyHasAny
    ? {
        ceremonyDate:
          cfg?.ceremonyDate ||
          (typedCeremony
            ? formatInTimeZone(typedCeremony.startAt, tz, DATE_FMT)
            : cfg?.ceremonyStartAt
              ? formatInTimeZone(cfg.ceremonyStartAt, tz, DATE_FMT)
              : undefined),
        ceremonyTime:
          cfg?.ceremonyTime ||
          (typedCeremony
            ? formatInTimeZone(typedCeremony.startAt, tz, TIME_FMT)
            : cfg?.ceremonyStartAt
              ? formatInTimeZone(cfg.ceremonyStartAt, tz, TIME_FMT)
              : undefined),
        ceremonyVenue: typedCeremony?.venue || cfg?.ceremonyVenue || undefined,
        ceremonyAddress:
          typedCeremony?.address || cfg?.ceremonyAddress || undefined,
      }
    : {};

  // Surface the main Event row's start time as a "Traditional" sub-event
  // when (a) wedding sub-events are configured AND (b) the main event
  // precedes the ceremony by at least the threshold. Captures the common
  // case of a separate cultural / traditional ceremony preceding the formal
  // one. Anchor preference mirrors the field ladders: typed ceremony →
  // typed reception → legacy config equivalents; with no anchor, skip.
  const ceremonyAnchor =
    (typedCeremony ? new Date(typedCeremony.startAt) : null) ??
    (typedReception ? new Date(typedReception.startAt) : null) ??
    cfg?.ceremonyStartAt ??
    cfg?.receptionStartAt ??
    null;
  const isMainEventDistinct =
    ceremonyAnchor !== null &&
    input.eventStartAt.getTime() + TRADITIONAL_MIN_LEAD_MS <=
      ceremonyAnchor.getTime();
  const traditional = isMainEventDistinct
    ? {
        traditionalDate: input.eventDate,
        traditionalTime: input.eventTime,
        traditionalVenue: input.eventVenueName || undefined,
        traditionalAddress: input.eventAddress || undefined,
      }
    : {};

  const receptionHasAny =
    typedReception ||
    cfg?.receptionStartAt ||
    cfg?.receptionDate ||
    cfg?.receptionTime ||
    cfg?.receptionVenue;
  const reception = receptionHasAny
    ? {
        receptionDate:
          cfg?.receptionDate ||
          (typedReception
            ? formatInTimeZone(typedReception.startAt, tz, DATE_FMT)
            : cfg?.receptionStartAt
              ? formatInTimeZone(cfg.receptionStartAt, tz, DATE_FMT)
              : undefined),
        receptionTime:
          cfg?.receptionTime ||
          (typedReception
            ? formatInTimeZone(typedReception.startAt, tz, TIME_FMT)
            : cfg?.receptionStartAt
              ? formatInTimeZone(cfg.receptionStartAt, tz, TIME_FMT)
              : undefined),
        receptionVenue: typedReception?.venue || cfg?.receptionVenue || undefined,
        receptionAddress:
          typedReception?.address || cfg?.receptionAddress || undefined,
      }
    : {};

  return { ...ceremony, ...traditional, ...reception };
}
