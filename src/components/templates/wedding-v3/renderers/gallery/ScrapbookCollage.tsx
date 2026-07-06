"use client";

/**
 * Scrapbook Collage Gallery — The Celebration House
 *
 * Images at slight angles with rounded corners, like photos
 * scattered on a table or pinned to a scrapbook page.
 * Playful, festive, social. Includes full-screen lightbox on click.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import type { SectionRendererProps } from "../../types";
import type { GallerySection } from "@/schemas/event-page";
import { normalizeGalleryData } from "@/schemas/event-page";
import { EventImage } from "@/components/media/EventImage";
import { DEFAULT_LIGHTBOX_FALLBACK_WIDTH, DEFAULT_LIGHTBOX_FALLBACK_HEIGHT } from "@/components/media/image-defaults";
import { useProgressiveReveal, GALLERY_REVEAL } from "@/hooks/use-progressive-reveal";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSwipeNavigation } from "@/hooks/use-swipe-navigation";
import { RevealMoreButton } from "@/components/media/RevealMoreButton";
import type { ResolvedGalleryItem } from "./types";

// Slight rotation angles for scrapbook feel
const ROTATIONS = ["-2deg", "1.5deg", "-1deg", "2.5deg", "-1.5deg", "1deg", "-2.5deg", "0.5deg"];

export function ScrapbookCollage({
  data,
  assets,
}: SectionRendererProps<GallerySection["data"]>) {
  const normalized = useMemo(() => normalizeGalleryData(data), [data]);

  const resolvedItems = useMemo(() => {
    return normalized.items
      .map((item) => {
        const asset = assets.find((a) => a.id === item.assetId);
        if (!asset?.publicUrl) return null;
        return {
          assetId: item.assetId,
          caption: item.caption,
          title: item.title,
          url: asset.publicUrl,
          blurDataUrl: asset.blurDataUrl,
          width: asset.width,
          height: asset.height,
          renditionWidths: asset.renditionWidths,
        };
      })
      .filter(Boolean) as ResolvedGalleryItem[];
  }, [normalized.items, assets]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const isLightboxOpen = lightboxIndex !== null;
  const itemCount = resolvedItems.length;

  // Mobile image budget: render a small batch, reveal the rest on demand.
  // The lightbox keeps the full list so arrows can still browse every photo.
  const { visibleCount, hasMore, remaining, revealMore } = useProgressiveReveal(
    itemCount,
    GALLERY_REVEAL,
  );
  const visibleItems = resolvedItems.slice(0, visibleCount);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const showPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + itemCount) % itemCount : null
    );
  }, [itemCount]);

  const showNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % itemCount : null
    );
  }, [itemCount]);

  // Body scroll lock while the lightbox is open. (Keyboard nav — Esc / arrows —
  // lives in ScrapbookLightbox so it can gate arrows on the swipe drag state.)
  useEffect(() => {
    if (!isLightboxOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen]);

  if (resolvedItems.length === 0) return null;

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0", textAlign: "center" }}
      aria-label="Gallery"
      id="gallery"
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
            fontWeight: 500,
            color: "var(--text, #3d3830)",
            marginBottom: "clamp(40px, 5vw, 56px)",
          }}
        >
          {normalized.heading || "Memories"}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "clamp(16px, 2.5vw, 28px)",
          }}
        >
          {visibleItems.map((item, i) => (
            <div
              key={item.assetId || i}
              style={{
                transform: `rotate(${ROTATIONS[i % ROTATIONS.length]})`,
                transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "rotate(0deg) scale(1.03)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = `rotate(${ROTATIONS[i % ROTATIONS.length]})`; }}
              onClick={() => setLightboxIndex(i)}
              role="button"
              tabIndex={0}
              aria-label={`View ${item.caption || item.title || `photo ${i + 1}`}`}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLightboxIndex(i); } }}
            >
              <div
                style={{
                  background: "var(--surface, #ffffff)",
                  padding: "clamp(8px, 1.5vw, 14px)",
                  paddingBottom: "clamp(28px, 4vw, 40px)",
                  borderRadius: "var(--r, 16px)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    aspectRatio: "1 / 1",
                    overflow: "hidden",
                    borderRadius: "calc(var(--r, 16px) - 4px)",
                    position: "relative",
                  }}
                >
                  <EventImage
                    src={item.url}
                    alt={item.caption || item.title || ""}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    style={{ objectFit: "cover", objectPosition: "center 25%" }}
                    blurDataURL={item.blurDataUrl}
                    renditionWidths={item.renditionWidths}
                  />
                </div>
                {(item.caption || item.title) && (
                  <p
                    style={{
                      fontFamily: "var(--sans)",
                      fontSize: "var(--sm, 0.85rem)",
                      color: "var(--text-2-on-card, var(--text-2, #786f65))",
                      marginTop: "clamp(8px, 1vw, 12px)",
                      textAlign: "center",
                    }}
                  >
                    {item.caption || item.title}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <RevealMoreButton
            label="View more memories"
            remaining={remaining}
            onClick={revealMore}
          />
        )}
      </div>

      {/* Lightbox — portaled to body to escape transform containing block */}
      {isLightboxOpen && (
        <LightboxPortal>
          <ScrapbookLightbox
            items={resolvedItems}
            index={lightboxIndex as number}
            onClose={closeLightbox}
            onPrev={showPrev}
            onNext={showNext}
          />
        </LightboxPortal>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Lightbox Portal
// ---------------------------------------------------------------------------

function LightboxPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function ScrapbookLightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items: ResolvedGalleryItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Focus trap
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === dialog) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    dialog.addEventListener("keydown", handleFocusTrap);
    return () => dialog.removeEventListener("keydown", handleFocusTrap);
  }, []);

  // Swipe / drag navigation (mouse + touch + pen). The hook owns the imperative
  // translate AND cursor on the stage; arrows + keyboard remain the AT path.
  const reducedMotion = useReducedMotion();
  const { contentRef, handlers, isBusyRef, getBackdropProps } =
    useSwipeNavigation<HTMLDivElement>({
      onPrev,
      onNext,
      enabled: items.length > 1,
      reducedMotion,
    });

  // Esc closes; arrows navigate — but not while a swipe gesture or its settle
  // glide is in flight (an external nav would swap src mid-animation). Lives here
  // (not the section) so it can read the hook's busy state via isBusyRef.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (isBusyRef.current) return;
      if (e.key === "ArrowRight") onNext();
      else if (e.key === "ArrowLeft") onPrev();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, onNext, onPrev, isBusyRef]);

  const item = items[index];
  const captionText = item.caption || item.title;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      tabIndex={-1}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(30, 27, 23, 0.88)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      {...getBackdropProps(onClose)}
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.9)",
          display: "grid",
          placeItems: "center",
          zIndex: 301,
          border: "1px solid rgba(255,255,255,0.1)",
          cursor: "pointer",
          transition: "background 0.3s ease",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={20} height={20}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Prev */}
      <button
        onClick={() => {
          // Ignore clicks during a gesture / settle glide so we don't swap src
          // mid-animation (matches the keyboard gate above).
          if (!isBusyRef.current) onPrev();
        }}
        aria-label="Previous image"
        style={{
          position: "fixed",
          top: "50%",
          left: 16,
          transform: "translateY(-50%)",
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.9)",
          display: "grid",
          placeItems: "center",
          zIndex: 301,
          border: "1px solid rgba(255,255,255,0.1)",
          cursor: "pointer",
          transition: "background 0.3s ease",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={22} height={22}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Next */}
      <button
        onClick={() => {
          if (!isBusyRef.current) onNext();
        }}
        aria-label="Next image"
        style={{
          position: "fixed",
          top: "50%",
          right: 16,
          transform: "translateY(-50%)",
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.9)",
          display: "grid",
          placeItems: "center",
          zIndex: 301,
          border: "1px solid rgba(255,255,255,0.1)",
          cursor: "pointer",
          transition: "background 0.3s ease",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={22} height={22}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Stage — the single element the swipe gesture translates */}
      <div
        ref={contentRef}
        {...handlers}
        style={{
          maxWidth: "min(1000px, calc(100% - 48px))",
          maxHeight: "calc(100svh - 80px)",
          borderRadius: 24,
          overflow: "hidden",
          background: "#1e1b17",
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
          border: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
          // Browser-level gesture contract: we own horizontal, browser keeps
          // vertical scroll + pinch-zoom. will-change pre-materializes the layer
          // so the FIRST drag doesn't jank promoting it (cf. flip-card #238/#239).
          touchAction: "pan-y pinch-zoom",
          willChange: "transform",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        <EventImage
          src={item.url}
          alt={captionText || ""}
          width={item.width ?? DEFAULT_LIGHTBOX_FALLBACK_WIDTH}
          height={item.height ?? DEFAULT_LIGHTBOX_FALLBACK_HEIGHT}
          sizes="(max-width: 768px) 100vw, 1000px"
          blurDataURL={item.blurDataUrl}
          renditionWidths={item.renditionWidths}
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            maxHeight: "calc(100svh - 120px)",
            objectFit: "contain",
          }}
        />
        {captionText && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "32px 20px 16px",
              background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
              color: "rgba(255,255,255,0.9)",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            {captionText}
          </div>
        )}
      </div>

      {/* Prime ±1 so a swipe/arrow commit shows the neighbour instantly */}
      <AdjacentPreloads items={items} index={index} />

      {/* Counter */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "0.82rem",
          color: "rgba(255,255,255,0.5)",
          zIndex: 301,
        }}
      >
        {index + 1} / {items.length}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AdjacentPreloads — prime the ±1 neighbours of the open lightbox
