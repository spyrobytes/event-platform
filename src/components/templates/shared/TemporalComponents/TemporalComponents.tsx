"use client";

import { useTemporal } from "../TemporalContext";
import { JUST_STARTED_WINDOW_MS } from "@/hooks/use-event-temporal";
import { cn } from "@/lib/utils";
import { ConfettiBurst } from "./ConfettiBurst";
import styles from "./TemporalComponents.module.css";

/**
 * Countdown Display
 *
 * Shows a styled countdown to the event. Automatically hides
 * when event is ongoing or ended.
 */
type CountdownDisplayProps = {
  /** Additional CSS classes */
  className?: string;
  /** Display style variant */
  variant?: "default" | "compact" | "hero";
  /** Accent color */
  accentColor?: string;
};

export function CountdownDisplay({
  className,
  variant = "default",
  accentColor,
}: CountdownDisplayProps) {
  const { shouldShowCountdown, countdownText, timeRemaining, phase } = useTemporal();

  if (!shouldShowCountdown || !timeRemaining) {
    return null;
  }

  const style = accentColor
    ? ({ "--temporal-accent": accentColor } as React.CSSProperties)
    : undefined;

  // Compact variant - just the text
  if (variant === "compact") {
    return (
      <span className={cn(styles.countdownCompact, className)} style={style}>
        {countdownText}
      </span>
    );
  }

  // Hero variant - large, prominent display
  if (variant === "hero") {
    // Leading-unit tiers, floored like a countdown clock: days → hours →
    // minutes → seconds. Tier off timeRemaining (floored), not daysUntil
    // (ceiled for phase math) — otherwise day 0 still reads "1 day".
    const { days, hours, minutes, seconds } = timeRemaining;
    let value: number;
    let unit: string;
    let sub: string | null = null;
    if (days > 0) {
      value = days;
      unit = days === 1 ? "day" : "days";
      if (days === 1 && hours > 0) sub = `${hours} hour${hours === 1 ? "" : "s"}`;
    } else if (hours > 0) {
      value = hours;
      unit = hours === 1 ? "hour" : "hours";
      if (minutes > 0) sub = `${minutes} min`;
    } else if (minutes > 0) {
      value = minutes;
      unit = minutes === 1 ? "minute" : "minutes";
    } else {
      value = seconds;
      unit = seconds === 1 ? "second" : "seconds";
    }

    return (
      <div className={cn(styles.countdownHero, className)} style={style}>
        <div className={styles.countdownLabel}>
          {phase === "today" ? "Today" : phase === "imminent" ? "Coming Soon" : "Counting Down"}
        </div>
        <div className={styles.countdownValue}>
          <span className={styles.countdownNumber}>{value}</span>
          <span className={styles.countdownUnit}>{unit}</span>
        </div>
        {sub && <div className={styles.countdownSub}>{sub}</div>}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn(styles.countdown, className)} style={style}>
      <span className={styles.countdownText}>{countdownText}</span>
    </div>
  );
}

/**
 * Live Indicator
 *
 * Shows a pulsing "Happening Now" indicator when event is ongoing.
 */
type LiveIndicatorProps = {
  /** Additional CSS classes */
  className?: string;
  /** Custom text (default: "Happening Now") */
  text?: string;
  /** Accent color */
  accentColor?: string;
};

export function LiveIndicator({
  className,
  text = "Happening Now",
  accentColor,
}: LiveIndicatorProps) {
  const { shouldShowLive } = useTemporal();

  if (!shouldShowLive) {
    return null;
  }

  const style = accentColor
    ? ({ "--temporal-accent": accentColor } as React.CSSProperties)
    : undefined;

  return (
    <div className={cn(styles.liveIndicator, className)} style={style}>
      <span className={styles.liveDot} aria-hidden="true" />
      <span className={styles.liveText}>{text}</span>
    </div>
  );
}

/**
 * Post-Event Message
 *
 * Shows a thank-you or memories message after the event has ended.
 */
type PostEventMessageProps = {
  /** Additional CSS classes */
  className?: string;
  /** Main message (default: "Thank You for Celebrating with Us") */
  message?: string;
  /** Subtitle (default: based on days since ended) */
  subtitle?: string;
  /** Accent color */
  accentColor?: string;
};

export function PostEventMessage({
  className,
  message = "Thank You for Celebrating with Us",
  subtitle,
  accentColor,
}: PostEventMessageProps) {
  const { shouldShowPostEvent, daysSinceEnded } = useTemporal();

  if (!shouldShowPostEvent) {
    return null;
  }

  const style = accentColor
    ? ({ "--temporal-accent": accentColor } as React.CSSProperties)
    : undefined;

  // Default subtitle based on how long ago the event was
  const defaultSubtitle =
    daysSinceEnded === 0
      ? "What a wonderful day!"
      : daysSinceEnded === 1
        ? "What a wonderful day yesterday!"
        : daysSinceEnded <= 7
          ? "We hope you enjoyed the celebration"
          : "Thank you for being part of our special day";

  return (
    <div className={cn(styles.postEvent, className)} style={style}>
      <p className={styles.postEventMessage}>{message}</p>
      <p className={styles.postEventSubtitle}>{subtitle || defaultSubtitle}</p>
    </div>
  );
}

