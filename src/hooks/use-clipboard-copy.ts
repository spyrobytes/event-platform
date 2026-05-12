"use client";

import { useEffect, useRef, useState } from "react";

type UseClipboardCopyOptions = {
  /** Milliseconds before the `copied` flag resets to false. Default: 2000. */
  resetMs?: number;
};

/**
 * Wraps `navigator.clipboard.writeText` with a transient "copied" flag that
 * resets after a delay. Re-clicks restart the timer cleanly; unmounting
 * cancels the pending reset so the setState doesn't fire on a dead
 * component. Clipboard write failures are swallowed — callers should treat
 * copy as best-effort and surface the underlying text in the DOM as a
 * fallback (selectable text, visible address, etc.).
 *
 * Replaces hand-rolled `useState + setTimeout + cleanup` patterns across
 * the codebase. Adopting this in additional copy-button sites is a
 * follow-up cleanup, not blocking on any specific PR.
 */
export function useClipboardCopy({ resetMs = 2_000 }: UseClipboardCopyOptions = {}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), resetMs);
    } catch {
      // Clipboard API can fail when the page lacks user gesture (rare on a
      // button click) or in older browsers. Leave the copied state alone.
    }
  };

  return { copy, copied };
}
