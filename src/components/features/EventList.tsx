"use client";

import { EventCard } from "./EventCard";
import { cn } from "@/lib/utils";

type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
type EventVisibility = "PUBLIC" | "UNLISTED" | "PRIVATE";

type EventListData = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  startAt: Date | string;
  endAt?: Date | string | null;
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

type EventListProps = {
  events: EventListData[];
  showStatus?: boolean;
  emptyMessage?: string;
  className?: string;
  cardClassName?: string;
  /** Base path for event links. Use ":slug" or ":id" as placeholder. Default: "/events/:slug" */
  hrefPattern?: string;
};

function buildHref(event: EventListData, pattern: string): string {
  return pattern.replace(":slug", event.slug).replace(":id", event.id);
}

export function EventList({
  events,
  showStatus = true,
  emptyMessage = "No events found",
  className,
  cardClassName,
  hrefPattern = "/events/:slug",
}: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          showStatus={showStatus}
          href={buildHref(event, hrefPattern)}
          className={cardClassName}
        />
      ))}
    </div>
  );
}
