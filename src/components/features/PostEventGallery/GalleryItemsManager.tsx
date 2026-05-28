"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Textarea } from "@/components/ui/textarea";
import { isAllowedImageHost } from "@/lib/images/host";
import type {
  OrganizerGalleryItem,
  OrganizerGalleryItemStatus,
} from "@/schemas/gallery";

type Props = {
  eventId: string;
  galleryId: string;
  items: OrganizerGalleryItem[];
  coverGalleryItemId: string | null;
  getIdToken: () => Promise<string | null>;
  /** Fires after any mutation completes so the parent refetches the
   *  gallery and the manager re-renders with fresh state. */
  onChanged: () => void;
};

const STATUS_BADGE: Record<
  OrganizerGalleryItemStatus,
  { label: string; tone: string } | null
> = {
  READY: null, // no badge — the tile is the badge
  PENDING: { label: "Pending", tone: "bg-muted text-muted-foreground" },
  IMPORTING: { label: "Importing", tone: "bg-muted text-muted-foreground" },
  FAILED: { label: "Failed", tone: "bg-destructive/15 text-destructive" },
  SKIPPED: { label: "Skipped", tone: "bg-amber-500/15 text-amber-700" },
};

/**
 * Dashboard items manager. Owns the per-item controls (hide, set cover,
 * move up/down, delete, edit caption) and the gallery-level retry-failed
 * button. Refresh is done by calling `onChanged` after each mutation so
 * the parent page re-loads the gallery — keeps a single source of truth
 * vs. duplicating optimistic state here.
 */
