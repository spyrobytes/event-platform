"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import {
  buildLiveSubpageHref,
  getLivestreamPhase,
  type LivestreamPhase,
  type LivestreamRendererProps,
} from "./types";
import { LivestreamCountdown } from "./LivestreamCountdown";
import { LivestreamPlayer } from "./LivestreamPlayer";

/**
 * Server-rendered dispatch for the Livestream section.
 *
 * `mode` decides what shape the section takes on the page:
 * - "preview" → compact CTA card on the main event page; routes guests to
 *   /e/[slug]/live for the actual viewing experience. Shows a compact
 *   "Starts in …" countdown when the stream is scheduled in the future.
 * - "full"    → full-bleed player or replay on /e/[slug]/live itself.
 *
 * The section owns a 1-second interval that re-evaluates `phase` and feeds
 * `nowMs` to the children. This is what makes the renderer auto-transition
 * before → ready → ended without requiring a page reload, and what feeds
 * the prop-driven `LivestreamCountdown`.
 *
 * Hydration safety: initial `nowMs` is 0 on both server and client so the
 * SSR'd DOM matches the first client paint. The interval populates the
 * real value on its first tick (≤1 sec after mount), at which point the
 * tree re-renders into the correct phase.
 *
 * Colors use template CSS variables (--text, --text-2, --accent, --surface,
 * --border) with fallbacks. Tailwind's text-foreground/bg-background
 * utilities would point at variables the wedding templates don't override,
 * yielding white-on-white text inside V2/V3 themes.
 */
export function LivestreamSection({
  data,
  eventSlug,
  inviteToken,
  mode,
  timezone,
}: LivestreamRendererProps) {
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const phase = getLivestreamPhase(data, nowMs);
  const startLabel = formatStartLabel(data.startAt, timezone);

  if (mode === "preview") {
    if (!data.primary) return null;
    return (
      <CtaCard
        data={data}
        phase={phase}
        nowMs={nowMs}
        eventSlug={eventSlug}
        inviteToken={inviteToken}
        startLabel={startLabel}
      />
    );
  }

  // "full" — dedicated /live sub-page
  return (
    <section id="live" className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
      <header className="mb-6 text-center">
        <h2
          className="text-3xl font-semibold tracking-tight"
          style={{ color: "var(--text, #1e1b17)" }}
        >
          {data.heading || "Live Stream"}
        </h2>
        {data.description && (
          <p
            className="mx-auto mt-2 max-w-2xl text-sm"
            style={{ color: "var(--text-2, #6b7280)" }}
          >
            {data.description}
          </p>
        )}
      </header>

      {phase === "before" && (
        <div
          className="space-y-6 rounded-2xl px-6 py-10 text-center"
          style={{
            border: "1px solid var(--border, #e5e7eb)",
            background: "var(--surface, rgba(0,0,0,0.02))",
          }}
        >
          <p className="text-sm" style={{ color: "var(--text-2, #6b7280)" }}>
            The livestream hasn&apos;t started yet.
          </p>
          {data.startAt && data.showCountdown !== false && (
            <LivestreamCountdown
              startAtIso={data.startAt}
              startAtLabel={startLabel}
              nowMs={nowMs}
            />
          )}
          {!data.showCountdown && startLabel && (
            <p className="text-sm font-medium" style={{ color: "var(--text, #1e1b17)" }}>
              {startLabel}
            </p>
          )}
          <p className="text-xs" style={{ color: "var(--text-3, #9ca3af)" }}>
            Check back at the scheduled time.
          </p>
        </div>
      )}

      {phase === "ready" && <LivestreamPlayer data={data} />}

      {phase === "ended" && data.replay && (
        <div className="space-y-4">
          <p
            className="text-center text-sm"
            style={{ color: "var(--text-2, #6b7280)" }}
          >
            The livestream has ended. Here&apos;s the replay.
          </p>
          <LivestreamPlayer data={data} useReplay />
        </div>
      )}

      {phase === "ended" && !data.replay && (
        <div
          className="rounded-2xl px-6 py-12 text-center"
          style={{
            border: "1px solid var(--border, #e5e7eb)",
            background: "var(--surface, rgba(0,0,0,0.02))",
            color: "var(--text-2, #6b7280)",
          }}
        >
          <p className="text-sm">
            The livestream has ended. {data.fallbackMessage ||
              "A replay may be shared by the organizer later."}
          </p>
        </div>
      )}
    </section>
  );
}

// --- Preview CTA on the main event page -------------------------------------

type CtaProps = {
  data: LivestreamRendererProps["data"];
  phase: LivestreamPhase;
  nowMs: number;
  eventSlug: string;
  inviteToken?: string;
  startLabel: string;
};

