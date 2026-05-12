"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import type { MapSection } from "@/schemas/event-page";
import {
  getDisplayAddress,
  getOsmEmbedPreviewUrl,
  parseOptionalCoordinate,
  MAP_IFRAME_REFERRER_POLICY,
} from "@/lib/maps/map-utils";
import {
  LocationPicker,
  type LocationCandidate,
} from "./LocationPicker";

type MapEditorProps = {
  data: MapSection["data"];
  onChange: (data: MapSection["data"]) => void;
  eventId: string;
  getIdToken: () => Promise<string | null>;
};

// Coerces the geocoder's provider string into the schema's narrower union.
// The "none" provider only appears when GEOCODER_PROVIDER is unset, which
// returns an empty candidate list — so this branch never runs in practice.
function coerceProvider(provider: string): MapSection["data"]["provider"] {
  if (provider === "locationiq" || provider === "mapbox" || provider === "osm") {
    return provider;
  }
  return undefined;
}

// Phase 2: address + coordinates are optional in the schema. The editor lets
// users save drafts with any subset filled in. The publish path
// (validateMapSectionForPublish) enforces the complete-data requirement.
export function MapEditor({ data, onChange, eventId, getIdToken }: MapEditorProps) {
  const updateField = useCallback(
    <K extends keyof MapSection["data"]>(field: K, value: MapSection["data"][K]) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  const initialAddress = getDisplayAddress(data) ?? "";

  // Raw input strings let mid-keystroke values like "-" survive the
  // controlled-input round-trip; invalid input never commits to data.
  const [latRaw, setLatRaw] = useState(() => data.latitude?.toString() ?? "");
  const [lngRaw, setLngRaw] = useState(() => data.longitude?.toString() ?? "");

  // Float draft so the thumb glides; debounced commit rounds to integer.
  const [zoomDraft, setZoomDraft] = useState(data.zoom);
  const zoomCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prop-sync: realign raw drafts when data.* changes from outside our own
  // commit (Phase 2 prefill, Phase 3 geocode confirmation). Handlers advance
  // prevData* to the committed value before the parent re-renders, so an
  // own-commit echo equals prev and the guard short-circuits.
  const [prevDataLat, setPrevDataLat] = useState(data.latitude);
  const [prevDataLng, setPrevDataLng] = useState(data.longitude);
  const [prevDataZoom, setPrevDataZoom] = useState(data.zoom);

  if (prevDataLat !== data.latitude) {
    setPrevDataLat(data.latitude);
    setLatRaw(data.latitude?.toString() ?? "");
  }
  if (prevDataLng !== data.longitude) {
    setPrevDataLng(data.longitude);
    setLngRaw(data.longitude?.toString() ?? "");
  }
  if (prevDataZoom !== data.zoom) {
    setPrevDataZoom(data.zoom);
    setZoomDraft(data.zoom);
  }

  useEffect(() => {
    return () => {
      if (zoomCommitTimer.current) clearTimeout(zoomCommitTimer.current);
    };
  }, []);

  const handleZoomChange = (value: number) => {
    if (!Number.isFinite(value)) return;
    setZoomDraft(value);
    if (zoomCommitTimer.current) clearTimeout(zoomCommitTimer.current);
    zoomCommitTimer.current = setTimeout(() => {
      const rounded = Math.round(value);
      setZoomDraft(rounded);
      setPrevDataZoom(rounded);
      updateField("zoom", rounded);
    }, 200);
  };

  const handleLatChange = (value: string) => {
    setLatRaw(value);
    const parsed = parseOptionalCoordinate(value, -90, 90);
    if (parsed === null) return;
    setPrevDataLat(parsed);
    updateField("latitude", parsed);
  };

  const handleLatBlur = () => {
    const parsed = parseOptionalCoordinate(latRaw, -90, 90);
    if (parsed === null) setLatRaw(data.latitude?.toString() ?? "");
  };

  const handleLngChange = (value: string) => {
    setLngRaw(value);
    const parsed = parseOptionalCoordinate(value, -180, 180);
    if (parsed === null) return;
    setPrevDataLng(parsed);
    updateField("longitude", parsed);
  };

  const handleLngBlur = () => {
    const parsed = parseOptionalCoordinate(lngRaw, -180, 180);
    if (parsed === null) setLngRaw(data.longitude?.toString() ?? "");
  };

  const previewMapUrl = getOsmEmbedPreviewUrl(data);

  return (
    <div className="space-y-6">
      {/* Section Settings */}
      <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
        <h4 className="text-sm font-medium">Section Settings</h4>
        <div className="space-y-2">
          <Label htmlFor="map-heading">Heading</Label>
          <Input
            id="map-heading"
            value={data.heading}
            onChange={(e) => updateField("heading", e.target.value)}
            placeholder="Location"
            maxLength={80}
          />
        </div>
      </div>

      {/* Venue Information */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Venue Information</h4>
        <div className="space-y-2">
          <Label htmlFor="map-venue-name">
            Venue Name <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="map-venue-name"
            value={data.venueName ?? ""}
            onChange={(e) => updateField("venueName", e.target.value || undefined)}
            placeholder="Grand Ballroom, The Ritz Hotel"
            maxLength={100}
          />
        </div>
        <LocationPicker
          eventId={eventId}
          getIdToken={getIdToken}
          initialQuery={initialAddress}
          onSelect={(candidate: LocationCandidate) => {
            onChange({
              ...data,
              formattedAddress: candidate.formattedAddress,
              latitude: candidate.latitude,
              longitude: candidate.longitude,
              placeId: candidate.placeId,
              provider: coerceProvider(candidate.provider),
              timezone: candidate.timezone,
              addressLine1: candidate.addressLine1,
              city: candidate.city,
              region: candidate.region,
              postalCode: candidate.postalCode,
              country: candidate.country,
            });
          }}
        />
      </div>

      {/* Guest-facing notes (optional) */}
      <details className="rounded-lg border bg-muted/30 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Guest notes <span className="text-muted-foreground">(optional)</span>
        </summary>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="map-parking">Parking</Label>
            <Textarea
              id="map-parking"
              value={data.parkingNote ?? ""}
              onChange={(e) => updateField("parkingNote", e.target.value || undefined)}
              placeholder="Valet available at the main entrance; street parking after 6pm."
              maxLength={300}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="map-entrance">Entrance</Label>
            <Textarea
              id="map-entrance"
              value={data.entranceNote ?? ""}
              onChange={(e) => updateField("entranceNote", e.target.value || undefined)}
              placeholder="Enter through the side garden gate, marked with white florals."
              maxLength={300}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="map-accessibility">Accessibility</Label>
            <Textarea
              id="map-accessibility"
              value={data.accessibilityNote ?? ""}
              onChange={(e) => updateField("accessibilityNote", e.target.value || undefined)}
              placeholder="Step-free access via the rear entrance; elevator to the reception floor."
              maxLength={300}
              rows={2}
            />
          </div>
        </div>
      </details>

      {/* Advanced: manual coordinates + zoom */}
      <details className="rounded-lg border bg-muted/30 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Advanced <span className="text-muted-foreground">(coordinates &amp; zoom)</span>
        </summary>
        <div className="mt-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Find coordinates by searching your address on{" "}
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Google Maps
            </a>
            {" "}and right-clicking the location. Leave blank to save a draft without coordinates.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="map-latitude">Latitude</Label>
              <Input
                id="map-latitude"
                type="text"
                inputMode="decimal"
                value={latRaw}
                onChange={(e) => handleLatChange(e.target.value)}
                onBlur={handleLatBlur}
                placeholder="40.7128"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="map-longitude">Longitude</Label>
              <Input
                id="map-longitude"
                type="text"
                inputMode="decimal"
                value={lngRaw}
                onChange={(e) => handleLngChange(e.target.value)}
                onBlur={handleLngBlur}
                placeholder="-74.0060"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="map-zoom">Zoom Level</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="map-zoom"
                min={10}
                max={18}
                step={0.5}
                value={zoomDraft}
                onChange={(e) => handleZoomChange(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-8 text-center text-sm text-muted-foreground">
                {Math.round(zoomDraft)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Higher values show more detail (street level), lower values show a wider area.
            </p>
          </div>
        </div>
      </details>

      {/* Options */}
      <div className="flex items-center gap-3">
        <Checkbox
          id="map-show-directions"
          checked={data.showDirectionsLink}
          onChange={(e) => updateField("showDirectionsLink", e.target.checked)}
        />
        <div>
          <Label htmlFor="map-show-directions" className="cursor-pointer">
            Show &quot;Get Directions&quot; button
          </Label>
          <p className="text-xs text-muted-foreground">
            Adds a button that opens Google Maps with directions to this location.
          </p>
        </div>
      </div>

      {/* Map Preview */}
      {previewMapUrl && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Preview</h4>
          <div className="aspect-video w-full overflow-hidden rounded-lg border">
            <iframe
              src={previewMapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy={MAP_IFRAME_REFERRER_POLICY}
              title="Map preview"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The +/− buttons in this preview are not saved. Use the zoom slider in Advanced to set what guests will see.
          </p>
        </div>
      )}
    </div>
  );
}
