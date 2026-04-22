import Link from "next/link";
import {
  DiscoveryEventCard,
  type DiscoveryEventCardData,
} from "./DiscoveryEventCard";
import styles from "./DiscoveryEventList.module.css";

type DiscoveryEventListProps = {
  events: DiscoveryEventCardData[];
  hasActiveFilters: boolean;
};

function EmptyState({ hasActiveFilters }: { hasActiveFilters: boolean }) {
  return (
    <div
      className={`${styles.empty} relative overflow-hidden rounded-2xl border border-border/60 px-6 py-12 text-center sm:px-10 sm:py-16`}
    >
      <div className="relative mx-auto max-w-md">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-foreground">
          {hasActiveFilters
            ? "No events match these filters"
            : "No upcoming events yet"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {hasActiveFilters
            ? "Try widening your search or clearing some filters to see more events."
            : "Be the first to bring people together — host an event in minutes."}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {hasActiveFilters && (
            <Link
              href="/events"
              className="inline-flex h-10 items-center rounded-full border border-border bg-surface-2 px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface-3"
            >
              Clear filters
            </Link>
          )}
          <Link
            href="/signup"
            className="inline-flex h-10 items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            Host your event
          </Link>
        </div>
      </div>
    </div>
  );
}

export function DiscoveryEventList({
  events,
  hasActiveFilters,
}: DiscoveryEventListProps) {
  if (events.length === 0) {
    return <EmptyState hasActiveFilters={hasActiveFilters} />;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {events.map((event) => (
        <DiscoveryEventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
