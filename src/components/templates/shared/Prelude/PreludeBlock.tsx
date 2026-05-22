"use client";

import { cn } from "@/lib/utils";
import type { Prelude, PreludeFont } from "@/schemas/event-page";
import { AnimatedWrapper } from "../AnimatedSection";
import { greatVibes, dancingScript } from "./fonts";
import styles from "./PreludeBlock.module.css";

type PreludeBlockProps = {
  prelude: Prelude | undefined;
  /** Optional className applied to the AnimatedWrapper for template-level overrides */
  className?: string;
};

// Per-font dispatch — keyed by PreludeFont so TypeScript catches drift if the
// schema enum grows. Each entry pairs the next/font CSS-variable className
// (gating the @font-face) with the CSS Module class that picks the family.
const FONT_DISPATCH: Record<PreludeFont, { variable: string; scriptClass: string }> = {
  "romantic-script": {
    variable: greatVibes.variable,
    scriptClass: styles.romanticScript,
  },
  "modern-script": {
    variable: dancingScript.variable,
    scriptClass: styles.modernScript,
  },
};

export function PreludeBlock({ prelude, className }: PreludeBlockProps) {
  if (!prelude || !prelude.enabled || !prelude.body) {
    return null;
  }

  const { heading, body, signature, font } = prelude;
  const { variable, scriptClass } = FONT_DISPATCH[font];

  return (
    <AnimatedWrapper className={cn(variable, className)}>
      <section
        className={styles.section}
        aria-label={heading || "Welcome note"}
      >
        <div className={styles.container}>
          {heading && <h2 className={styles.heading}>{heading}</h2>}
          <p className={cn(styles.body, scriptClass)}>{body}</p>
          {signature && (
            <p className={cn(styles.signature, scriptClass)}>{signature}</p>
          )}
        </div>
      </section>
    </AnimatedWrapper>
  );
}
