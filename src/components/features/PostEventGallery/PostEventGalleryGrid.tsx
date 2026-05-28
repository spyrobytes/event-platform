"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryPresentation, PublicGalleryItem } from "@/schemas/gallery";
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
  /** Full parsed presentation. The renderer plucks `variant` for
   *  dispatch and forwards the rest to layouts that need it
   *  (Slideshow reads autoplay/interval/transition). Replaces the
   *  prior `variant` prop so PR F's slideshow settings flow through
   *  one channel rather than expanding the prop list per setting. */
  presentation: GalleryPresentation;
  /** Optional curated subset — already server-filtered + capped at
   *  FEATURED_STRIP_LIMIT. Pass `[]` (or omit) when the organizer
   *  toggled the strip off; the orchestrator skips rendering it.
   *  Items here generally overlap the main `initialItems` array (see
   *  the PublicGallery NATIVE overlap contract), but the featured
   *  query is independent from paginated items so a starred item can
   *  fall outside the first loaded page. `handleOpenFeatured` looks
   *  up by id and prepends-on-miss so the lightbox always opens the
   *  actual clicked photo. */
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
  presentation,
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
  const cursorRef = useRef(nextCursor);
  cursorRef.current = nextCursor;
  // Dedicated in-flight guard. The `loadingMore` state alone isn't
  // safe — setLoadingMore(true) doesn't take effect until React
  // re-renders, so two callers (sentinel observer + slideshow
  // prefetch effect) firing in the same tick can both pass the guard
  // and double-fetch the same cursor, appending duplicate items. The
  // ref flips synchronously before any await.
  const inflightRef = useRef(false);

  const loadMore = useCallback(async () => {
    const cursor = cursorRef.current;
    if (!cursor || inflightRef.current) return;
    inflightRef.current = true;
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
      inflightRef.current = false;
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
  // Featured-strip clicks route through here because the featured
  // payload is queried independently from the paginated main grid —
  // an editor can star a photo whose page hasn't been loaded yet. If
  // the item is already in `items`, open at its existing index; if
  // not, prepend it so the lightbox has something to address (the
  // lightbox addresses items by their index in this array, so the
  // item must actually be in the array). Prepending shifts no
  // existing indices into the lightbox because the lightbox is closed
  // when this fires.
  const handleOpenFeatured = useCallback(
    (item: PublicGalleryItem) => {
      const existingIdx = items.findIndex((i) => i.id === item.id);
      if (existingIdx !== -1) {
        setLightboxIndex(existingIdx);
        return;
      }
      setItems((prev) => {
        if (prev.some((i) => i.id === item.id)) return prev;
        return [item, ...prev];
      });
      setLightboxIndex(0);
    },
    [items],
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
          onOpen={handleOpenFeatured}
        />
      )}

      <PostEventGalleryRenderer
        presentation={presentation}
        items={items}
        onOpenLightbox={handleOpenLightbox}
        // Non-scrolling layouts (currently just slideshow) need an
        // explicit prefetch hook — the IntersectionObserver sentinel
        // below only fires when the user scrolls. loadMore dedupes
        // concurrent calls via `inflightRef` (flipped synchronously
        // before any await), so layouts can call freely.
        onRequestMore={loadMore}
        hasMore={nextCursor !== null}
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
