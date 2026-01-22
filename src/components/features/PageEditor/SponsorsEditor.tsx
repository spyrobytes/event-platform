"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SponsorsSection, SponsorItem, SponsorTier } from "@/schemas/event-page";
import { cn } from "@/lib/utils";

type Asset = {
  id: string;
  kind: string;
  publicUrl: string | null;
  width: number | null;
  height: number | null;
  alt: string;
};

type SponsorsEditorProps = {
  data: SponsorsSection["data"];
  assets: Asset[];
  onChange: (data: SponsorsSection["data"]) => void;
  maxSponsors?: number;
};

const TIER_OPTIONS: { value: SponsorTier | ""; label: string }[] = [
  { value: "", label: "No Tier" },
  { value: "platinum", label: "Platinum" },
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "bronze", label: "Bronze" },
  { value: "partner", label: "Partner" },
];

/**
 * Editor for sponsors section
 * Allows editing section heading, description, tier display, and individual sponsor items
 */
export function SponsorsEditor({
  data,
  assets,
  onChange,
  maxSponsors = 20,
}: SponsorsEditorProps) {
  // Filter to sponsor/logo assets
  const sponsorAssets = assets.filter((a) => a.kind === "SPONSOR");

  const updateField = useCallback(
    <K extends keyof SponsorsSection["data"]>(field: K, value: SponsorsSection["data"][K]) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  const addSponsor = useCallback(() => {
    if (data.items.length >= maxSponsors) return;
    const newItem: SponsorItem = { name: "" };
    updateField("items", [...data.items, newItem]);
  }, [data.items, maxSponsors, updateField]);

  const updateSponsor = useCallback(
    (index: number, updates: Partial<SponsorItem>) => {
      const newItems = [...data.items];
      newItems[index] = { ...newItems[index], ...updates };
      updateField("items", newItems);
    },
    [data.items, updateField]
  );

  const removeSponsor = useCallback(
    (index: number) => {
      updateField("items", data.items.filter((_, i) => i !== index));
    },
    [data.items, updateField]
  );

  const moveSponsor = useCallback(
    (index: number, direction: "up" | "down") => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= data.items.length) return;

      const newItems = [...data.items];
      [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
      updateField("items", newItems);
    },
    [data.items, updateField]
  );

  return (
    <div className="space-y-6">
      {/* Section Header Fields */}
      <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
        <h4 className="text-sm font-medium">Section Settings</h4>
        <div className="space-y-2">
          <Label htmlFor="sponsors-heading">Heading</Label>
          <Input
            id="sponsors-heading"
            value={data.heading}
            onChange={(e) => updateField("heading", e.target.value)}
            placeholder="Our Sponsors"
            maxLength={80}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sponsors-description">
            Description <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="sponsors-description"
            value={data.description || ""}
            onChange={(e) => updateField("description", e.target.value || undefined)}
            placeholder="Thank you to our amazing sponsors..."
            rows={2}
            maxLength={300}
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="sponsors-show-tiers"
            checked={data.showTiers}
            onChange={(e) => updateField("showTiers", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <div>
            <Label htmlFor="sponsors-show-tiers" className="cursor-pointer">
              Group by sponsor tier
            </Label>
            <p className="text-xs text-muted-foreground">
              Display sponsors organized by tier level (Platinum, Gold, etc.)
            </p>
          </div>
        </div>
      </div>

      {/* Sponsor Items */}
      {data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sponsors added yet. Add your first sponsor below.
        </p>
      ) : (
        <div className="space-y-4">
          {data.items.map((sponsor, index) => {
            const logoAsset = sponsor.logoAssetId
              ? assets.find((a) => a.id === sponsor.logoAssetId)
              : null;

            return (
              <div
                key={index}
                className="relative rounded-lg border bg-card p-4"
              >
                {/* Item number and controls */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Sponsor {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveSponsor(index, "up")}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                      aria-label="Move up"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveSponsor(index, "down")}
                      disabled={index === data.items.length - 1}
                      className="h-8 w-8 p-0"
                      aria-label="Move down"
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSponsor(index)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      aria-label="Remove sponsor"
                    >
                      ×
                    </Button>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`sponsor-name-${index}`}>Name *</Label>
                    <Input
                      id={`sponsor-name-${index}`}
                      value={sponsor.name}
                      onChange={(e) => updateSponsor(index, { name: e.target.value })}
                      placeholder="Company Name"
                      maxLength={100}
                    />
                  </div>
                  {data.showTiers && (
                    <div className="space-y-2">
                      <Label htmlFor={`sponsor-tier-${index}`}>Tier</Label>
                      <select
                        id={`sponsor-tier-${index}`}
                        value={sponsor.tier || ""}
                        onChange={(e) =>
                          updateSponsor(index, {
                            tier: (e.target.value as SponsorTier) || undefined,
                          })
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {TIER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Website URL */}
                <div className="mt-4 space-y-2">
                  <Label htmlFor={`sponsor-website-${index}`}>
                    Website URL <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id={`sponsor-website-${index}`}
                    value={sponsor.websiteUrl || ""}
                    onChange={(e) =>
                      updateSponsor(index, { websiteUrl: e.target.value || undefined })
                    }
                    placeholder="https://sponsor-website.com"
                    type="url"
                  />
                </div>

                {/* Description */}
                <div className="mt-4 space-y-2">
                  <Label htmlFor={`sponsor-description-${index}`}>
                    Description <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id={`sponsor-description-${index}`}
                    value={sponsor.description || ""}
                    onChange={(e) =>
                      updateSponsor(index, { description: e.target.value || undefined })
                    }
                    placeholder="Brief tagline or description"
                    maxLength={200}
                  />
                </div>

                {/* Logo Selection */}
                <div className="mt-4 space-y-2">
                  <Label>Logo <span className="text-muted-foreground">(optional)</span></Label>
                  {sponsorAssets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No sponsor logos uploaded. Upload images in the media section with type &quot;Sponsor&quot;.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateSponsor(index, { logoAssetId: undefined })}
                        className={cn(
                          "flex h-16 w-24 items-center justify-center rounded-lg border-2 text-xs",
                          !sponsor.logoAssetId
                            ? "border-primary bg-primary/10"
                            : "border-muted hover:border-muted-foreground"
                        )}
                      >
                        None
                      </button>
                      {sponsorAssets.map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => updateSponsor(index, { logoAssetId: asset.id })}
                          className={cn(
                            "relative h-16 w-24 overflow-hidden rounded-lg border-2 bg-white p-1",
                            sponsor.logoAssetId === asset.id
                              ? "border-primary"
                              : "border-muted hover:border-muted-foreground"
                          )}
                        >
                          {asset.publicUrl && (
                            <img
                              src={asset.publicUrl}
                              alt={asset.alt || "Sponsor logo"}
                              className="h-full w-full object-contain p-1"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Sponsor Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addSponsor}
        disabled={data.items.length >= maxSponsors}
        className="w-full"
      >
        + Add Sponsor
        {data.items.length >= maxSponsors && ` (max ${maxSponsors})`}
      </Button>
    </div>
  );
}
