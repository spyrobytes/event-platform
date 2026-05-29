import { cn } from "@/lib/utils";
import { greatVibes, dancingScript } from "@/components/templates/shared/Prelude/fonts";
import type { GalleryThankYouFont } from "@/schemas/gallery";
import styles from "./ThankYouSection.module.css";

type Props = {
  heading?: string;
  message?: string;
  /** Font treatment. `serif` (default) keeps the previous serif heading
   *  + sans body. The two script options reuse the Prelude block's
   *  Great Vibes / Dancing Script for a personal, handwritten feel. */
  font?: GalleryThankYouFont;
};

// Per-font dispatch. `variable` is the next/font className that gates
// the @font-face download; without it on an ancestor the cursive falls
// back to the system "cursive" generic and looks generic. `scriptClass`
// picks the family + script-specific font-size cascade from the CSS
// module. Mirrors the pattern in shared/Prelude/PreludeBlock.tsx so
// drift between the two surfaces is visible at a glance.
const FONT_DISPATCH: Record<
  GalleryThankYouFont,
  { variable: string | null; scriptClass: string | null }
> = {
  serif: { variable: null, scriptClass: null },
  "romantic-script": {
    variable: greatVibes.variable,
    scriptClass: styles.romanticScript,
  },
  "modern-script": {
    variable: dancingScript.variable,
    scriptClass: styles.modernScript,
  },
};

/**
 * Optional thank-you / reflection block between the hero and the photo
 * grid. Renders nothing when both heading and message are absent — the
 * `optionalTrimmedString` transform in `galleryPresentationSchema`
 * coerces empty/whitespace input to `undefined`, so a render here means
 * the organizer explicitly set copy.
 *
 * Font choice routes through `FONT_DISPATCH`:
 *   - `serif` (default) — font-serif heading + sans body, the original
 *     treatment. Existing rows without an explicit `thankYouFont` value
 *     land here via the schema default; current public pages are
 *     unchanged.
 *   - `romantic-script` / `modern-script` — both heading AND body get
 *     the cursive class. Heading uses a larger cap than the body to
 *     anchor the section visually. Reuses the Prelude block's font
 *     loaders so we don't double-fetch the families.
 */
export function ThankYouSection({ heading, message, font = "serif" }: Props) {
  if (!heading && !message) return null;

  const dispatch = FONT_DISPATCH[font];
  const isScript = dispatch.scriptClass !== null;

  return (
    <section
      className={cn(
        "border-t border-border bg-muted/30 px-4 py-16 md:py-20",
        dispatch.variable,
      )}
    >
      <div className="mx-auto max-w-prose space-y-4 text-center">
        {heading && (
          <h2
            className={cn(
              "leading-tight text-foreground",
              isScript
                ? cn(dispatch.scriptClass, styles.headingScript)
                : "font-serif text-2xl font-medium md:text-3xl",
            )}
          >
            {heading}
          </h2>
        )}
        {message && (
          <p
            className={cn(
              "leading-relaxed",
              isScript
                ? cn(dispatch.scriptClass, styles.messageScript, "text-foreground")
                : "text-base text-muted-foreground md:text-lg",
            )}
          >
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
