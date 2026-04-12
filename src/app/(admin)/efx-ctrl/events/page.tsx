"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleUnpublish = async (eventId: string) => {
    if (!confirm("Unpublish this event? It will no longer be visible to the public.")) return;

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
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {event.templateId || "none"}
                        </code>
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
                          : "—"}
                      </td>
                      <td className="py-3">
                        {event.isPublished && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnpublish(event.id)}
                            className="h-7 text-xs text-destructive hover:text-destructive"
                          >
                            Unpublish
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
