"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  greatVibes,
  dancingScript,
} from "@/components/templates/shared/Prelude/fonts";
import type {
  GalleryPresentation,
  GalleryThankYouFont,
  GalleryVariant,
  SlideshowTransition,
} from "@/schemas/gallery";

type Props = {
  eventId: string;
  galleryId: string;
  /** Parsed presentation as returned by `parseGalleryPresentation` —
   *  always non-null. Used as the initial form state; the editor doesn't
   *  re-derive from the raw DB JSON to avoid drift. */
  initial: GalleryPresentation;
  getIdToken: () => Promise<string | null>;
  /** Fires after a successful save so the parent refetches the gallery
   *  and the editor re-renders with the new initial state. */
  onSaved: () => void;
};

/**
 * Visible variant catalog. The tile titles + descriptions are organizer-
 * facing copy; the renderer dispatch ids (`variant` field) come from the
 * `galleryVariantSchema` enum. Keep this array in sync with that enum —
 * adding a new variant to the schema without a tile entry here makes it
 * unreachable from the UI (which is the intentional gate before Phase 5
 * launches Editorial Luxe + Story Chapters).
 */
const VARIANT_TILES: ReadonlyArray<{
  id: GalleryVariant;
  label: string;
  description: string;
}> = [
  {
    id: "classic-grid",
    label: "Classic Grid",
    description: "Uniform squares. Clean, fast, predictable.",
  },
  {
    id: "romantic-masonry",
    label: "Romantic Masonry",
    description:
      "Natural aspect ratios in a soft masonry. Elegant, image-forward.",
  },
  {
    id: "scrapbook-memories",
    label: "Scrapbook Memories",
    description: "Polaroid-style cards with playful tilt. Warm, personal.",
  },
  {
    id: "slideshow",
    label: "Slideshow",
    description:
      "One photo at a time on a cinematic stage. Optional autoplay.",
  },
];

/**
 * Transition options for the slideshow variant. Mirrors the schema enum;
 * keep in sync when slideshowTransitionSchema gains entries.
 */
const TRANSITION_OPTIONS: ReadonlyArray<{
  id: SlideshowTransition;
  label: string;
}> = [
  { id: "fade", label: "Fade" },
  { id: "slide", label: "Slide" },
  { id: "zoom", label: "Zoom" },
  { id: "flip", label: "Flip" },
];

/**
 * Font tiles for the thank-you note. Preview text uses the same family
 * the choice will apply on the public page, so the organizer sees the
 * actual treatment in the picker (the wrapper at the bottom of this
 * editor mounts both font CSS variables so the previews render even
 * though the public page lazily applies them per-section).
 */
const THANK_YOU_FONT_TILES: ReadonlyArray<{
  id: GalleryThankYouFont;
  label: string;
  description: string;
  previewClass: string;
}> = [
  {
    id: "serif",
    label: "Serif",
    description: "Default. Quiet, classic.",
    previewClass: "font-serif text-xl",
  },
  {
    id: "romantic-script",
    label: "Romantic Script",
    description: "Flourished calligraphy. Formal, weddings.",
    // Inline style: applied via FONT_VARIABLES wrapper at the editor root.
    previewClass: "text-2xl",
  },
  {
    id: "modern-script",
    label: "Modern Script",
    description: "Playful informal cursive. Personal notes.",
    previewClass: "text-2xl",
  },
];

const HEADING_MAX = 80;
const MESSAGE_MAX = 500;
const SLIDESHOW_INTERVAL_MIN = 2;
const SLIDESHOW_INTERVAL_MAX = 15;

/**
 * Editor for the per-gallery presentation: variant picker + thank-you
 * copy + featured-strip / wishes-echo toggles. Saves via the PATCH route
 * added in PR A, which does a server-side MERGE of `presentation`
 * against the existing column — so partial submissions don't wipe
 * fields the user didn't touch (review-finding #1 from PR #131).
 *
 * Layout follows the codebase's "border-accent + bg-surface" pattern for
 * selected toggles (see memory [[feedback_invitation_editor_toggle_pattern]]).
 */
