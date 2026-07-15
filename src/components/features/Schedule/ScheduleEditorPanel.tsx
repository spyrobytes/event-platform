"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseApiResponse } from "@/lib/api-client";
import { fromDatetimeLocalInTz, toDatetimeLocalInTz } from "@/lib/datetime";
import { scheduleSchema, SCHEDULE_ENTRY_ROLES, type ScheduleEntry } from "@/schemas/event";
import { cn } from "@/lib/utils";

/**
 * Canonical schedule editor (canonical-schedule plan §5, PR 4): the single
 * edit path for an event day's typed timing. Writes Event.schedule via
 * PATCH /api/events/[id]; the invitation panel and page editor link here
 * instead of editing their legacy timing fields.
 *
 * All datetime inputs are wall-clock in the EVENT's timezone
 * (toDatetimeLocalInTz / fromDatetimeLocalInTz), never the browser's.
 */

const ROLE_LABELS: Record<(typeof SCHEDULE_ENTRY_ROLES)[number], string> = {
  ceremony: "Ceremony",
  reception: "Reception",
  traditional: "Traditional Ceremony",
  welcome: "Welcome",
  rehearsal: "Rehearsal",
  afterparty: "Afterparty",
  session: "Session",
  banquet: "Banquet",
  other: "Other",
};

/** Form-side entry: datetimes as wall-clock strings for the inputs. */
export type DraftEntry = {
  id: string;
  label: string;
  role: ScheduleEntry["role"] | "";
  startLocal: string;
  endLocal: string;
  venue: string;
  address: string;
  description: string;
  isAccessPassGated: boolean;
};

export function toDraft(entry: ScheduleEntry, timezone: string): DraftEntry {
  return {
    id: entry.id,
    label: entry.label,
    role: entry.role ?? "",
    startLocal: toDatetimeLocalInTz(entry.startAt, timezone),
    endLocal: entry.endAt ? toDatetimeLocalInTz(entry.endAt, timezone) : "",
    venue: entry.venue ?? "",
    address: entry.address ?? "",
    description: entry.description ?? "",
    isAccessPassGated: entry.isAccessPassGated,
  };
}

export function fromDraft(draft: DraftEntry, timezone: string): ScheduleEntry {
  const start = fromDatetimeLocalInTz(draft.startLocal, timezone);
  const end = fromDatetimeLocalInTz(draft.endLocal, timezone);
  return {
    id: draft.id,
    label: draft.label.trim(),
    ...(draft.role ? { role: draft.role } : {}),
    startAt: start ? start.toISOString() : "",
    ...(end ? { endAt: end.toISOString() } : {}),
    venue: draft.venue.trim() || null,
    address: draft.address.trim() || null,
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
    isAccessPassGated: draft.isAccessPassGated,
  };
}

/**
 * Chronological draft order, matching what every read surface renders
 * (page section, segments, emails all sort by instant). datetime-local
 * strings compare lexicographically = chronologically within one timezone;
 * drafts without a start time sink to the end (stable, so newly added
 * moments stay where they were appended).
 */
export function sortDrafts(drafts: DraftEntry[]): DraftEntry[] {
  return [...drafts].sort((a, b) => {
    if (!a.startLocal || !b.startLocal) {
      return a.startLocal ? -1 : b.startLocal ? 1 : 0;
    }
    return a.startLocal < b.startLocal ? -1 : a.startLocal > b.startLocal ? 1 : 0;
  });
}

function newDraft(role: DraftEntry["role"], label: string): DraftEntry {
  return {
    id: crypto.randomUUID(),
    label,
    role,
    startLocal: "",
    endLocal: "",
    venue: "",
    address: "",
    description: "",
    isAccessPassGated: false,
  };
}

type ScheduleEditorPanelProps = {
  eventId: string;
  /** Reports dirty-state transitions so the host page can guard navigation
   *  (Back button + beforeunload) — the panel owns the state, the page owns
   *  the chrome. */
  onDirtyChange?: (dirty: boolean) => void;
};

