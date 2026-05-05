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

// Slight rotation angles for scrapbook feel
const ROTATIONS = ["-2deg", "1.5deg", "-1deg", "2.5deg", "-1.5deg", "1deg", "-2.5deg", "0.5deg"];

type ResolvedItem = {
  assetId: string;
  caption?: string;
  title?: string;
  url: string;
  blurDataUrl?: string | null;
};

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
        return { assetId: item.assetId, caption: item.caption, title: item.title, url: asset.publicUrl, blurDataUrl: asset.blurDataUrl };
      })
      .filter(Boolean) as ResolvedItem[];
  }, [normalized.items, assets]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const isLightboxOpen = lightboxIndex !== null;
  const itemCount = resolvedItems.length;

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

  // Keyboard + body scroll lock
  useEffect(() => {
    if (!isLightboxOpen) return;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrev();
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [isLightboxOpen, closeLightbox, showNext, showPrev]);

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
          {resolvedItems.map((item, i) => (
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
                  />
                </div>
                {(item.caption || item.title) && (
                  <p
                    style={{
                      fontFamily: "var(--sans)",
                      fontSize: "var(--sm, 0.85rem)",
                      color: "var(--text-2, #786f65)",
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
  items: ResolvedItem[];
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
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
        onClick={onPrev}
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
        onClick={onNext}
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

      {/* Stage */}
      <div
        style={{
          maxWidth: "min(1000px, calc(100% - 48px))",
          maxHeight: "calc(100svh - 80px)",
          borderRadius: 24,
          overflow: "hidden",
          background: "#1e1b17",
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
          border: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
        }}
      >
        <img
          src={item.url}
          alt={captionText || ""}
          style={{
            display: "block",
            width: "100%",
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
