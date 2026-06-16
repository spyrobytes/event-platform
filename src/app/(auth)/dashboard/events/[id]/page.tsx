"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EventImage } from "@/components/media/EventImage";
import { useRouter, useParams } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { formatEventDateTimeLong } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsSnapshot, RSVPFunnel, VelocityChart } from "@/components/features/Analytics";
import { RSVPDeadlineInfo, SlugEditor } from "@/components/features";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { isPostEventGalleryEnabledClient } from "@/lib/gallery-feature-flag";

type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
type EventVisibility = "PUBLIC" | "UNLISTED" | "PRIVATE";

type EventDetail = {
  id: string;
  title: string;
  slug: string;
  slugLockedAt?: string | null;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  timezone: string;
  venueName?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  coverImageUrl?: string | null;
  coverMediaAsset?: { renditionWidths: number[] } | null;
  status: EventStatus;
  visibility: EventVisibility;
  maxAttendees?: number | null;
  rsvpDeadline?: string | null;
  reminderEnabled?: boolean;
  reminderDays?: number | null;
  creator: {
    id: string;
    name?: string | null;
    email: string;
  };
  _count: {
    invites: number;
    rsvps: number;
  };
};

const STATUS_CONFIG: Record<EventStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-surface-3 text-foreground" },
  PUBLISHED: { label: "Published", className: "bg-success/20 text-success" },
  CANCELLED: { label: "Cancelled", className: "bg-destructive/20 text-destructive" },
  COMPLETED: { label: "Completed", className: "bg-surface-3 text-foreground" },
};

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getIdToken } = useAuthContext();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [pendingWishes, setPendingWishes] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Pending-wishes count is best-effort: it powers the badge on the Wishes
  // nav button. A fetch failure (e.g. the event has no wishes section) just
  // leaves the badge hidden — never blocks page render.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        // limit=1 keeps the response small — the badge only needs counts,
        // not message bodies.
        const res = await fetch(
          `/api/events/${params.id}/wishes?status=PENDING&limit=1`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPendingWishes(data.data.counts.pending ?? 0);
      } catch {
        // Silent — badge just won't render
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, getIdToken]);

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

  const handlePublish = async () => {
    if (!event || isPublishing) return;

    setIsPublishing(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/events/${event.id}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to publish event");
      }

      const result = await response.json();
      setEvent((prev) => prev ? { ...prev, status: result.data.status } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish event");
    } finally {
      setIsPublishing(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!event || isDeleting) return;

    setIsDeleting(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete event");
      }

      router.push("/dashboard/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!event || isDuplicating) return;

    setIsDuplicating(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/events/${event.id}/duplicate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to duplicate event");
      }

      const result = await response.json();
      router.push(`/dashboard/events/${result.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate event");
      setIsDuplicating(false);
    }
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

  const statusConfig = STATUS_CONFIG[event.status];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
          </div>
          <p className="text-muted-foreground">
            Created by {event.creator.name || event.creator.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {event.status === "DRAFT" && (
            <Button onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          )}
          <Link href={`/dashboard/events/${event.id}/page-preview`}>
            <Button variant="outline">Page</Button>
          </Link>
          <Link href={`/dashboard/events/${event.id}/invitation`}>
            <Button variant="outline">Invitation</Button>
          </Link>
          <Link href={`/dashboard/events/${event.id}/invites`}>
            <Button variant="outline">Invites</Button>
          </Link>
          <Link href={`/dashboard/events/${event.id}/registry`}>
            <Button variant="outline">Registry</Button>
          </Link>
          <Link href={`/dashboard/events/${event.id}/wishes`}>
            <Button variant="outline" className="relative">
              Wishes
              {pendingWishes > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-foreground">
                  {pendingWishes}
                </span>
              )}
            </Button>
          </Link>
          {isPostEventGalleryEnabledClient() && (
            <Link href={`/dashboard/events/${event.id}/gallery`}>
              <Button variant="outline">Album</Button>
            </Link>
          )}
          <Link href={`/dashboard/events/${event.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          <Button variant="outline" onClick={handleDuplicate} disabled={isDuplicating}>
            {isDuplicating ? "Duplicating..." : "Duplicate"}
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          handleDelete();
        }}
        title="Delete Event"
        description={`Are you sure you want to delete "${event.title}"? This will permanently remove the event, all invites, RSVPs, and associated data. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
      />

      {event.coverImageUrl && (
        <div className="relative aspect-video max-h-[400px] overflow-hidden rounded-lg">
          <EventImage
            src={event.coverImageUrl}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-contain"
            priority
            renditionWidths={event.coverMediaAsset?.renditionWidths}
          />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.description && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                <p className="mt-1 whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Visibility</h4>
              <p className="mt-1">{event.visibility}</p>
            </div>
            {event.maxAttendees && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Capacity</h4>
                <p className="mt-1">{event.maxAttendees} attendees max</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>RSVP Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RSVPDeadlineInfo deadline={event.rsvpDeadline} />
            {event.reminderEnabled && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Auto Reminders</h4>
                <p className="mt-1 text-sm">
                  Enabled - every {event.reminderDays} day{event.reminderDays !== 1 ? "s" : ""} for non-responders
                </p>
              </div>
            )}
            {!event.reminderEnabled && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Auto Reminders</h4>
                <p className="mt-1 text-sm text-muted-foreground">Disabled</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Date & Time</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Start</h4>
              <p className="mt-1">{formatEventDateTimeLong(event.startAt, event.timezone)}</p>
            </div>
            {event.endAt && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">End</h4>
                <p className="mt-1">{formatEventDateTimeLong(event.endAt, event.timezone)}</p>
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Timezone</h4>
              <p className="mt-1">{event.timezone}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.venueName && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Venue</h4>
                <p className="mt-1">{event.venueName}</p>
              </div>
            )}
            {event.address && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Address</h4>
                <p className="mt-1">{event.address}</p>
              </div>
            )}
            {(event.city || event.country) && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">City/Country</h4>
                <p className="mt-1">
                  {[event.city, event.country].filter(Boolean).join(", ")}
                </p>
              </div>
            )}
            {!event.venueName && !event.address && !event.city && (
              <p className="text-sm text-muted-foreground">No location specified</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Public URL</CardTitle>
          </CardHeader>
          <CardContent>
            <SlugEditor
              eventId={event.id}
              currentSlug={event.slug}
              lockedAt={event.slugLockedAt ?? null}
              getIdToken={getIdToken}
              onRenamed={(newSlug) =>
                setEvent((prev) => (prev ? { ...prev, slug: newSlug } : null))
              }
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <AnalyticsSnapshot eventId={event.id} />
          </CardContent>
        </Card>
      </div>

      {/* RSVP Funnel Section */}
      <Card>
        <CardContent className="pt-6">
          <RSVPFunnel eventId={event.id} />
        </CardContent>
      </Card>

      {/* Response Velocity Section */}
      <Card>
        <CardContent className="pt-6">
          <VelocityChart eventId={event.id} />
        </CardContent>
      </Card>

      <div className="flex justify-start">
        <Link href="/dashboard/events">
          <Button variant="outline">Back to Events</Button>
        </Link>
      </div>
    </div>
  );
}
