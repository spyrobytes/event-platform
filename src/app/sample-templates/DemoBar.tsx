import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DemoThemeOption } from "./demo-data";
import styles from "./DemoBar.module.css";

type Props = {
  slug: string;
  /** Section color themes; empty array hides the swatch strip. */
  themes: DemoThemeOption[];
  /** Currently active theme id (null = template default). */
  activeThemeId: string | null;
  /** Extra query params to preserve across swatch navigation (e.g. edition). */
  preservedParams?: Record<string, string>;
};

function themeHref(
  slug: string,
  themeId: string | null,
  preservedParams?: Record<string, string>,
) {
  const params = new URLSearchParams(preservedParams);
  if (themeId) params.set("theme", themeId);
  const qs = params.toString();
  return `/sample-templates/${slug}${qs ? `?${qs}` : ""}`;
}

/**
 * Floating chrome for /sample-templates/* demo pages: back link, live
 * section-theme swatches, and the sign-up CTA. Bottom-centered so it never
 * fights the template's own top nav.
 *
 * Server component — theme switching is URL state (`?theme=`), so swatches
 * are plain prefetched links and the RSC re-render swaps the palette.
 */
export function DemoBar({ slug, themes, activeThemeId, preservedParams }: Props) {
  return (
    <div className={styles.bar} data-testid="demo-bar">
      <Link href="/#templates" className={styles.back} aria-label="Back to all templates">
        <span aria-hidden="true">←</span>
        <span className={styles.backLabel}>Templates</span>
      </Link>

      {themes.length > 0 && (
        <ul className={styles.swatches} aria-label="Color themes">
          {themes.map((t) => (
            <li key={t.id ?? "default"}>
              <Link
                href={themeHref(slug, t.id, preservedParams)}
                replace
                scroll={false}
                title={t.label}
                aria-label={`${t.label} color theme`}
                aria-current={t.id === activeThemeId ? "true" : undefined}
                className={cn(
                  styles.swatch,
                  t.id === activeThemeId && styles.swatchActive,
                )}
                style={{ "--swatch": t.swatch } as React.CSSProperties}
              />
            </li>
          ))}
        </ul>
      )}

      <Link href="/join" className={styles.cta}>
        Use this template
      </Link>
    </div>
  );
}
