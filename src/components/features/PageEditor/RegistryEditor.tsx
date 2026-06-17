"use client";

import { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RegistrySection } from "@/schemas/event-page";

const MAX_ITEMS = 24;

type RegistryItem = RegistrySection["data"]["items"][number];
type RegistryItemType = NonNullable<RegistryItem["type"]>;

type RegistryEditorProps = {
  data: RegistrySection["data"];
  assets: Array<{
    id: string;
    kind: string;
    tags: string[];
    publicUrl: string | null;
  }>;
  onChange: (data: RegistrySection["data"]) => void;
};

export function RegistryEditor({ data, assets, onChange }: RegistryEditorProps) {
  const items = useMemo(() => data.items || [], [data.items]);
  // Logos = brand marks (Amazon, Crate & Barrel). Gift photos live under the
  // dedicated "gift" tag so gallery/portrait images don't leak into this picker.
  const logoAssets = useMemo(
    () => assets.filter((a) => a.tags.includes("logo")),
    [assets]
  );
  const imageAssets = useMemo(
    () => assets.filter((a) => a.tags.includes("gift")),
    [assets]
  );

  // Category suggestions surface recurring values the organizer has already
  // used; also seed with common wedding-registry buckets so an empty registry
  // still offers a useful starting list.
  const categorySuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            "Kitchen",
            "Home",
            "Bedroom",
            "Outdoor",
            "Experiences",
            "Honeymoon",
            "Charity",
            ...items.map((i) => i.category).filter((c): c is string => !!c),
          ].map((c) => c.trim())
        )
      ),
    [items]
  );

  const addItem = useCallback(() => {
    if (items.length >= MAX_ITEMS) return;
    onChange({
      ...data,
      items: [
        ...items,
        { id: crypto.randomUUID(), type: "link", name: "", quantity: 1 },
      ],
    });
  }, [data, items, onChange]);

  const updateItem = useCallback(
    (index: number, updates: Partial<RegistryItem>) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], ...updates };
      onChange({ ...data, items: newItems });
    },
    [data, items, onChange]
  );

  const removeItem = useCallback(
    (index: number) => {
      onChange({
        ...data,
        items: items.filter((_, i) => i !== index),
      });
    },
    [data, items, onChange]
  );

  const setFeatured = useCallback(
    (index: number, checked: boolean) => {
      if (checked) {
        const newItems = items.map((it, i) => ({
          ...it,
          featured: i === index ? true : undefined,
        }));
        onChange({ ...data, items: newItems });
      } else {
        updateItem(index, { featured: undefined });
      }
    },
    [data, items, onChange, updateItem]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="registry-heading">Section Heading</Label>
        <Input
          id="registry-heading"
          value={data.heading || "Gift Registry"}
          onChange={(e) => onChange({ ...data, heading: e.target.value })}
          placeholder="Gift Registry"
          maxLength={60}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="registry-description">Description (optional)</Label>
        <Textarea
          id="registry-description"
          value={data.description || ""}
          onChange={(e) => onChange({ ...data, description: e.target.value || undefined })}
          placeholder="Your presence is the greatest gift, but if you wish to honor us..."
          rows={2}
          maxLength={300}
        />
      </div>

      <div className="space-y-3">
        <Label>Registry Items</Label>
        {items.map((item, index) => {
          const itemType: RegistryItemType = item.type ?? "link";
          const urlLabel = itemType === "fund" ? "Payment link" : "Registry URL";
          const urlPlaceholder =
            itemType === "fund"
              ? "https://venmo.com/... or PayPal.me link"
              : "https://registry-url.com";
          const amountPlaceholder =
            itemType === "fund" ? "Goal: $5,000 (optional)" : "$250 (optional)";
          // For funds the `note` field doubles as the contribution message and
          // overrides the default "Any amount is appreciated…" line on the page.
          const notePlaceholder =
            itemType === "fund"
              ? "e.g., Send an Interac e-transfer to maria@email.com (answer: love) — overrides the default text"
              : "Note, e.g., Ships internationally (optional)";
          const invalidUrl =
            !!item.url &&
            (() => {
              try {
                new URL(item.url!);
                return false;
              } catch {
                return true;
              }
            })();

          return (
            <div key={index} className="rounded-lg border p-3 space-y-3">
              {/* Type toggle */}
              <div className="flex items-center gap-2 w-fit">
                {(["link", "fund"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateItem(index, { type: t })}
                    className={cn(
                      "px-3 py-1.5 rounded-md border-2 text-xs font-medium transition-colors",
                      itemType === t
                        ? "border-accent bg-accent/5 text-foreground"
                        : "border-border bg-surface text-foreground hover:border-accent/50"
                    )}
                  >
                    {t === "link" ? "Registry link" : "Cash fund"}
                  </button>
                ))}
              </div>

              {itemType === "fund" && (
                <p className="rounded-md border-l-2 border-accent/60 bg-accent/5 px-3 py-2 text-xs text-muted-foreground">
                  Contributions go directly to your payment link.
                  Contributors are visible on PayPal / Venmo / etc., not in
                  this dashboard.
                </p>
              )}

              {/* Flags */}
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!item.featured}
                    onChange={(e) => setFeatured(index, e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-muted-foreground">Featured (gold CTA)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!item.purchased}
                    onChange={(e) =>
                      updateItem(index, { purchased: e.target.checked || undefined })
                    }
                    className="rounded"
                  />
                  <span className="text-muted-foreground">
                    {itemType === "fund"
                      ? "Close fund (hides Contribute)"
                      : "Claimed (hides CTA)"}
                  </span>
                </label>
              </div>

              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(index, { name: e.target.value })}
                    placeholder={
                      itemType === "fund"
                        ? "e.g., Honeymoon Fund"
                        : "e.g., Amazon, Crate & Barrel"
                    }
                    maxLength={100}
                  />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{urlLabel}</Label>
                    <Input
                      value={item.url || ""}
                      onChange={(e) => updateItem(index, { url: e.target.value || undefined })}
                      placeholder={urlPlaceholder}
                      type="url"
                    />
                    {invalidUrl && (
                      <p className="text-xs text-amber-600">
                        Please enter a valid URL (e.g., https://...)
                      </p>
                    )}
                  </div>
                  <Input
                    value={item.amountLabel || ""}
                    onChange={(e) =>
                      updateItem(index, { amountLabel: e.target.value || undefined })
                    }
                    placeholder={amountPlaceholder}
                    maxLength={40}
                  />
                  <Input
                    value={item.description || ""}
                    onChange={(e) =>
                      updateItem(index, { description: e.target.value || undefined })
                    }
                    placeholder="Brief description (optional)"
                    maxLength={200}
                  />
                  <div className="space-y-1">
                    {itemType === "fund" && (
                      <Label className="text-xs text-muted-foreground">
                        Contribution message (optional)
                      </Label>
                    )}
                    <Input
                      value={item.note || ""}
                      onChange={(e) => updateItem(index, { note: e.target.value || undefined })}
                      placeholder={notePlaceholder}
                      maxLength={200}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Category (optional)
                      </Label>
                      <Input
                        value={item.category || ""}
                        onChange={(e) =>
                          updateItem(index, { category: e.target.value || undefined })
                        }
                        list={`registry-categories-${index}`}
                        placeholder="e.g., Kitchen, Honeymoon"
                        maxLength={40}
                      />
                      <datalist id={`registry-categories-${index}`}>
                        {categorySuggestions.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                    {itemType === "link" && (
                      <div className="w-24 space-y-1">
                        <Label className="text-xs text-muted-foreground">Qty</Label>
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={item.quantity ?? 1}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            updateItem(index, {
                              quantity: Number.isFinite(n) && n >= 1 ? n : 1,
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="mt-1 h-8 w-8 p-0 text-destructive hover:text-destructive"
                  aria-label="Remove registry item"
                >
                  ×
                </Button>
              </div>

              {/* Image picker (gift product photo) */}
              {imageAssets.length > 0 ? (
                <div className="space-y-1">
                  <Label className="text-xs">Gift photo (optional)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateItem(index, { imageAssetId: undefined })}
                      className={cn(
                        "h-12 w-12 rounded border-2 p-0.5 transition-all text-xs",
                        !item.imageAssetId
                          ? "border-primary bg-primary/10"
                          : "border-muted hover:border-muted-foreground"
                      )}
                      title={item.imageAssetId ? "Clear photo" : "No photo"}
                    >
                      <span className="text-muted-foreground">—</span>
                    </button>
                    {imageAssets.map((asset) => {
                      const isSelected = item.imageAssetId === asset.id;
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => updateItem(index, { imageAssetId: asset.id })}
                          aria-pressed={isSelected}
                          className={cn(
                            "relative h-12 w-12 overflow-hidden rounded border-2 transition-all",
                            isSelected
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-muted hover:border-muted-foreground"
                          )}
                          title="Select photo"
                        >
                          {asset.publicUrl && (
                            <img
                              src={asset.publicUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                          {isSelected && (
                            <span
                              aria-hidden="true"
                              className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                            >
                              <svg
                                className="h-2.5 w-2.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  To attach a gift photo, upload an image in the media library and
                  tag it <span className="font-mono">gift</span>.
                </p>
              )}

              {/* Logo picker (brand mark) */}
              {logoAssets.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Brand logo (optional)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateItem(index, { logoAssetId: undefined })}
                      className={cn(
                        "h-10 w-10 rounded border-2 p-0.5 transition-all text-xs",
                        !item.logoAssetId
                          ? "border-primary bg-primary/10"
                          : "border-muted hover:border-muted-foreground"
                      )}
                      title={item.logoAssetId ? "Clear logo" : "No logo"}
                    >
                      <span className="text-muted-foreground">—</span>
                    </button>
                    {logoAssets.map((asset) => {
                      const isSelected = item.logoAssetId === asset.id;
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => updateItem(index, { logoAssetId: asset.id })}
                          aria-pressed={isSelected}
                          className={cn(
                            "relative h-10 w-10 overflow-hidden rounded border-2 transition-all",
                            isSelected
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-muted hover:border-muted-foreground"
                          )}
                          title="Select logo"
                        >
                          {asset.publicUrl && (
                            <img
                              src={asset.publicUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                          {isSelected && (
                            <span
                              aria-hidden="true"
                              className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                            >
                              <svg
                                className="h-2.5 w-2.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={items.length >= MAX_ITEMS}
        >
          + Add Registry Item
          {items.length >= MAX_ITEMS && ` (max ${MAX_ITEMS})`}
        </Button>
      </div>
    </div>
  );
}
