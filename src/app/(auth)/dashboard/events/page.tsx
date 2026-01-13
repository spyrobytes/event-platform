"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { EventList } from "@/components/features";
import { Button } from "@/components/ui/button";

type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
type EventVisibility = "PUBLIC" | "UNLISTED" | "PRIVATE";

type EventData = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  timezone: string;
  venueName?: string | null;
  city?: string | null;
  coverImageUrl?: string | null;
  status: EventStatus;
  visibility: EventVisibility;
  _count?: {
    rsvps: number;
  };
};

type EventsResponse = {
  success: true;
  data: {
    events: EventData[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
};

export default function EventsPage() {
  const { getIdToken } = useAuthContext();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const token = await getIdToken();
        if (!token) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/events", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }

        const data: EventsResponse = await response.json();
        setEvents(data.data.events);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [getIdToken]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Events</h1>
          <p className="text-muted-foreground">
            Manage and organize your events
          </p>
        </div>
        <Link href="/dashboard/events/new">
          <Button>Create Event</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading events...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <EventList
          events={events}
          emptyMessage="You haven't created any events yet. Click 'Create Event' to get started."
          getHref={(event) => `/dashboard/events/${event.id}`}
        />
      )}
    </div>
  );
}