export function ScheduleEditorPanel({
  eventId,
  onDirtyChange,
}: ScheduleEditorPanelProps) {
  const { getIdToken } = useAuthContext();

  const [timezone, setTimezone] = useState("UTC");
  const [eventTitle, setEventTitle] = useState("");
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) {
          if (!cancelled) setError("Not authenticated");
          return;
        }
        const res = await fetch(`/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data } = await parseApiResponse<{
          data: {
            title: string;
            timezone: string;
            schedule: ScheduleEntry[] | null;
          };
        }>(res);
        if (cancelled) return;
        setEventTitle(data.title);
        setTimezone(data.timezone || "UTC");
        setDrafts(
          sortDrafts(
            (data.schedule ?? []).map((e) => toDraft(e, data.timezone || "UTC"))
          )
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load event");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, getIdToken]);

  const updateDraft = useCallback((id: string, patch: Partial<DraftEntry>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    setDirty(true);
    setSavedAt(null);
  }, []);

  const addEntry = useCallback((role: DraftEntry["role"], label: string) => {
    setDrafts((prev) => [...prev, newDraft(role, label)]);
    setDirty(true);
    setSavedAt(null);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    setDirty(true);
    setSavedAt(null);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      // Client-side validation with the SAME schema the API enforces, so
      // errors are actionable before the round-trip.
      const entries = drafts.map((d) => fromDraft(d, timezone));
      const missingStart = drafts.find((d) => !d.startLocal);
      const missingLabel = drafts.find((d) => !d.label.trim());
      if (missingLabel) throw new Error("Every entry needs a name.");
      if (missingStart) throw new Error("Every entry needs a start date & time.");
      const parsed = scheduleSchema.safeParse(entries);
      if (!parsed.success) {
        throw new Error(
          parsed.error.issues[0]?.message ?? "Schedule is invalid"
        );
      }

      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedule: parsed.data.length > 0 ? parsed.data : null,
        }),
      });
      await parseApiResponse(res);
      // Settle into the order every read surface renders (chronological).
      setDrafts((prev) => sortDrafts(prev));
      setDirty(false);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  }, [drafts, timezone, eventId, getIdToken]);

  // Mirror dirty transitions to the host page (navigation guard). Effect,
  // not inline calls: `dirty` flips in five places and this keeps them in
  // lockstep with one subscription.
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasRole = (role: string) => drafts.some((d) => d.role === role);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Schedule</h2>
        <p className="text-sm text-muted-foreground">
          The single source of truth for {eventTitle || "this event"}&apos;s
          timing — invitation emails, guest passes, and event pages all read
          from it. Times are in the event&apos;s timezone ({timezone}).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {!hasRole("ceremony") && (
          <Button variant="outline" size="sm" onClick={() => addEntry("ceremony", "Ceremony")}>
            + Add ceremony
          </Button>
        )}
        {!hasRole("reception") && (
          <Button variant="outline" size="sm" onClick={() => addEntry("reception", "Reception")}>
            + Add reception
          </Button>
        )}
        {!hasRole("traditional") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => addEntry("traditional", "Traditional Ceremony")}
          >
            + Add traditional ceremony
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => addEntry("", "")}>
          + Add another moment
        </Button>
      </div>

      {drafts.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No schedule entries yet. Add a ceremony or reception to get
            started.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {drafts.map((draft) => (
          <div key={draft.id} className="space-y-4 rounded-lg border bg-surface-1 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`label-${draft.id}`}>Name</Label>
                <Input
                  id={`label-${draft.id}`}
                  value={draft.label}
                  maxLength={80}
                  placeholder="Ceremony"
                  onChange={(e) => updateDraft(draft.id, { label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`role-${draft.id}`}>Type</Label>
                <select
                  id={`role-${draft.id}`}
                  value={draft.role}
                  onChange={(e) =>
                    updateDraft(draft.id, {
                      role: e.target.value as DraftEntry["role"],
                    })
                  }
                  className={cn(
                    "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                >
                  <option value="">—</option>
                  {SCHEDULE_ENTRY_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  &quot;Ceremony&quot; and &quot;Reception&quot; drive emails
                  and guest passes; &quot;Traditional Ceremony&quot; adds its
                  own line to the invite email.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`start-${draft.id}`}>Starts</Label>
                <Input
                  id={`start-${draft.id}`}
                  type="datetime-local"
                  value={draft.startLocal}
                  onChange={(e) => updateDraft(draft.id, { startLocal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`end-${draft.id}`}>Ends (optional)</Label>
                <Input
                  id={`end-${draft.id}`}
                  type="datetime-local"
                  value={draft.endLocal}
                  onChange={(e) => updateDraft(draft.id, { endLocal: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`venue-${draft.id}`}>Venue</Label>
                <Input
                  id={`venue-${draft.id}`}
                  value={draft.venue}
                  maxLength={120}
                  placeholder="St. Mary's Cathedral"
                  onChange={(e) => updateDraft(draft.id, { venue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`address-${draft.id}`}>Address</Label>
                <Input
                  id={`address-${draft.id}`}
                  value={draft.address}
                  maxLength={200}
                  placeholder="61 York Place, Edinburgh"
                  onChange={(e) => updateDraft(draft.id, { address: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`desc-${draft.id}`}>Note (optional)</Label>
              <Textarea
                id={`desc-${draft.id}`}
                value={draft.description}
                maxLength={500}
                rows={2}
                placeholder="Cocktails from 6, dinner at 7."
                onChange={(e) => updateDraft(draft.id, { description: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => removeEntry(draft.id)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? "Saving..." : "Save schedule"}
        </Button>
        {savedAt && !dirty && (
          <span className="text-sm text-success">Saved.</span>
        )}
      </div>
    </div>
  );
}
