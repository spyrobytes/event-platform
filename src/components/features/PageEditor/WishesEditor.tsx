"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { WishesSection } from "@/schemas/event-page";

type WishesEditorProps = {
  data: WishesSection["data"];
  onChange: (data: WishesSection["data"]) => void;
};

const PREVIEW_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6];

export function WishesEditor({ data, onChange }: WishesEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="wishes-eyebrow">Eyebrow (optional)</Label>
        <Input
          id="wishes-eyebrow"
          value={data.eyebrow || ""}
          onChange={(e) => onChange({ ...data, eyebrow: e.target.value })}
          placeholder="From our guests"
          maxLength={40}
        />
        <p className="text-xs text-muted-foreground">
          Small label rendered above the heading.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wishes-heading">Section Heading</Label>
        <Input
          id="wishes-heading"
          value={data.heading || "Wedding Wishes"}
          onChange={(e) => onChange({ ...data, heading: e.target.value })}
          placeholder="Wedding Wishes"
          maxLength={60}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="wishes-intro">Intro (optional)</Label>
        <Textarea
          id="wishes-intro"
          value={data.intro || ""}
          onChange={(e) => onChange({ ...data, intro: e.target.value })}
          placeholder="A few kind words and blessings from friends and family."
          rows={2}
          maxLength={300}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="wishes-preview-count">Preview Count</Label>
        <Select
          id="wishes-preview-count"
          value={String(data.previewCount ?? 3)}
          onChange={(e) =>
            onChange({ ...data, previewCount: Number(e.target.value) })
          }
        >
          {PREVIEW_COUNT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "wish" : "wishes"}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground">
          How many wishes appear on the main event page. The rest spill onto a
          dedicated &ldquo;all wishes&rdquo; page, similar to the gift registry.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="wishes-submissions">Accept new submissions</Label>
          <input
            id="wishes-submissions"
            type="checkbox"
            checked={data.enableSubmissions ?? true}
            onChange={(e) =>
              onChange({ ...data, enableSubmissions: e.target.checked })
            }
            className="h-4 w-4 rounded border-input"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          When on, guests see a &ldquo;Message for the couple&rdquo; field on
          the RSVP form. Turn off to display existing wishes only.
        </p>
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        Submitted messages start as <strong>pending</strong> and only appear
        publicly after you approve them. Moderation lives on the dedicated
        Wishes dashboard.
      </div>
    </div>
  );
}
