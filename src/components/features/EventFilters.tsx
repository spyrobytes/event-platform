"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type City = {
  name: string;
  count: number;
};

type EventFiltersProps = {
  cities: City[];
  selectedCity?: string;
};

export function EventFilters({ cities, selectedCity }: EventFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Filter by City</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          <li>
            <Link
              href="/events"
              className={cn(
                "block rounded-md px-3 py-2 text-sm transition-colors",
                !selectedCity
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              All Cities
            </Link>
          </li>
          {cities.map((city) => (
            <li key={city.name}>
              <Link
                href={`/events?city=${encodeURIComponent(city.name)}`}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                  selectedCity === city.name
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{city.name}</span>
                <span
                  className={cn(
                    "text-xs",
                    selectedCity === city.name
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {city.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {cities.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No cities with upcoming events
          </p>
        )}
      </CardContent>
    </Card>
  );
}
