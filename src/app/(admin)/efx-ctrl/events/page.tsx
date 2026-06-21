"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { useImpersonation } from "@/components/providers/ImpersonationProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type EventItem = {
  id: string;
  title: string;
  slug: string;
  templateId: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  startAt: string | null;
  inviteCount: number;
  organizer: { id: string; email: string; name: string | null };
  createdAt: string;
};

export default function AdminEventsPage() {
  const { getIdToken } = useAuthContext();
  const { startActAs } = useImpersonation();
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<EventItem | null>(null);
  const [actAsTarget, setActAsTarget] = useState<EventItem | null>(null);
  const [actAsReason, setActAsReason] = useState("");
  const [actAsStarting, setActAsStarting] = useState(false);
  const [actAsError, setActAsError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const token = await getIdToken();
      const res = await fetch("/api/admin/events", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        setEvents(data.events);
      } else {
        setError("Failed to load events");
      }
    } catch {
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const executeUnpublish = async () => {
    if (!unpublishTarget) return;
    const eventId = unpublishTarget.id;
    setUnpublishTarget(null);

    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "unpublish" }),
      });
      if (res.ok) {
        await fetchEvents();
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error || "Failed to unpublish event");
      }
    } catch {
      setError("Failed to unpublish event");
    }
  };

  const handleStartActAs = async () => {
    if (!actAsTarget) return;
    setActAsStarting(true);
    setActAsError(null);
    try {
      await startActAs({
        targetUserId: actAsTarget.organizer.id,
        eventId: actAsTarget.id,
        reason: actAsReason.trim(),
      });
      // Land in the organizer's page editor — its fetches now carry X-Act-As.
      router.push(`/dashboard/events/${actAsTarget.id}/page-editor`);
    } catch (e) {
      setActAsError(
        e instanceof Error ? e.message : "Could not start editing on behalf.",
      );
      setActAsStarting(false);
    }
  };

  const published = events.filter((e) => e.isPublished);
  const drafts = events.filter((e) => !e.isPublished);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Event Moderation</h1>
        <p className="text-sm text-muted-foreground">
          {events.length} event{events.length !== 1 ? "s" : ""} total
          {" \u2022 "}
          {published.length} published
          {" \u2022 "}
          {drafts.length} draft{drafts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium">Title</th>
                    <th className="pb-2 pr-4 font-medium">Organizer</th>
                    <th className="pb-2 pr-4 font-medium">Template</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Invites</th>
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{event.title}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {event.organizer.email}
                      </td>
                      <td className="py-3 pr-4">
                        {event.templateId ? (
                          <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs font-mono text-foreground">
                            {event.templateId}
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground">none</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {event.isPublished ? (
                          <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Published
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">{event.inviteCount}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {event.startAt
                          ? new Date(event.startAt).toLocaleDateString()
                          : "\u2014"}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActAsTarget(event);
                              setActAsReason("");
                              setActAsError(null);
                            }}
                            className="h-7 text-xs"
                          >
                            Edit on behalf
                          </Button>
                          {event.isPublished && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUnpublishTarget(event)}
                              className="h-7 text-xs text-destructive hover:text-destructive"
                            >
                              Unpublish
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!unpublishTarget}
        onCancel={() => setUnpublishTarget(null)}
        onConfirm={executeUnpublish}
        variant="destructive"
        title="Unpublish event"
        description={`"${unpublishTarget?.title}" will no longer be visible to the public. The organizer can re-publish it later.`}
        confirmLabel="Unpublish"
      />

      {actAsTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-base">
                Edit on behalf of{" "}
                {actAsTarget.organizer.name?.trim() ||
                  actAsTarget.organizer.email}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You&apos;ll edit{" "}
                <span className="font-medium text-foreground">
                  {actAsTarget.title}
                </span>{" "}
                as the organizer (template editing only). This is recorded in the
                audit log — add a reason or support-ticket reference.
              </p>
              <textarea
                value={actAsReason}
                onChange={(e) => setActAsReason(e.target.value)}
                rows={3}
                placeholder="Reason / ticket reference"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              {actAsError && (
                <p className="text-sm text-destructive">{actAsError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActAsTarget(null);
                    setActAsReason("");
                    setActAsError(null);
                  }}
                  disabled={actAsStarting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleStartActAs}
                  disabled={actAsStarting || actAsReason.trim().length < 3}
                >
                  {actAsStarting ? "Starting…" : "Start editing"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
