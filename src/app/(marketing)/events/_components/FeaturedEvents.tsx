import {
  DiscoveryEventCard,
  type DiscoveryEventCardData,
} from "./DiscoveryEventCard";

type FeaturedEventsProps = {
  events: DiscoveryEventCardData[];
};

export function FeaturedEvents({ events }: FeaturedEventsProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="mb-12" aria-labelledby="featured-events-heading">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2
            id="featured-events-heading"
            className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            Featured this week
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hand-picked events with the most buzz right now.
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <DiscoveryEventCard key={event.id} event={event} featured />
        ))}
      </div>
    </section>
  );
}
