import Link from "next/link";
import { cn } from "@/lib/utils";
import { DATE_RANGE_OPTIONS, type DateRange } from "./date-range";
import styles from "./DiscoveryHero.module.css";

type City = { name: string; count: number };

type DiscoveryHeroProps = {
  query?: string;
  selectedCity?: string;
  selectedRange?: DateRange;
  cities: City[];
};

function buildDiscoveryHref(params: {
  q?: string;
  city?: string;
  when?: DateRange;
}): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.city) search.set("city", params.city);
  if (params.when) search.set("when", params.when);
  const qs = search.toString();
  return qs ? `/events?${qs}` : "/events";
}

export function DiscoveryHero({
  query,
  selectedCity,
  selectedRange,
  cities,
}: DiscoveryHeroProps) {
  const topCities = cities.slice(0, 6);

  return (
    <section className={cn(styles.hero, "relative overflow-hidden")}>
      <div className="relative mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
          Discover
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Find your next event.
          <span className="mt-2 block text-2xl font-semibold text-muted-foreground sm:text-3xl">
            Without the chaos.
          </span>
        </h1>

        <form
          action="/events"
          method="get"
          className="mx-auto mt-10 flex w-full max-w-xl items-center gap-2 rounded-full border border-border bg-surface-2/80 p-1.5 shadow-lg backdrop-blur-sm"
          role="search"
        >
          <label htmlFor="discovery-search" className="sr-only">
            Search events
          </label>
          <svg
            className="ml-3 h-5 w-5 flex-shrink-0 text-muted-foreground"
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
          <input
            id="discovery-search"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search events by name, venue, or city"
            className="flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {selectedCity && (
            <input type="hidden" name="city" value={selectedCity} />
          )}
          {selectedRange && (
            <input type="hidden" name="when" value={selectedRange} />
          )}
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Search
          </button>
        </form>

        <div
          className="mt-8 flex flex-wrap items-center justify-center gap-2"
          role="group"
          aria-label="Filter by date"
        >
          <Link
            href={buildDiscoveryHref({ q: query, city: selectedCity })}
            aria-current={!selectedRange ? "true" : undefined}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              !selectedRange
                ? "bg-accent text-accent-foreground"
                : "border border-border bg-surface-2/60 text-muted-foreground hover:border-accent/40 hover:text-foreground"
            )}
          >
            Anytime
          </Link>
          {DATE_RANGE_OPTIONS.map((option) => {
            const isActive = selectedRange === option.value;
            return (
              <Link
                key={option.value}
                href={buildDiscoveryHref({
                  q: query,
                  city: selectedCity,
                  when: option.value,
                })}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "border border-border bg-surface-2/60 text-muted-foreground hover:border-accent/40 hover:text-foreground"
                )}
              >
                {option.label}
              </Link>
            );
          })}
        </div>

        {topCities.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Popular cities
            </span>
            {topCities.map((city) => {
              const isActive = selectedCity === city.name;
              return (
                <Link
                  key={city.name}
                  href={buildDiscoveryHref({
                    q: query,
                    city: isActive ? undefined : city.name,
                    when: selectedRange,
                  })}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "border border-border/70 bg-surface-2/40 text-muted-foreground hover:border-accent/40 hover:text-foreground"
                  )}
                >
                  <span>{city.name}</span>
                  <span
                    className={cn(
                      "text-[10px] tabular-nums",
                      isActive
                        ? "text-accent-foreground/70"
                        : "text-muted-foreground/60"
                    )}
                  >
                    {city.count}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
