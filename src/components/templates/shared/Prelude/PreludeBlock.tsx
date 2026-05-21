"use client";

import { cn } from "@/lib/utils";
import type { Prelude } from "@/schemas/event-page";
import { AnimatedWrapper } from "../AnimatedSection";
import { greatVibes, dancingScript } from "./fonts";
import styles from "./PreludeBlock.module.css";

type PreludeBlockProps = {
  prelude: Prelude | undefined;
  /** Optional className applied to the AnimatedWrapper for template-level overrides */
  className?: string;
};

export function PreludeBlock({ prelude, className }: PreludeBlockProps) {
  if (!prelude || !prelude.enabled || !prelude.body) {
    return null;
  }

  const { heading, body, signature, font } = prelude;
  const scriptClass =
    font === "modern-script" ? styles.modernScript : styles.romanticScript;

  return (
    <AnimatedWrapper
      className={cn(greatVibes.variable, dancingScript.variable, className)}
    >
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
