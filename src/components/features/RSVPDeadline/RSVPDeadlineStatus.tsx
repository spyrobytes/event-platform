"use client";

import { differenceInDays, differenceInHours, isPast, format } from "date-fns";

type RSVPDeadlineStatusProps = {
  deadline: Date | string | null | undefined;
  className?: string;
};

type UrgencyLevel = "closed" | "urgent" | "warning" | "normal";

function getUrgencyLevel(deadline: Date): UrgencyLevel {
  if (isPast(deadline)) {
    return "closed";
  }

  const daysRemaining = differenceInDays(deadline, new Date());

  if (daysRemaining < 3) {
    return "urgent";
  }
  if (daysRemaining < 7) {
    return "warning";
  }
  return "normal";
}

const URGENCY_STYLES: Record<UrgencyLevel, { bg: string; text: string; border: string }> = {
  closed: {
    bg: "bg-surface-3",
    text: "text-muted-foreground",
    border: "border-border",
  },
  urgent: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
  },
  warning: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/30",
  },
  normal: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
  },
};

export function RSVPDeadlineStatus({ deadline, className = "" }: RSVPDeadlineStatusProps) {
  if (!deadline) {
    return null;
  }

  const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
  const urgency = getUrgencyLevel(deadlineDate);
  const styles = URGENCY_STYLES[urgency];

  if (urgency === "closed") {
    return (
      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${styles.bg} ${styles.border} ${className}`}>
        <svg className={`h-4 w-4 ${styles.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-3V9m0 0V7m0 2h2m-2 0H9" />
        </svg>
        <span className={`text-sm font-medium ${styles.text}`}>RSVP Closed</span>
      </div>
    );
  }

  const daysRemaining = differenceInDays(deadlineDate, new Date());
  const hoursRemaining = differenceInHours(deadlineDate, new Date());

  let timeText: string;
  if (daysRemaining > 0) {
    timeText = `${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`;
  } else if (hoursRemaining > 0) {
    timeText = `${hoursRemaining} hour${hoursRemaining === 1 ? "" : "s"}`;
  } else {
    timeText = "less than an hour";
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${styles.bg} ${styles.border} ${className}`}>
      <svg className={`h-4 w-4 ${styles.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className={`text-sm font-medium ${styles.text}`}>
        RSVP closes in {timeText}
      </span>
    </div>
  );
}

type RSVPDeadlineInfoProps = {
  deadline: Date | string | null | undefined;
  className?: string;
};

export function RSVPDeadlineInfo({ deadline, className = "" }: RSVPDeadlineInfoProps) {
  if (!deadline) {
    return (
      <p className={`text-sm text-muted-foreground ${className}`}>
        No RSVP deadline set
      </p>
    );
  }

  const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
  const isClosed = isPast(deadlineDate);
  const formattedDate = format(deadlineDate, "EEEE, MMMM d, yyyy 'at' h:mm a");

  return (
    <div className={className}>
      <p className="text-sm text-muted-foreground">
        RSVP Deadline: <span className={isClosed ? "text-destructive" : "text-foreground"}>{formattedDate}</span>
      </p>
      <RSVPDeadlineStatus deadline={deadlineDate} className="mt-2" />
    </div>
  );
}
