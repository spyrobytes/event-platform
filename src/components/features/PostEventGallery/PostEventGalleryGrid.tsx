"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryVariant, PublicGalleryItem } from "@/schemas/gallery";
import { FeaturedGalleryStrip } from "./FeaturedGalleryStrip";
import { GalleryLightbox } from "./GalleryLightbox";
import { PostEventGalleryRenderer } from "./layouts/PostEventGalleryRenderer";

type Props = {
  eventId: string;
  initialItems: PublicGalleryItem[];
  initialNextCursor: string | null;
  /** Forwarded onto pagination requests so guest-token-gated galleries
   *  still load subsequent pages. */
  inviteToken?: string;
  /** Organizer-chosen display variant; the renderer falls back to
   *  classic-grid for any value it doesn't recognize, mirroring the
   *  safe-fallback contract of `parseGalleryPresentation`. */
  variant: GalleryVariant;
  /** Optional curated subset — already server-filtered + capped at
   *  FEATURED_STRIP_LIMIT. Pass `[]` (or omit) when the organizer
   *  toggled the strip off; the orchestrator skips rendering it.
   *  Items here overlap the main `initialItems` array by design (see
   *  the PublicGallery NATIVE overlap contract); the strip resolves
   *  each id to its main-grid index when clicked so the shared
   *  lightbox opens at the right position. */
  featuredItems?: PublicGalleryItem[];
};

/**
 * Orchestrator for the post-event gallery. Owns:
 *   - the items array + nextCursor (cursor-based pagination)
 *   - the IntersectionObserver sentinel that triggers loadMore
 *   - the loading/error UI between pages
 *   - the lightbox state (which item is open) + the shared
 *     `GalleryLightbox` portal
 *
 * Variant-specific rendering lives in `PostEventGalleryRenderer`. This
 * separation keeps the shared concerns (keyboard nav, focus trap,
 * BFCache safeguards, scroll pagination) in one place across all
 * layouts — only the photo grid itself swaps per variant.
 */
export function PostEventGalleryGrid({
  eventId,
  initialItems,
  initialNextCursor,
  inviteToken,
  variant,
  featuredItems = [],
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Refs let us trigger pagination from an IntersectionObserver without
  // re-binding the observer every state update.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ nextCursor, loadingMore });
  stateRef.current = { nextCursor, loadingMore };

  const loadMore = useCallback(async () => {
    const { nextCursor: cursor, loadingMore: busy } = stateRef.current;
    if (!cursor || busy) return;
    setLoadingMore(true);
    setError(null);
    try {
      const params = new URLSearchParams({ cursor });
      if (inviteToken) params.set("tk", inviteToken);
      const res = await fetch(
        `/api/events/${eventId}/gallery/public?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Failed to load more photos");
      const data = await res.json();
      const page = data.data as {
        items: PublicGalleryItem[];
        pageInfo: { nextCursor: string | null };
      };
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.pageInfo.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load more");
    } finally {
      setLoadingMore(false);
    }
  }, [eventId, inviteToken]);

  // IntersectionObserver bound to a sentinel below the last row. When the
  // sentinel scrolls into view (with 200px headroom), pull the next page.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleOpenLightbox = useCallback(
    (idx: number) => setLightboxIndex(idx),
    [],
  );
  const handleClose = useCallback(() => setLightboxIndex(null), []);
  const handlePrev = useCallback(
    () =>
      setLightboxIndex((i) =>
        i === null ? null : (i - 1 + items.length) % items.length,
      ),
    [items.length],
  );
  const handleNext = useCallback(
    () =>
      setLightboxIndex((i) =>
        i === null ? null : (i + 1) % items.length,
      ),
    [items.length],
  );

  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No photos yet.
      </p>
    );
  }

  return (
    <>
      {featuredItems.length > 0 && (
        <FeaturedGalleryStrip
          featuredItems={featuredItems}
          allItems={items}
          onOpenLightbox={handleOpenLightbox}
        />
      )}

      <PostEventGalleryRenderer
        variant={variant}
        items={items}
        onOpenLightbox={handleOpenLightbox}
      />

      {/* Sentinel — used by the IntersectionObserver. Always rendered so
          the observer attaches cleanly; `nextCursor` gates the actual
          load. */}
      <div ref={sentinelRef} aria-hidden className="h-1 w-full" />

      {loadingMore && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Loading more photos…
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="my-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {lightboxIndex !== null && (
        <GalleryLightbox
          items={items}
          index={lightboxIndex}
          onClose={handleClose}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </>
  );
}
