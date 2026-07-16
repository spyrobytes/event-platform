"use client";

import { useMemo } from "react";
import { parseSchedule } from "@/lib/schedule-read";

type ScheduleEditorProps = {
  eventId: string;
  /** Raw Event.schedule Json (from the page-config GET's event payload). */
  eventSchedule?: unknown;
};

/**
 * Page-editor panel for the schedule section (canonical-schedule PR 3d).
 * The section's list derives from the typed Event.schedule — free-text
 * item/group editing no longer exists (free-text is end-of-life, plan
 * §4.3, removed in PR 6). Section heading/description stay editable in
 * the host page.
 */
export function ScheduleEditor({ eventId, eventSchedule }: ScheduleEditorProps) {
  // Full Zod parse — memoized off the editor's keystroke re-render path.
  const typedEntries = useMemo(
    () => parseSchedule(eventSchedule),
    [eventSchedule]
  );

  const scheduleLink = (
    <a
      href={`/dashboard/events/${eventId}/schedule`}
      className="font-medium underline underline-offset-2"
      target="_blank"
      rel="noreferrer"
    >
      Event Schedule
    </a>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        {typedEntries ? (
          <p className="text-sm text-muted-foreground">
            This section displays the {scheduleLink} ({typedEntries.length}{" "}
            {typedEntries.length === 1 ? "entry" : "entries"}), grouped by day
            for multi-day events. Edit times, venues and descriptions there —
            the page, emails and guest passes all update together.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            This section is populated from the {scheduleLink}. Add entries
            there to build the page&apos;s schedule list.
          </p>
        )}
      </div>
    </div>
  );
}