function CtaCard({ data, phase, nowMs, eventSlug, inviteToken, startLabel }: CtaProps) {
  const href = buildLiveSubpageHref(eventSlug, inviteToken);
  const heading = data.heading || "Live Stream";
  const ctaLabel = data.ctaLabel || "Watch live";

  const status: { label: string; tone: "live" | "scheduled" | "ended" } =
    phase === "ready"
      ? { label: "Live now", tone: "live" }
      : phase === "ended"
        ? data.replay
          ? { label: "Replay available", tone: "scheduled" }
          : { label: "Ended", tone: "ended" }
        : { label: data.startAt ? "Scheduled" : "Going live soon", tone: "scheduled" };

  // Compact ticking countdown shown only when the stream is scheduled and
  // still in the future. `nowMs === 0` on the SSR + first-hydration paint —
  // skip the line then so server and client agree, then it appears after
  // the parent's interval fires.
  const remainingMs =
    phase === "before" && data.startAt && nowMs > 0
      ? Math.max(0, Date.parse(data.startAt) - nowMs)
      : null;

  return (
    <section id="live" className="mx-auto w-full max-w-3xl px-4 py-10">
      <div
        className="overflow-hidden rounded-2xl shadow-sm"
        style={{
          border: "1px solid var(--border, #e5e7eb)",
          background: "var(--surface, #ffffff)",
        }}
      >
        <div className="flex flex-col gap-5 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StatusPill {...status} />
              <h3
                className="text-xl font-semibold tracking-tight sm:text-2xl"
                style={{ color: "var(--text, #1e1b17)" }}
              >
                {heading}
              </h3>
            </div>
            {data.description && (
              <p
                className="max-w-md text-sm"
                style={{ color: "var(--text-2, #6b7280)" }}
              >
                {data.description}
              </p>
            )}
            {remainingMs !== null && remainingMs > 0 && (
              <p
                className="text-sm font-medium tabular-nums"
                style={{ color: "var(--text, #1e1b17)" }}
                aria-live="polite"
              >
                Starts in {formatCompactCountdown(remainingMs)}
              </p>
            )}
            {phase !== "ended" && startLabel && (
              <p
                className="text-xs"
                style={{ color: "var(--text-2, #6b7280)" }}
              >
                {startLabel}
              </p>
            )}
          </div>
          <Link
            href={href}
            className="inline-flex items-center justify-center gap-2 self-start rounded-full px-5 py-2.5 text-sm font-medium shadow-sm transition hover:opacity-90 sm:self-auto"
            style={{
              background: "var(--accent, #1e1b17)",
              color: "#ffffff",
            }}
          >
            <span>{phase === "ended" && data.replay ? "Watch replay" : ctaLabel}</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "live" | "scheduled" | "ended" }) {
  if (tone === "live") {
    // Red pill stays red across all themes — universal "live" affordance.
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        {label}
      </span>
    );
  }
  if (tone === "ended") {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
        style={{
          background: "color-mix(in srgb, var(--text-3, #9ca3af) 18%, transparent)",
          color: "var(--text-3, #9ca3af)",
        }}
      >
        {label}
      </span>
    );
  }
  // "scheduled" — uses the accent color so it harmonizes with the template's palette.
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        background: "color-mix(in srgb, var(--accent, #1e1b17) 12%, transparent)",
        color: "var(--accent, #1e1b17)",
      }}
    >
      {label}
    </span>
  );
}

function formatStartLabel(startAtIso: string | undefined, timezone: string | undefined): string {
  if (!startAtIso) return "";
  const tz = timezone || "UTC";
  try {
    // Numeric offset (xxx → "-06:00") instead of `zzz` (abbreviation like
    // "MDT"). The `zzz` token reads locale-name data that differs between
    // Node's bundled ICU and the browser's Intl runtime — Node resolved
    // America/Denver to "MDT" while the browser resolved it to "GMT-6"
    // for the same instant, producing a hydration mismatch. `xxx` is
    // purely numeric and stable everywhere.
    return formatInTimeZone(startAtIso, tz, "EEE, MMM d · h:mm a 'GMT'xxx");
  } catch {
    return "";
  }
}

// Compact text breakdown for the CTA's "Starts in …" line. Tightens the
// granularity as we get closer so the line stays scannable: days/hours
// when far, hours/minutes mid-range, minutes/seconds when imminent.
function formatCompactCountdown(remainingMs: number): string {
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days >= 1) {
    return hours > 0
      ? `${days} ${days === 1 ? "day" : "days"} ${hours} hr`
      : `${days} ${days === 1 ? "day" : "days"}`;
  }
  if (hours >= 1) {
    return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
  }
  if (minutes >= 1) {
    return `${minutes} min ${seconds} sec`;
  }
  return `${seconds} sec`;
}
