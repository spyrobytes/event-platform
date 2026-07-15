"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { parseSchedule } from "@/lib/schedule-read";

type ScheduleItem = {
  time: string;
  title: string;
  description?: string;
  location?: string;
};

type ScheduleGroup = {
  label: string;
  date?: string;
  location?: string;
  items: ScheduleItem[];
};

type ScheduleEditorProps = {
  items: ScheduleItem[];
  groups?: ScheduleGroup[];
  /**
   * Clears items AND groups in one state update. Must be a single
   * setState/updateSection call in the host — two sequential calls that
   * each spread the same render's section.data resurrect the cleared half.
   */
  onRemoveLegacy: () => void;
  eventId: string;
  /** Raw Event.schedule Json (from the page-config GET's event payload). */
  eventSchedule?: unknown;
};

/**
 * Page-editor panel for the schedule section (canonical-schedule PR 3d).
 * The section's list now derives from the typed Event.schedule — free-text
 * item/group editing is no longer offered (free-text is end-of-life, plan
 * §4.3). Saved hand-typed items are shown read-only, with removal offered
 * only once a typed schedule exists (before that they are the only content
 * the section can render). Section heading/description stay editable in
 * the host page.
 */
export function ScheduleEditor({
  items,
  groups,
  onRemoveLegacy,
  eventId,
  eventSchedule,
}: ScheduleEditorProps) {
  // Full Zod parse — memoized off the editor's keystroke re-render path.
  const typedEntries = useMemo(
    () => parseSchedule(eventSchedule),
    [eventSchedule]
  );
  const legacyGroups = groups && groups.length > 0 ? groups : null;
  const hasLegacyText = items.length > 0 || !!legacyGroups;

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

      {hasLegacyText && (
        <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted-foreground">
            {typedEntries
              ? "Hand-typed schedule items saved earlier are no longer shown — the Event Schedule has taken over this section."
              : "The hand-typed items below still display until Event Schedule entries exist. Editing them is no longer offered here — re-create them as Event Schedule entries."}
          </p>

          <ul className="space-y-2 text-sm text-muted-foreground">
            {legacyGroups
              ? legacyGroups.map((group, gi) => (
                  <li key={gi}>
                    <span className="font-medium">
                      {group.label || `Day ${gi + 1}`}
                      {group.date ? ` — ${group.date}` : ""}
                      {group.location ? ` · ${group.location}` : ""}
                    </span>
                    <ul className="ml-4 list-disc space-y-1">
                      {group.items.map((item, ii) => (
                        <li key={ii}>
                          <LegacyItem item={item} />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))
              : items.map((item, i) => (
                  <li key={i} className="ml-4 list-disc">
                    <LegacyItem item={item} />
                  </li>
                ))}
          </ul>

          {typedEntries && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemoveLegacy}
              >
                Remove hand-typed items
              </Button>
              <p className="text-xs text-muted-foreground">
                Removal is applied when you save the page.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Every saved field is shown — the organizer decides whether to remove
 *  this data, so none of it may be hidden from the review list. */
function LegacyItem({ item }: { item: ScheduleItem }) {
  return (
    <>
      {item.time ? `${item.time} — ` : ""}
      {item.title}
      {item.location ? ` · ${item.location}` : ""}
      {item.description ? (
        <span className="block text-xs italic">{item.description}</span>
      ) : null}
    </>
  );
}
