"use client";

import { useCallback, useState } from "react";
import type { KeyboardEvent } from "react";

/**
 * Flip-card interaction shared by the party renderers' cards.
 *
 * Click/Enter/Space toggle the flip, but only when `canFlip` is true (renderers
 * gate this on whether there's a back to reveal, e.g. a bio). Returns the flip
 * state plus the handlers to spread onto the card element.
 */
export function useFlipCard(canFlip: boolean) {
  const [flipped, setFlipped] = useState(false);

  const toggle = useCallback(() => {
    if (canFlip) setFlipped((f) => !f);
  }, [canFlip]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!canFlip) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    },
    [canFlip, toggle],
  );

  return { flipped, toggle, handleKeyDown };
}
