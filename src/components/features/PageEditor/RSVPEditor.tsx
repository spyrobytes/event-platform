"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RSVPSection } from "@/schemas/event-page";

type RSVPData = RSVPSection["data"];

type RSVPEditorProps = {
  data: RSVPData;
  onChange: (data: RSVPData) => void;
};

/**
 * Editor for RSVP section settings
 */
export function RSVPEditor({ data, onChange }: RSVPEditorProps) {
  const updateField = useCallback(
    <K extends keyof RSVPData>(field: K, value: RSVPData[K]) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="space-y-2">
        <Label htmlFor="rsvp-heading">Section Heading</Label>
        <Input
          id="rsvp-heading"
          value={data.heading || ""}
          onChange={(e) => updateField("heading", e.target.value)}
          placeholder="RSVP"
          maxLength={80}
        />
        <p className="text-xs text-muted-foreground">
          The title displayed above the RSVP form
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="rsvp-description">Description (optional)</Label>
        <Textarea
          id="rsvp-description"
          value={data.description || ""}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Let us know if you can make it!"
          rows={2}
          maxLength={300}
        />
        <p className="text-xs text-muted-foreground">
          Optional text shown below the heading
        </p>
      </div>

      {/* Show Maybe Option */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="rsvp-show-maybe"
          checked={data.showMaybeOption !== false}
          onChange={(e) => updateField("showMaybeOption", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <div>
          <Label htmlFor="rsvp-show-maybe" className="cursor-pointer">
            Show &quot;Maybe&quot; option
          </Label>
          <p className="text-xs text-muted-foreground">
            Allow guests to respond with &quot;Maybe&quot; in addition to Yes/No
          </p>
        </div>
      </div>

      {/* Allow Plus Ones */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="rsvp-allow-plus-ones"
            checked={data.allowPlusOnes === true}
            onChange={(e) => {
              updateField("allowPlusOnes", e.target.checked);
              if (!e.target.checked) {
                updateField("maxPlusOnes", 0);
              } else if (!data.maxPlusOnes) {
                updateField("maxPlusOnes", 1);
              }
            }}
            className="h-4 w-4 rounded border-gray-300"
          />
          <div>
            <Label htmlFor="rsvp-allow-plus-ones" className="cursor-pointer">
              Allow plus ones
            </Label>
            <p className="text-xs text-muted-foreground">
              Let guests bring additional attendees
            </p>
          </div>
        </div>

        {data.allowPlusOnes && (
          <div className="ml-7 space-y-2">
            <Label htmlFor="rsvp-max-plus-ones">Maximum additional guests</Label>
            <Input
              id="rsvp-max-plus-ones"
              type="number"
              min={1}
              max={10}
              value={data.maxPlusOnes || 1}
              onChange={(e) =>
                updateField("maxPlusOnes", parseInt(e.target.value) || 1)
              }
              className="w-24"
            />
          </div>
        )}
      </div>

      {/* Success Message */}
      <div className="space-y-2">
        <Label htmlFor="rsvp-success-message">Success Message (optional)</Label>
        <Textarea
          id="rsvp-success-message"
          value={data.successMessage || ""}
          onChange={(e) => updateField("successMessage", e.target.value)}
          placeholder="Thank you for your response! We look forward to seeing you."
          rows={2}
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          Message shown after successful RSVP submission
        </p>
      </div>

      {/* Info box */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> The RSVP form will only appear on the public event page
          when the event is published. Guests can submit their response directly on your
          event page.
        </p>
      </div>
    </div>
  );
}
