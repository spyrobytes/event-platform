"use client";

import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
type EventVisibility = "PUBLIC" | "UNLISTED" | "PRIVATE";

type EventCardData = {
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

type EventCardProps = {
  event: EventCardData;
  href?: string;
  showStatus?: boolean;
  className?: string;
};

const STATUS_STYLES: Record<EventStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-surface-3 text-foreground" },
  PUBLISHED: { label: "Published", className: "bg-success/20 text-success" },
  CANCELLED: { label: "Cancelled", className: "bg-destructive/20 text-destructive" },
  COMPLETED: { label: "Completed", className: "bg-surface-3 text-foreground" },
};

const VISIBILITY_ICONS: Record<EventVisibility, string> = {
  PUBLIC: "🌐",
  UNLISTED: "🔗",
  PRIVATE: "🔒",
};

function formatEventDateTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "EEE, MMM d, yyyy 'at' h:mm a");
}

export function EventCard({
  event,
  href,
  showStatus = true,
  className,
}: EventCardProps) {
  const statusConfig = STATUS_STYLES[event.status];
  const cardHref = href ?? `/dashboard/events/${event.id}`;

  const content = (
    <Card className={cn("overflow-hidden transition-shadow hover:shadow-md", className)}>
      {event.coverImageUrl && (
        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={event.coverImageUrl}
            alt={event.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        </div>
      )}
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-lg">{event.title}</CardTitle>
          {showStatus && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-1 text-xs font-medium",
                statusConfig.className
              )}
            >
              {statusConfig.label}
            </span>
          )}
        </div>
        <CardDescription>
          <span className="flex items-center gap-1">
            <span title={event.visibility}>{VISIBILITY_ICONS[event.visibility]}</span>
            <span>{formatEventDateTime(event.startAt)}</span>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {event.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {event.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {(event.venueName || event.city) && (
            <span className="flex items-center gap-1">
              <span>📍</span>
              <span>{event.venueName || event.city}</span>
            </span>
          )}
          {event._count && (
            <span className="flex items-center gap-1">
              <span>👥</span>
              <span>{event._count.rsvps} attending</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href === null) {
    return content;
  }

  return (
    <Link href={cardHref} className="block">
      {content}
    </Link>
  );
}
