"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { isAllowedImageHost } from "@/lib/images/host";
import type { PublicGalleryItem } from "@/schemas/gallery";
import { GalleryLightbox } from "./GalleryLightbox";

type Props = {
  eventId: string;
  initialItems: PublicGalleryItem[];
  initialNextCursor: string | null;
  /** Forwarded onto pagination requests so guest-token-gated galleries
   *  still load subsequent pages. */
  inviteToken?: string;
};

/**
 * Responsive grid of READY gallery items with a lightbox on click and
 * cursor-based pagination on scroll. SSR hydrates the first page via
 * `initialItems`; we fetch more from `/api/events/[id]/gallery/public`
 * when the user nears the bottom.
 */
export function PostEventGalleryGrid({
  eventId,
  initialItems,
  initialNextCursor,
  inviteToken,
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
      <ul
        className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4"
        role="list"
      >
        {items.map((item, idx) => (
          <li key={item.id} className="overflow-hidden rounded-md bg-muted">
            <button
              type="button"
              onClick={() => setLightboxIndex(idx)}
              className="relative block aspect-square w-full overflow-hidden transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
              aria-label={item.alt || `Open photo ${idx + 1}`}
            >
              <Image
                src={item.thumbnailSrc}
                alt={item.alt}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover"
                placeholder={item.blurDataUrl ? "blur" : "empty"}
                blurDataURL={item.blurDataUrl ?? undefined}
                unoptimized={!isAllowedImageHost(item.thumbnailSrc)}
              />
            </button>
          </li>
        ))}
      </ul>

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