// ---------------------------------------------------------------------------

/**
 * Off-screen EventImage stubs for the items adjacent to `index`, so a swipe (or
 * arrow) commit shows the neighbour with no decode gap. `loading="eager"` forces
 * the fetch despite the 1×1 off-screen box, and the matching `sizes` primes the
 * same rendition the visible stage will request. Scoped to ±1 only — never the
 * whole gallery — to keep network pressure low on image-heavy pages.
 */
function AdjacentPreloads({
  items,
  index,
}: {
  items: ResolvedGalleryItem[];
  index: number;
}) {
  if (items.length < 2) return null;
  const prev = items[(index - 1 + items.length) % items.length];
  const next = items[(index + 1) % items.length];
  const current = items[index];
  const seen = new Set<string>();
  const adjacent: ResolvedGalleryItem[] = [];
  for (const candidate of [prev, next]) {
    const key = candidate.assetId || candidate.url;
    if (candidate !== current && !seen.has(key)) {
      seen.add(key);
      adjacent.push(candidate);
    }
  }

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: -9999,
        left: -9999,
        width: 1,
        height: 1,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {adjacent.map((it, i) => (
        <EventImage
          key={it.assetId || i}
          src={it.url}
          alt=""
          width={1}
          height={1}
          sizes="(max-width: 768px) 100vw, 1000px"
          renditionWidths={it.renditionWidths}
          loading="eager"
        />
      ))}
    </div>
  );
}
