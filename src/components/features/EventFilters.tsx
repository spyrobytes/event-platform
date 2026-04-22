import Link from "next/link";
import { cn } from "@/lib/utils";

type City = {
  name: string;
  count: number;
};

type EventFiltersProps = {
  cities: City[];
  selectedCity?: string;
  /** Search query to preserve when changing city */
  query?: string;
  /** Date range to preserve when changing city */
  selectedRange?: string;
};

function buildHref(params: {
  city?: string;
  q?: string;
  when?: string;
}): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.city) search.set("city", params.city);
  if (params.when) search.set("when", params.when);
  const qs = search.toString();
  return qs ? `/events?${qs}` : "/events";
}

export function EventFilters({
  cities,
  selectedCity,
  query,
  selectedRange,
}: EventFiltersProps) {
  const hasActiveFilters = Boolean(selectedCity || query || selectedRange);

  return (
    <div className="rounded-2xl border border-border/60 bg-surface-2/70 p-5 shadow-sm backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Cities
        </h2>
        {hasActiveFilters && (
          <Link
            href="/events"
            className="text-xs font-medium text-accent hover:underline"
          >
            Clear all
          </Link>
        )}
      </div>

      <ul className="space-y-1">
        <li>
          <Link
            href={buildHref({ q: query, when: selectedRange })}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm transition-colors",
              !selectedCity
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
            )}
          >
            All cities
          </Link>
        </li>
        {cities.map((city) => {
          const isActive = selectedCity === city.name;
          return (
            <li key={city.name}>
              <Link
                href={buildHref({
                  city: city.name,
                  q: query,
                  when: selectedRange,
                })}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                )}
              >
                <span className="truncate">{city.name}</span>
                <span
                  className={cn(
                    "ml-2 shrink-0 text-xs tabular-nums",
                    isActive
                      ? "text-accent-foreground/80"
                      : "text-muted-foreground/70"
                  )}
                >
                  {city.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {cities.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No cities with upcoming events
        </p>
      )}
    </div>
  );
}
