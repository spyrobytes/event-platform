"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import type { MapSection } from "@/schemas/event-page";
import {
  getOsmEmbedPreviewUrl,
  parseOptionalCoordinate,
  MAP_IFRAME_REFERRER_POLICY,
} from "@/lib/maps/map-utils";

type MapEditorProps = {
  data: MapSection["data"];
  onChange: (data: MapSection["data"]) => void;
};

/**
 * Editor for the map/location section.
 *
 * Phase 1 scope: bug fixes + utility extraction. Schema still requires lat/lng,
 * so the editor does not yet support clearing coordinates — typing-flow fixes
 * only. Phase 2 makes coordinates optional and supports clearing.
 */
export function MapEditor({ data, onChange }: MapEditorProps) {
  const updateField = useCallback(
    <K extends keyof MapSection["data"]>(field: K, value: MapSection["data"][K]) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  // Raw input strings for lat/lng so mid-keystroke values like "-" survive
  // the controlled-input round-trip. We only commit to `data` when the input
  // parses to a valid coordinate; on blur, invalid input snaps back to the
  // committed value's string form so the field never ends up out of sync.
  const [latRaw, setLatRaw] = useState(() => data.latitude.toString());
  const [lngRaw, setLngRaw] = useState(() => data.longitude.toString());

  // Slider drives a local draft for snappy thumb + label movement. Committing
  // to `data.zoom` is debounced so the preview iframe only reloads once the
  // user pauses — otherwise every tick triggers a network round-trip to OSM
  // and the slider stutters.
  const [zoomDraft, setZoomDraft] = useState(data.zoom);
  const zoomCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prop-sync: when data.* changes from outside our own commit, realign the
  // raw drafts. Our handlers advance prevData* to the committed value before
  // the parent's re-render, so an own-commit echo equals prev and the guard
  // short-circuits — the user's raw text (e.g. trailing zeros) isn't clobbered.
  const [prevDataLat, setPrevDataLat] = useState(data.latitude);
  const [prevDataLng, setPrevDataLng] = useState(data.longitude);
  const [prevDataZoom, setPrevDataZoom] = useState(data.zoom);

  if (prevDataLat !== data.latitude) {
    setPrevDataLat(data.latitude);
    setLatRaw(data.latitude.toString());
  }
  if (prevDataLng !== data.longitude) {
    setPrevDataLng(data.longitude);
    setLngRaw(data.longitude.toString());
  }
  if (prevDataZoom !== data.zoom) {
    setPrevDataZoom(data.zoom);
    setZoomDraft(data.zoom);
  }

  // Cancel any pending debounce on unmount so a late timeout doesn't fire
  // updateField → onChange on an unmounted parent.
  useEffect(() => {
    return () => {
      if (zoomCommitTimer.current) clearTimeout(zoomCommitTimer.current);
    };
  }, []);

  // Slider uses sub-integer steps so the thumb glides smoothly even though
  // the schema stores zoom as an integer. We let zoomDraft hold the float for
  // thumb position, round to integer on debounced commit, then snap the draft
  // to the rounded value so the thumb visually aligns with what was saved.
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
    if (typeof parsed === "number") {
      setPrevDataLat(parsed);
      updateField("latitude", parsed);
    }
  };

  const handleLatBlur = () => {
    const parsed = parseOptionalCoordinate(latRaw, -90, 90);
    if (typeof parsed !== "number") setLatRaw(data.latitude.toString());
  };

  const handleLngChange = (value: string) => {
    setLngRaw(value);
    const parsed = parseOptionalCoordinate(value, -180, 180);
    if (typeof parsed === "number") {
      setPrevDataLng(parsed);
      updateField("longitude", parsed);
    }
  };

  const handleLngBlur = () => {
    const parsed = parseOptionalCoordinate(lngRaw, -180, 180);
    if (typeof parsed !== "number") setLngRaw(data.longitude.toString());
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
        <div className="space-y-2">
          <Label htmlFor="map-address">Address *</Label>
          <Input
            id="map-address"
            value={data.address}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="123 Main Street, New York, NY 10001"
            maxLength={300}
          />
        </div>
      </div>

      {/* Coordinates */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium">Map Coordinates</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter the latitude and longitude of your venue. You can find these by searching your address on{" "}
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Google Maps
            </a>
            {" "}and right-clicking the location.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="map-latitude">Latitude *</Label>
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
            <Label htmlFor="map-longitude">Longitude *</Label>
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
            Higher values show more detail (street level), lower values show a wider area
          </p>
        </div>
      </div>

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
            Adds a button that opens Google Maps with directions to this location
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
            The +/− buttons in this preview are not saved. Use the zoom slider above to set what guests will see.
          </p>
        </div>
      )}

      {/* Help text */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Tip:</strong> To find coordinates, search your address on Google Maps,
          right-click the exact location, and click the coordinates to copy them.
          The first number is latitude, the second is longitude.
        </p>
      </div>
    </div>
  );
}