export function GalleryItemsManager({
  eventId,
  galleryId,
  items,
  coverGalleryItemId,
  getIdToken,
  onChanged,
}: Props) {
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<OrganizerGalleryItem | null>(
    null,
  );
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retryPending, setRetryPending] = useState(false);

  const failedCount = useMemo(
    () => items.filter((i) => i.status === "FAILED").length,
    [items],
  );

  // Items are sorted by sortOrder server-side; index in the array is the
  // canonical position for up/down moves. We submit only the pair being
  // swapped to the reorder endpoint.
  const sortedItems = items;

  const callRoute = useCallback(
    async (
      path: string,
      init: RequestInit,
    ): Promise<{ ok: boolean; error?: string }> => {
      const token = await getIdToken();
      if (!token) return { ok: false, error: "Not authenticated" };
      const res = await fetch(path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...init.headers,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return { ok: false, error: data?.error ?? "Request failed" };
      }
      return { ok: true };
    },
    [getIdToken],
  );

  const toggleHidden = useCallback(
    async (item: OrganizerGalleryItem) => {
      setPendingItemId(item.id);
      setError(null);
      const result = await callRoute(
        `/api/events/${eventId}/gallery/${galleryId}/items/${item.id}`,
        { method: "PATCH", body: JSON.stringify({ isHidden: !item.isHidden }) },
      );
      setPendingItemId(null);
      if (!result.ok) setError(result.error ?? null);
      else onChanged();
    },
    [callRoute, eventId, galleryId, onChanged],
  );

  const setCover = useCallback(
    async (item: OrganizerGalleryItem) => {
      setPendingItemId(item.id);
      setError(null);
      const result = await callRoute(
        `/api/events/${eventId}/gallery/${galleryId}/cover`,
        {
          method: "PATCH",
          body: JSON.stringify({ galleryItemId: item.id }),
        },
      );
      setPendingItemId(null);
      if (!result.ok) setError(result.error ?? null);
      else onChanged();
    },
    [callRoute, eventId, galleryId, onChanged],
  );

  const toggleFeatured = useCallback(
    async (item: OrganizerGalleryItem) => {
      setPendingItemId(item.id);
      setError(null);
      // Server-side guard rejects isFeatured=true on hidden / non-READY
      // items (see PR A review fix-tier #3). Disabling the button below
      // for those states keeps the UI from ever issuing a doomed PATCH.
      const result = await callRoute(
        `/api/events/${eventId}/gallery/${galleryId}/items/${item.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isFeatured: !item.isFeatured }),
        },
      );
      setPendingItemId(null);
      if (!result.ok) setError(result.error ?? null);
      else onChanged();
    },
    [callRoute, eventId, galleryId, onChanged],
  );

  const moveItem = useCallback(
    async (index: number, direction: -1 | 1) => {
      const a = sortedItems[index];
      const b = sortedItems[index + direction];
      if (!a || !b) return;
      setPendingItemId(a.id);
      setError(null);
      const result = await callRoute(
        `/api/events/${eventId}/gallery/${galleryId}/items/reorder`,
        {
          method: "PATCH",
          body: JSON.stringify({
            orderings: [
              { id: a.id, sortOrder: b.sortOrder },
              { id: b.id, sortOrder: a.sortOrder },
            ],
          }),
        },
      );
      setPendingItemId(null);
      if (!result.ok) setError(result.error ?? null);
      else onChanged();
    },
    [callRoute, eventId, galleryId, onChanged, sortedItems],
  );

  const deleteItem = useCallback(
    async (item: OrganizerGalleryItem) => {
      setPendingItemId(item.id);
      setError(null);
      const result = await callRoute(
        `/api/events/${eventId}/gallery/${galleryId}/items/${item.id}`,
        { method: "DELETE" },
      );
      setPendingItemId(null);
      setConfirmDelete(null);
      if (!result.ok) setError(result.error ?? null);
      else onChanged();
    },
    [callRoute, eventId, galleryId, onChanged],
  );

  const saveCaption = useCallback(
    async (item: OrganizerGalleryItem) => {
      const next = captionDraft.trim();
      // No-op submit if unchanged. The PATCH route would also no-op but
      // we save a round-trip.
      if ((item.caption ?? "") === next) {
        setEditingCaptionId(null);
        return;
      }
      setPendingItemId(item.id);
      setError(null);
      const result = await callRoute(
        `/api/events/${eventId}/gallery/${galleryId}/items/${item.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ caption: next.length ? next : null }),
        },
      );
      setPendingItemId(null);
      setEditingCaptionId(null);
      if (!result.ok) setError(result.error ?? null);
      else onChanged();
    },
    [callRoute, captionDraft, eventId, galleryId, onChanged],
  );

  const retryFailed = useCallback(async () => {
    setRetryPending(true);
    setError(null);
    const result = await callRoute(
      `/api/events/${eventId}/gallery/${galleryId}/retry`,
      { method: "POST" },
    );
    setRetryPending(false);
    if (!result.ok) setError(result.error ?? null);
    else onChanged();
  }, [callRoute, eventId, galleryId, onChanged]);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No photos imported yet. Pick photos via the Google Drive section above
        to get started.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "photo" : "photos"}
          {failedCount > 0 && (
            <>
              {" "}
              <span className="text-destructive">
                · {failedCount} failed
              </span>
            </>
          )}
        </p>
        {failedCount > 0 && (
          <Button
            type="button"
            variant="outline"
            disabled={retryPending}
            onClick={() => void retryFailed()}
          >
            {retryPending ? "Retrying…" : `Retry ${failedCount} failed`}
          </Button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" role="list">
        {sortedItems.map((item, idx) => {
          const isPending = pendingItemId === item.id;
          const badge = STATUS_BADGE[item.status];
          const isCover = item.id === coverGalleryItemId;
          const canMoveUp = idx > 0;
          const canMoveDown = idx < sortedItems.length - 1;
          const editing = editingCaptionId === item.id;

          return (
            <li
              key={item.id}
              className="overflow-hidden rounded-md border border-border bg-card"
            >
              <div className="relative aspect-square w-full bg-muted">
                {item.thumbnailUrl ? (
                  <Image
                    src={item.thumbnailUrl}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className={`object-cover ${item.isHidden ? "opacity-30" : ""}`}
                    placeholder={item.blurDataUrl ? "blur" : "empty"}
                    blurDataURL={item.blurDataUrl ?? undefined}
                    unoptimized={!isAllowedImageHost(item.thumbnailUrl)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    {item.status === "PENDING" || item.status === "IMPORTING"
                      ? "Awaiting import…"
                      : "No preview"}
                  </div>
                )}
                {badge && (
                  <span
                    className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${badge.tone}`}
                  >
                    {badge.label}
                  </span>
                )}
                {isCover && (
                  <span className="absolute right-2 top-2 rounded-full bg-foreground/90 px-2 py-0.5 text-xs font-medium text-background">
                    Cover
                  </span>
                )}
                {item.isFeatured && !isCover && (
                  <span className="absolute right-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
                    ★ Featured
                  </span>
                )}
                {item.isFeatured && isCover && (
                  // Cover + Featured can coexist (they overlap in the
                  // public payload by design — see PublicGallery NATIVE
                  // contract). Stack the badges so both are visible
                  // instead of letting Cover shadow Featured.
                  <span className="absolute right-2 top-9 rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
                    ★ Featured
                  </span>
                )}
                {item.isHidden && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-foreground/80 px-2 py-0.5 text-xs font-medium text-background">
                    Hidden
                  </span>
                )}
              </div>

              <div className="space-y-2 p-3">
                {item.status === "FAILED" && item.errorMessage && (
                  <p className="text-xs text-destructive line-clamp-2">
                    {item.errorMessage}
                  </p>
                )}
                {item.status === "SKIPPED" && item.errorMessage && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.errorMessage}
                  </p>
                )}

                {editing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={captionDraft}
                      onChange={(e) => setCaptionDraft(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Caption (optional)"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingCaptionId(null)}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void saveCaption(item)}
                        disabled={isPending}
                      >
                        {isPending ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="block w-full text-left text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setCaptionDraft(item.caption ?? "");
                      setEditingCaptionId(item.id);
                    }}
                  >
                    {item.caption || (
                      <span className="italic">Add a caption</span>
                    )}
                  </button>
                )}

                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void moveItem(idx, -1)}
                    disabled={isPending || !canMoveUp}
                    aria-label="Move up"
                    className="h-7 px-2 text-xs"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void moveItem(idx, 1)}
                    disabled={isPending || !canMoveDown}
                    aria-label="Move down"
                    className="h-7 px-2 text-xs"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void toggleHidden(item)}
                    disabled={isPending || item.status !== "READY"}
                    className="h-7 px-2 text-xs"
                  >
                    {item.isHidden ? "Unhide" : "Hide"}
                  </Button>
                  {item.status === "READY" && !isCover && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void setCover(item)}
                      disabled={isPending || item.isHidden}
                      className="h-7 px-2 text-xs"
                    >
                      Set cover
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void toggleFeatured(item)}
                    // Match server-side guard: isFeatured=true requires
                    // READY + visible. Unfeaturing is always allowed.
                    disabled={
                      isPending ||
                      (!item.isFeatured &&
                        (item.status !== "READY" || item.isHidden))
                    }
                    aria-pressed={item.isFeatured}
                    className="h-7 px-2 text-xs"
                  >
                    {item.isFeatured ? "★ Unfeature" : "☆ Feature"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setConfirmDelete(item)}
                    disabled={isPending}
                    className="h-7 px-2 text-xs"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirmDelete !== null}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) void deleteItem(confirmDelete);
        }}
        title="Delete photo"
        description="This permanently removes the photo from the gallery and from storage. You'll need to re-import it from Drive to bring it back."
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
