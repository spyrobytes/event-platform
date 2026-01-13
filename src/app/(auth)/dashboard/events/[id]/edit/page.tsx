"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { EventForm } from "@/components/forms";
import { Button } from "@/components/ui/button";
import type { CreateEventInput } from "@/schemas/event";

type EventDetail = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  timezone: string;
  venueName?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  coverImageUrl?: string | null;
  status: string;
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  maxAttendees?: number | null;
};

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getIdToken } = useAuthContext();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const token = await getIdToken();
        if (!token) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/events/${params.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Event not found");
          }
          throw new Error("Failed to fetch event");
        }

        const data = await response.json();
        setEvent(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [params.id, getIdToken]);

  const handleSubmit = async (data: CreateEventInput): Promise<void> => {
    if (!event) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update event");
      }

      router.push(`/dashboard/events/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update event");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/events/${params.id}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="space-y-4">
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10">
          <p className="text-sm text-destructive">{error || "Event not found"}</p>
        </div>
        <Link href="/dashboard/events">
          <Button variant="outline">Back to Events</Button>
        </Link>
      </div>
    );
  }

  const defaultValues: Partial<CreateEventInput> = {
    title: event.title,
    description: event.description ?? undefined,
    startAt: new Date(event.startAt),
    endAt: event.endAt ? new Date(event.endAt) : undefined,
    timezone: event.timezone,
    venueName: event.venueName ?? undefined,
    address: event.address ?? undefined,
    city: event.city ?? undefined,
    country: event.country ?? undefined,
    visibility: event.visibility,
    maxAttendees: event.maxAttendees ?? undefined,
    coverImageUrl: event.coverImageUrl ?? undefined,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Event</h1>
        <p className="text-muted-foreground">
          Update the details of your event
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <EventForm
        mode="edit"
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isSubmitting}
      />
    </div>
  );
}
