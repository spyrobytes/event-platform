"use client";

import { useEffect } from "react";

/**
 * Locks body scroll while `active`, restoring the PRIOR inline overflow value
 * on release — not a hardcoded `""` — so a lock stacked on top of another
 * surface's lock (or a theme that sets overflow itself) can't unlock the page
 * from under it when it closes first.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prior;
    };
  }, [active]);
}
