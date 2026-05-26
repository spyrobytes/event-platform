"use client";

type Props = {
  // ISO UTC timestamp when the stream is scheduled to begin.
  startAtIso: string;
  // Pretty-printed start time in the event timezone (e.g. "Sat, Jun 20 · 2:00 PM GMT-06:00").
  // Rendered alongside the live ticker so the absolute time is always visible.
  startAtLabel: string;
  // Live-ticking millis from the parent (LivestreamSection owns the interval
  // so the parent's phase calculation and the countdown stay in sync). A
  // value of 0 means "not yet hydrated" — we render the stable placeholder
  // that matches the SSR output, avoiding a hydration mismatch.
  nowMs: number;
};

// Stateless countdown — all time state lives in the parent. Render branches:
//   - nowMs === 0   → "Stream starts <label>" placeholder (SSR + first hydration paint)
//   - bad startAt   → fallback message
//   - remaining ≤ 0 → "Starting now…" terminal text
//   - otherwise     → unit breakdown
//
// Colors use template CSS variables (--text, --text-2) with sensible fallbacks
// so the text stays readable across V1/V2/V3/conference/party templates. The
// templates set those variables on their root <article>; we don't use
// Tailwind's text-foreground/* because templates override --bg/--text but
// not --foreground/--background, which causes white-on-white text.
export function LivestreamCountdown({ startAtIso, startAtLabel, nowMs }: Props) {
  const startMs = Date.parse(startAtIso);

  if (nowMs === 0) {
    return (
      <p className="text-center text-sm" style={{ color: "var(--text-2, #6b7280)" }}>
        Stream starts {startAtLabel || "soon"}
      </p>
    );
  }

  if (Number.isNaN(startMs)) {
    return (
      <p className="text-sm" style={{ color: "var(--text-2, #6b7280)" }}>
        Stream starts soon — {startAtLabel}
      </p>
    );
  }

  const remaining = startMs - nowMs;

  if (remaining <= 0) {
    // The parent's phase will flip to "ready" on the next render tick and
    // this branch will unmount; the message is just a safety net for the
    // ~1 sec window between the start time and the next interval fire.
    return (
      <p className="text-sm font-medium" style={{ color: "var(--text, #1e1b17)" }}>
        Starting now…
      </p>
    );
  }

  const { days, hours, minutes, seconds } = breakDown(remaining);

  // Build a coarse, minute-level announcement for screen readers. The
  // visual ticker re-renders every second and is hidden from AT (aria-hidden)
  // because announcing each second is overwhelming. The polite live region
  // below only changes content when the total-minute count rolls over, so
  // AT users hear "5 minutes until stream starts" once, not 60 times.
  const totalMinutes = days * 1440 + hours * 60 + minutes;
  const announcement = buildCountdownAnnouncement(days, hours, minutes);

  return (
    <div className="space-y-2">
      <div
        className="flex items-center justify-center gap-3"
        aria-hidden="true"
      >
        {days > 0 && <Unit value={days} label={days === 1 ? "day" : "days"} />}
        <Unit value={hours} label="hr" />
        <Unit value={minutes} label="min" />
        <Unit value={seconds} label="sec" />
      </div>
      <p
        role="status"
        aria-live="polite"
        className="sr-only"
        // `key` forces the live region to re-emit only on minute boundaries
        // (and only if the announcement text actually changes), avoiding the
        // per-second flood that aria-live + ticker would otherwise produce.
        key={totalMinutes}
      >
        {announcement}
      </p>
      <p
        className="text-center text-xs"
        style={{ color: "var(--text-2, #6b7280)" }}
      >
        {startAtLabel}
      </p>
    </div>
  );
}

function buildCountdownAnnouncement(
  days: number,
  hours: number,
  minutes: number
): string {
  if (days > 0) {
    return `Stream starts in ${days} ${days === 1 ? "day" : "days"}` +
      (hours > 0 ? ` ${hours} ${hours === 1 ? "hour" : "hours"}` : "");
  }
  if (hours > 0) {
    return `Stream starts in ${hours} ${hours === 1 ? "hour" : "hours"}` +
      (minutes > 0 ? ` ${minutes} ${minutes === 1 ? "minute" : "minutes"}` : "");
  }
  if (minutes > 0) {
    return `Stream starts in ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }
  return "Stream starts in under a minute";
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="text-2xl font-semibold tabular-nums"
        style={{ color: "var(--text, #1e1b17)" }}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span
        className="text-[0.65rem] uppercase tracking-wide"
        style={{ color: "var(--text-2, #6b7280)" }}
      >
        {label}
      </span>
    </div>
  );
}

function breakDown(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}