export function GalleryPresentationEditor({
  eventId,
  galleryId,
  initial,
  getIdToken,
  onSaved,
}: Props) {
  const [variant, setVariant] = useState<GalleryVariant>(initial.variant);
  const [heading, setHeading] = useState<string>(initial.thankYouHeading ?? "");
  const [message, setMessage] = useState<string>(initial.thankYouMessage ?? "");
  const [thankYouFont, setThankYouFont] = useState<GalleryThankYouFont>(
    initial.thankYouFont,
  );
  const [showFeaturedStrip, setShowFeaturedStrip] = useState(
    initial.showFeaturedStrip,
  );
  const [showWishesEcho, setShowWishesEcho] = useState(initial.showWishesEcho);
  const [slideshowAutoplay, setSlideshowAutoplay] = useState(
    initial.slideshowAutoplay,
  );
  const [slideshowAutoplayInterval, setSlideshowAutoplayInterval] = useState(
    initial.slideshowAutoplayInterval,
  );
  const [slideshowTransition, setSlideshowTransition] =
    useState<SlideshowTransition>(initial.slideshowTransition);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(0);

  // Dirty detection avoids posting a no-op PATCH (which would still hit
  // the at-least-one-field refine + still revalidate). Cheap and direct
  // string/boolean compares — the empty-string transform on the server
  // side means `""` and `undefined` round-trip the same observable state.
  // Slideshow fields are always included in the dirty check; they're
  // persistent across variants so an organizer who tunes them then
  // switches variants and back doesn't lose the settings.
  const initialHeading = initial.thankYouHeading ?? "";
  const initialMessage = initial.thankYouMessage ?? "";
  const dirty =
    variant !== initial.variant ||
    heading.trim() !== initialHeading ||
    message.trim() !== initialMessage ||
    thankYouFont !== initial.thankYouFont ||
    showFeaturedStrip !== initial.showFeaturedStrip ||
    showWishesEcho !== initial.showWishesEcho ||
    slideshowAutoplay !== initial.slideshowAutoplay ||
    slideshowAutoplayInterval !== initial.slideshowAutoplayInterval ||
    slideshowTransition !== initial.slideshowTransition;

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }
      const res = await fetch(
        `/api/events/${eventId}/gallery/${galleryId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            presentation: {
              variant,
              // Empty string is server-coerced to undefined by
              // optionalTrimmedString — the server-side merge then
              // omits the key from the persisted JSON, matching the
              // "clear by sending empty" contract.
              thankYouHeading: heading,
              thankYouMessage: message,
              thankYouFont,
              showFeaturedStrip,
              showWishesEcho,
              // Slideshow settings — sent regardless of current variant
              // so they survive variant switching. The PATCH route's
              // server-side merge means unsent fields aren't wiped
              // either, but sending them explicitly avoids depending on
              // merge semantics for round-trip stability.
              slideshowAutoplay,
              slideshowAutoplayInterval,
              slideshowTransition,
            },
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Save failed");
      }
      setSavedTick((n) => n + 1);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [
    eventId,
    galleryId,
    getIdToken,
    heading,
    message,
    onSaved,
    showFeaturedStrip,
    showWishesEcho,
    slideshowAutoplay,
    slideshowAutoplayInterval,
    slideshowTransition,
    thankYouFont,
    variant,
  ]);

  // Mount both prelude font variables on the editor root so the font
  // tile previews render with the actual cursive — without this they'd
  // fall back to the system "cursive" generic and the preview wouldn't
  // match what the public page shows. The public page only needs the
  // variable on the ThankYouSection wrapper (per-section gating); the
  // editor needs both at once so all three tiles preview correctly.
  const fontPreviewVariables = cn(greatVibes.variable, dancingScript.variable);

  return (
    <div className={cn("space-y-6", fontPreviewVariables)}>
      {/* Variant picker */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Display style</h3>
        <p className="text-xs text-muted-foreground">
          Pick how the photo grid is composed on the public gallery page.
        </p>
        <div
          className="grid gap-3 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Gallery display style"
        >
          {VARIANT_TILES.map((tile) => {
            const selected = variant === tile.id;
            return (
              <button
                key={tile.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setVariant(tile.id)}
                className={cn(
                  "rounded-lg border bg-card p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                  selected
                    ? "border-foreground bg-muted/50 ring-1 ring-foreground"
                    : "border-border hover:border-foreground/40",
                )}
              >
                <div className="text-sm font-medium text-foreground">
                  {tile.label}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {tile.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thank-you copy */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Thank-you note</h3>
        <p className="text-xs text-muted-foreground">
          Optional. Renders between the hero and the photo grid. Leave both
          fields blank to skip the section.
        </p>
        <div className="space-y-2">
          <Label htmlFor="gallery-thank-heading" className="text-xs">
            Heading
          </Label>
          <Input
            id="gallery-thank-heading"
            value={heading}
            onChange={(e) => setHeading(e.target.value.slice(0, HEADING_MAX))}
            maxLength={HEADING_MAX}
            placeholder="Thank you for celebrating with us"
          />
          <p className="text-right text-xs text-muted-foreground">
            {heading.length}/{HEADING_MAX}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gallery-thank-message" className="text-xs">
            Message
          </Label>
          <Textarea
            id="gallery-thank-message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
            maxLength={MESSAGE_MAX}
            rows={3}
            placeholder="Your presence made the day unforgettable. Browse the memories below — we hope they bring you joy."
          />
          <p className="text-right text-xs text-muted-foreground">
            {message.length}/{MESSAGE_MAX}
          </p>
        </div>

        {/* Font picker — three tiles, live preview in the actual family.
            Cursive options reuse the wedding Prelude block's font loaders
            so the thank-you note feels related to the main page's
            welcome note when an organizer picks the matching family on
            both surfaces. */}
        <div className="space-y-2">
          <Label className="text-xs">Font</Label>
          <div
            role="radiogroup"
            aria-label="Thank-you note font"
            className="grid gap-2 sm:grid-cols-3"
          >
            {THANK_YOU_FONT_TILES.map((tile) => {
              const selected = thankYouFont === tile.id;
              return (
                <button
                  key={tile.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setThankYouFont(tile.id)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-md border bg-card p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                    selected
                      ? "border-foreground bg-muted/50 ring-1 ring-foreground"
                      : "border-border hover:border-foreground/40",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("leading-none text-foreground", tile.previewClass)}
                    style={
                      tile.id === "romantic-script"
                        ? {
                            fontFamily:
                              "var(--font-prelude-romantic), 'Great Vibes', cursive",
                          }
                        : tile.id === "modern-script"
                          ? {
                              fontFamily:
                                "var(--font-prelude-modern), 'Dancing Script', cursive",
                            }
                          : undefined
                    }
                  >
                    Thank you
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {tile.label}
                  </span>
                  <span className="text-[11px] leading-snug text-muted-foreground">
                    {tile.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Extras</h3>
        <Toggle
          label="Featured photo strip"
          description="Show a curated row of starred photos above the main grid."
          checked={showFeaturedStrip}
          onChange={setShowFeaturedStrip}
        />
        <Toggle
          label="Wishes echo"
          description="Show a sample of approved guest messages between the gallery and the share CTA."
          checked={showWishesEcho}
          onChange={setShowWishesEcho}
        />
      </div>

      {/* Slideshow-specific settings — only relevant when the slideshow
          variant is picked. We KEEP the state across variants so an
          organizer who tunes these, switches to another variant, then
          switches back doesn't lose their settings (state persists; only
          the UI surface is conditional). */}
      {variant === "slideshow" && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">
            Slideshow settings
          </h3>
          <Toggle
            label="Autoplay"
            description="Advance to the next photo automatically. Manual navigation pauses the timer; the play/pause button resumes it."
            checked={slideshowAutoplay}
            onChange={setSlideshowAutoplay}
          />

          <div
            className={cn(
              "space-y-2 rounded-md border border-border bg-card p-3 transition",
              !slideshowAutoplay && "opacity-60",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="slideshow-interval"
                className="text-xs font-medium text-foreground"
              >
                Autoplay interval
              </Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {slideshowAutoplayInterval}s
              </span>
            </div>
            <input
              id="slideshow-interval"
              type="range"
              min={SLIDESHOW_INTERVAL_MIN}
              max={SLIDESHOW_INTERVAL_MAX}
              step={1}
              value={slideshowAutoplayInterval}
              disabled={!slideshowAutoplay}
              onChange={(e) =>
                setSlideshowAutoplayInterval(
                  Math.max(
                    SLIDESHOW_INTERVAL_MIN,
                    Math.min(
                      SLIDESHOW_INTERVAL_MAX,
                      parseInt(e.target.value, 10) ||
                        SLIDESHOW_INTERVAL_MIN,
                    ),
                  ),
                )
              }
              className="w-full accent-foreground disabled:cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              How long each photo stays visible before advancing.{" "}
              {SLIDESHOW_INTERVAL_MIN}–{SLIDESHOW_INTERVAL_MAX} seconds.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">
              Transition
            </Label>
            <div
              role="radiogroup"
              aria-label="Slideshow transition"
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {TRANSITION_OPTIONS.map((opt) => {
                const selected = slideshowTransition === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSlideshowTransition(opt.id)}
                    className={cn(
                      "rounded-md border bg-card px-3 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                      selected
                        ? "border-foreground bg-muted/50 ring-1 ring-foreground text-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {savedTick > 0 && !dirty && (
          <span
            aria-live="polite"
            className="text-xs text-muted-foreground"
          >
            Saved
          </span>
        )}
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
        >
          {saving ? "Saving…" : "Save display"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Inline toggle row used twice above. Built rather than imported because
 * the ui/ primitives don't currently expose a Switch component, and a
 * minimal labeled checkbox keeps the editor self-contained without
 * adding a new design-system primitive.
 */
function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card p-3 transition hover:border-foreground/40">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 cursor-pointer rounded border-border accent-foreground"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="flex-1">
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}
