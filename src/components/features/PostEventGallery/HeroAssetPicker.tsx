"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { isAllowedImageHost } from "@/lib/images/host";
import { cn } from "@/lib/utils";

type HeroAsset = {
  id: string;
  publicUrl: string | null;
  width: number | null;
  height: number | null;
  alt: string;
};

type Props = {
  eventId: string;
  galleryId: string;
  /** The gallery's currently-selected hero MediaAsset id, or null when the
   *  fallback chain in `gallery-cover.ts` is taking over (first READY item /
   *  event hero asset). */
  coverMediaAssetId: string | null;
  getIdToken: () => Promise<string | null>;
  /** Called after a successful pick or clear so the parent dashboard can
   *  refetch the gallery row (and re-render the resolved cover wherever it
   *  surfaces). */
  onChanged: () => void;
};

/**
 * Picker for the post-event album hero image.
 *
 * The gallery's hero defaults to whatever `gallery-cover.ts` resolves
 * (typically the first READY imported photo). That's fine for casual
 * use but the imported derivatives are q=85 webp at up to 4000×4000 —
 * stretched to full-bleed under a dark gradient overlay, compression
 * artifacts can show. Letting the organizer explicitly pick a polished
 * MediaAsset from their media library — usually a landscape shot
 * uploaded specifically for hero use — gives them an escape hatch.
 *
 * Lists MediaAssets where `tags` includes "hero". Tag-strict on purpose
 * (per `[[feedback_media_library_phases]]`-Phase-1 vocabulary discipline)
 * — we want organizers to mark hero-suitable photos, not pick arbitrary
 * gallery thumbs that will look worse than the auto-resolved cover.
 *
 * No inline upload here: the page editor already owns the upload UX
 * (MediaUploadCard). Empty state links there. Keeps this component a
 * focused picker rather than a parallel upload surface.
 */
export function HeroAssetPicker({
  eventId,
  galleryId,
  coverMediaAssetId,
  getIdToken,
  onChanged,
}: Props) {
  const [assets, setAssets] = useState<HeroAsset[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Bumped on every successful save so the "Saved" affordance can render
  // (and announce via aria-live). Mirrors GalleryPresentationEditor's
  // pattern — keeps the inline "edit worked" signal consistent across
  // the dashboard's auto-save and button-save surfaces.
  const [savedTick, setSavedTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Not authenticated");
        const res = await fetch(
          `/api/events/${eventId}/media?tag=hero`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error("Failed to load hero images");
        const data = await res.json();
        if (cancelled) return;
        setAssets((data.data?.assets ?? []) as HeroAsset[]);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load hero images",
        );
        setAssets([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, getIdToken]);

  const save = useCallback(
    async (nextAssetId: string | null) => {
      // Use a sentinel for the clear action so the per-asset pending UI
      // can highlight the right cell.
      setSavePending(nextAssetId ?? "__clear__");
      setSaveError(null);
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Not authenticated");
        // Mutual-exclusion: setting a MediaAsset hero ALSO clears any
        // gallery-item cover, otherwise gallery-cover.ts's resolver
        // walks coverGalleryItemId BEFORE coverMediaAssetId — the new
        // pick silently loses to the previously-starred photo and the
        // album page shows the old hero. On a clear action (nextAssetId
        // null) we don't touch galleryItemId; the user might still want
        // a starred-photo cover to take over.
        const body =
          nextAssetId !== null
            ? { mediaAssetId: nextAssetId, galleryItemId: null }
            : { mediaAssetId: null };
        const res = await fetch(
          `/api/events/${eventId}/gallery/${galleryId}/cover`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Failed to save hero image");
        }
        setSavedTick((n) => n + 1);
        onChanged();
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Failed to save hero image",
        );
      } finally {
        setSavePending(null);
      }
    },
    [eventId, galleryId, getIdToken, onChanged],
  );

  if (assets === null) {
    return (
      <p className="text-sm text-muted-foreground">Loading hero images…</p>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {loadError}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
        <p className="text-sm text-foreground">
          No hero-tagged images in this event&apos;s media library yet.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload a landscape photo and tag it{" "}
          <span className="font-medium">Hero</span> in the page editor, then
          it&apos;ll appear here.
        </p>
        <Link
          href={`/dashboard/events/${eventId}/page-editor`}
          className="mt-3 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Open page editor →
        </Link>
        <p className="mt-4 text-xs text-muted-foreground">
          Until then, the album hero falls back to the first imported photo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {saveError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {saveError}
        </div>
      )}

      <ul
        role="radiogroup"
        aria-label="Hero image"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
      >
        {assets.map((asset) => {
          const selected = coverMediaAssetId === asset.id;
          const pending = savePending === asset.id;
          return (
            <li key={asset.id}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={savePending !== null}
                onClick={() => {
                  if (selected) return;
                  void save(asset.id);
                }}
                className={cn(
                  "group relative block aspect-video w-full overflow-hidden rounded-md border-2 bg-muted transition focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2",
                  selected
                    ? "border-foreground ring-2 ring-foreground/20"
                    : "border-transparent hover:border-muted-foreground",
                  savePending !== null && !pending && "opacity-60",
                )}
                title={asset.alt || "Use as hero image"}
              >
                {asset.publicUrl && (
                  <Image
                    src={asset.publicUrl}
                    alt={asset.alt}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                    unoptimized={!isAllowedImageHost(asset.publicUrl)}
                  />
                )}
                {selected && (
                  <span
                    aria-hidden
                    className="absolute right-1 top-1 rounded-full bg-foreground p-1 text-background shadow-sm"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      width={12}
                      height={12}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                )}
                {pending && (
                  <span className="absolute inset-0 grid place-items-center bg-background/70 text-xs font-medium text-foreground">
                    Saving…
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          {coverMediaAssetId
            ? "Hero image set. Click another to swap."
            : "No explicit hero set — the album falls back to the first imported photo."}
        </p>
        <div className="flex items-center gap-3">
          {savedTick > 0 && savePending === null && !saveError && (
            <span
              aria-live="polite"
              className="inline-flex items-center gap-1 text-xs font-medium text-success"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                width={12}
                height={12}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Saved
            </span>
          )}
          {coverMediaAssetId && (
            <button
              type="button"
              disabled={savePending !== null}
              onClick={() => void save(null)}
              className="text-xs font-medium text-foreground underline-offset-2 hover:underline disabled:opacity-50"
            >
              {savePending === "__clear__" ? "Clearing…" : "Clear selection"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