/**
 * Temporal Badge
 *
 * A small badge that shows the event's temporal status.
 * Good for cards or compact displays.
 */
type TemporalBadgeProps = {
  /** Additional CSS classes */
  className?: string;
  /** Accent color */
  accentColor?: string;
};

export function TemporalBadge({ className, accentColor }: TemporalBadgeProps) {
  const { phase, countdownText, isTemporalEnabled } = useTemporal();

  if (!isTemporalEnabled) {
    return null;
  }

  const style = accentColor
    ? ({ "--temporal-accent": accentColor } as React.CSSProperties)
    : undefined;

  let badgeText: string;
  let badgeVariant: string;

  switch (phase) {
    case "ongoing":
      badgeText = "Live";
      badgeVariant = styles.badgeLive;
      break;
    case "today":
      badgeText = "Today";
      badgeVariant = styles.badgeToday;
      break;
    case "imminent":
      badgeText = countdownText;
      badgeVariant = styles.badgeImminent;
      break;
    case "ended":
      badgeText = "Past Event";
      badgeVariant = styles.badgeEnded;
      break;
    default:
      badgeText = countdownText || "Upcoming";
      badgeVariant = styles.badgeUpcoming;
  }

  return (
    <span
      className={cn(styles.temporalBadge, badgeVariant, className)}
      style={style}
    >
      {phase === "ongoing" && <span className={styles.liveDotSmall} />}
      {badgeText}
    </span>
  );
}

/**
 * RSVP Urgency Indicator
 *
 * Shows urgency messaging when RSVP deadline is approaching.
 */
type RsvpUrgencyProps = {
  /** Additional CSS classes */
  className?: string;
  /** Custom urgent message */
  urgentMessage?: string;
  /** Accent color */
  accentColor?: string;
};

export function RsvpUrgency({
  className,
  urgentMessage,
  accentColor,
}: RsvpUrgencyProps) {
  const { isRsvpUrgent, daysUntil, phase } = useTemporal();

  // Don't show for ended or ongoing events
  if (phase === "ended" || phase === "ongoing") {
    return null;
  }

  if (!isRsvpUrgent) {
    return null;
  }

  const style = accentColor
    ? ({ "--temporal-accent": accentColor } as React.CSSProperties)
    : undefined;

  const defaultMessage =
    daysUntil <= 1
      ? "Last chance to RSVP!"
      : daysUntil <= 2
        ? "RSVP deadline approaching"
        : "Please RSVP soon";

  return (
    <div className={cn(styles.rsvpUrgency, className)} style={style}>
      <span className={styles.urgencyIcon} aria-hidden="true">
        !
      </span>
      <span className={styles.urgencyText}>{urgentMessage || defaultMessage}</span>
    </div>
  );
}

/**
 * Temporal Hero Overlay
 *
 * A component that renders temporal-aware content for hero sections.
 * Shows countdown, live indicator, or post-event message based on phase.
 */
type TemporalHeroOverlayProps = {
  /** Additional CSS classes */
  className?: string;
  /** Accent color */
  accentColor?: string;
  /** Custom post-event message */
  postEventMessage?: string;
};

export function TemporalHeroOverlay({
  className,
  accentColor,
  postEventMessage,
}: TemporalHeroOverlayProps) {
  const {
    phase,
    shouldShowCountdown,
    shouldShowLive,
    shouldShowPostEvent,
    msUntilStart,
  } = useTemporal();

  if (phase === "unknown") {
    return null;
  }

  // Confetti in the seconds right after the countdown hits zero. Detected as
  // a time window (not a phase transition), so it's a pure derivation — no
  // effect/state — and a guest who loads the page within the window gets the
  // burst too, which is a feature. Deliberately NOT gated on isOngoing:
  // events without an endAt are "ended" the instant they start (effectiveEndAt
  // = startAt) and would never burst.
  const justStarted = msUntilStart <= 0 && msUntilStart >= -JUST_STARTED_WINDOW_MS;

  return (
    <div className={cn(styles.heroOverlay, className)}>
      {shouldShowCountdown && (
        <CountdownDisplay variant="hero" accentColor={accentColor} />
      )}
      {shouldShowLive && <LiveIndicator accentColor={accentColor} />}
      {justStarted && <ConfettiBurst accentColor={accentColor} />}
      {shouldShowPostEvent && (
        <PostEventMessage message={postEventMessage} accentColor={accentColor} />
      )}
    </div>
  );
}
