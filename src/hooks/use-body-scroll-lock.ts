"use client";

import { useEffect } from "react";

// Locks are reference-counted across ALL hook instances: the first lock
// snapshots the page's real prior overflow, and only the LAST release
// restores it. Per-instance snapshots would only survive LIFO release —
// if the surface underneath closed first, it would unlock the page under
// the still-open one, and the later cleanup would restore the stale
// "hidden" it captured, leaving the page permanently unscrollable.
let lockCount = 0;
let priorOverflow = "";

/**
 * Locks body scroll while `active`. Stacking-safe in any release order:
 * the body stays locked until every active lock has released, then the
 * overflow value from before the first lock is restored — not a
 * hardcoded `""`, so a theme that set overflow itself isn't clobbered.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (lockCount === 0) {
      priorOverflow = document.body.style.overflow;
    }
    lockCount++;
    document.body.style.overflow = "hidden";
    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = priorOverflow;
      }
    };
  }, [active]);
}
