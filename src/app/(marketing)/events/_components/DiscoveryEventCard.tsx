import Link from "next/link";
import Image from "next/image";
import { formatInTimeZone } from "date-fns-tz";
import { cn, formatEventTime } from "@/lib/utils";
import styles from "./DiscoveryEventCard.module.css";

export type DiscoveryEventCardData = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  startAt: Date | string;
  timezone: string;
  venueName?: string | null;
  city?: string | null;
  coverImageUrl?: string | null;
  _count?: { rsvps: number };
};

type DiscoveryEventCardProps = {
  event: DiscoveryEventCardData;
  featured?: boolean;
  className?: string;
};

export function DiscoveryEventCard({
  event,
  featured = false,
  className,
}: DiscoveryEventCardProps) {
  // All three fragments must render in the venue's timezone — Vercel runs in
  // UTC, so a NY wedding starting at 7 PM Eastern would otherwise show as
  // midnight on the next day.
  const month = formatInTimeZone(event.startAt, event.timezone, "MMM").toUpperCase();
  const day = formatInTimeZone(event.startAt, event.timezone, "d");
  const time = formatEventTime(event.startAt, event.timezone);

  const location = event.venueName ?? event.city ?? null;
  const attendees = event._count?.rsvps ?? 0;

  return (
    <Link
      href={`/events/${event.slug}`}
      className={cn(
        styles.card,
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-surface-2 transition-all duration-200 hover:-translate-y-0.5",
        className
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-3">
        {event.coverImageUrl ? (
          <Image
            src={event.coverImageUrl}
            alt={event.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className={cn(
              styles.placeholder,
              "absolute inset-0 flex items-center justify-center"
            )}
            aria-hidden="true"
          >
            <span className="text-4xl font-black tracking-tight text-foreground/30">
              {event.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className={styles.coverGradient} aria-hidden="true" />

        <div
          className="absolute left-3 top-3 flex flex-col items-center justify-center rounded-xl bg-background/90 px-2.5 py-1.5 text-center shadow-md backdrop-blur-sm"
          aria-hidden="true"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            {month}
          </span>
          <span className="text-lg font-bold leading-none text-foreground">
            {day}
          </span>
        </div>

        {featured && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground shadow-md">
            <svg
              className="h-3 w-3"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.18 22 12 17.27 5.82 22l2.36-8.15L2 9.36h7.61z" />
            </svg>
            Featured
          </span>
        )}

        {event.city && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
            <svg
              className="h-3 w-3 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
              />
            </svg>
            {event.city}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="line-clamp-2 text-base font-semibold text-foreground transition-colors group-hover:text-accent">
          {event.title}
        </h3>

        <p className="text-xs text-muted-foreground">
          {time}
          {location ? ` · ${location}` : ""}
        </p>

        {event.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {event.description}
          </p>
        )}

        {attendees > 0 && (
          <p className="mt-auto pt-2 text-xs font-medium text-muted-foreground">
            {attendees} {attendees === 1 ? "person" : "people"} attending
          </p>
        )}
      </div>
    </Link>
  );
}
