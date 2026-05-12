"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type LocationCandidate = {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  provider: string;
  timezone?: string;
  addressLine1?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
};

type LocationPickerProps = {
  eventId: string;
  getIdToken: () => Promise<string | null>;
  initialQuery: string;
  onSelect: (candidate: LocationCandidate) => void;
};

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "results"; candidates: LocationCandidate[] }
  | { kind: "empty" }
  | { kind: "error"; message: string };

export function LocationPicker({
  eventId,
  getIdToken,
  initialQuery,
  onSelect,
}: LocationPickerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const handleFind = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setStatus({ kind: "error", message: "Enter at least 3 characters to search." });
      return;
    }
    setStatus({ kind: "loading" });
    try {
      const token = await getIdToken();
      if (!token) {
        setStatus({ kind: "error", message: "Sign-in expired. Please reload and try again." });
        return;
      }
      const response = await fetch(`/api/events/${eventId}/location/geocode`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: trimmed }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setStatus({
          kind: "error",
          message: body.error ?? `Geocoder error (${response.status}).`,
        });
        return;
      }
      const data = (await response.json()) as {
        data: { results: LocationCandidate[]; provider: string };
      };
      const candidates = data.data.results;
      if (candidates.length === 0) {
        setStatus({ kind: "empty" });
      } else {
        setStatus({ kind: "results", candidates });
      }
    } catch {
      setStatus({
        kind: "error",
        message: "Couldn't reach the geocoder. Check your connection and try again.",
      });
    }
  };

  const handlePick = (candidate: LocationCandidate) => {
    onSelect(candidate);
    setQuery(candidate.formattedAddress);
    setStatus({ kind: "idle" });
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="location-picker-query">Address *</Label>
      <div className="flex gap-2">
        <Input
          id="location-picker-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="123 Main Street, City, Country"
          maxLength={300}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleFind();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleFind()}
          isLoading={status.kind === "loading"}
        >
          Find location
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Type an address and click Find location. We&apos;ll suggest matches with coordinates.
      </p>

      {status.kind === "error" && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {status.message}
        </div>
      )}

      {status.kind === "empty" && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          No matches for &ldquo;{query}&rdquo;. Try a more specific address, or enter coordinates
          manually in Advanced below.
        </div>
      )}

      {status.kind === "results" && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Select a match
          </p>
          <ul className="space-y-1">
            {status.candidates.map((candidate, index) => (
              <li key={`${candidate.placeId ?? index}-${candidate.latitude}`}>
                <button
                  type="button"
                  onClick={() => handlePick(candidate)}
                  className="w-full rounded-lg border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-muted"
                >
                  <div className="font-medium">{candidate.formattedAddress}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {candidate.latitude.toFixed(4)}, {candidate.longitude.toFixed(4)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
