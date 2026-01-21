"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MapSection } from "@/schemas/event-page";

type MapEditorProps = {
  data: MapSection["data"];
  onChange: (data: MapSection["data"]) => void;
};

/**
 * Editor for map/location section
 * Allows configuring venue details and map coordinates
 */
export function MapEditor({ data, onChange }: MapEditorProps) {
  const updateField = useCallback(
    <K extends keyof MapSection["data"]>(field: K, value: MapSection["data"][K]) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  // Preview map URL
  const previewMapUrl = data.latitude && data.longitude
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${data.longitude - 0.01},${data.latitude - 0.01},${data.longitude + 0.01},${data.latitude + 0.01}&layer=mapnik&marker=${data.latitude},${data.longitude}`
    : null;

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
            value={data.venueName || ""}
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
              type="number"
              step="any"
              value={data.latitude || ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= -90 && val <= 90) {
                  updateField("latitude", val);
                }
              }}
              placeholder="40.7128"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="map-longitude">Longitude *</Label>
            <Input
              id="map-longitude"
              type="number"
              step="any"
              value={data.longitude || ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= -180 && val <= 180) {
                  updateField("longitude", val);
                }
              }}
              placeholder="-74.0060"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="map-zoom">Zoom Level</Label>
          <div className="flex items-center gap-4">
            <input
              id="map-zoom"
              type="range"
              min={10}
              max={18}
              value={data.zoom}
              onChange={(e) => updateField("zoom", parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="w-8 text-center text-sm text-muted-foreground">
              {data.zoom}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Higher values show more detail (street level), lower values show a wider area
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="map-show-directions"
          checked={data.showDirectionsLink}
          onChange={(e) => updateField("showDirectionsLink", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
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
              title="Map preview"
            />
          </div>
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
