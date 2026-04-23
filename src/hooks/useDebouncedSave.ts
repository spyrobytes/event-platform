"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type UseDebouncedSaveOptions = {
  /** Debounce delay in ms. Defaults to 500. */
  delay?: number;
  /** How long the "Saved ✓" indicator stays after success, before reverting to "idle". Defaults to 2000. */
  savedLingerMs?: number;
};

type UseDebouncedSaveReturn = {
  status: SaveStatus;
  error: Error | null;
  /** Re-fire the save with the current value. Used by the inline retry link after an error. */
  retry: () => void;
};

/**
 * Debounced save for low-stakes autosaving form fields (planner notes, seat
 * assignment). Tracks the last successfully-saved value so re-rendering with
 * the same value does not retrigger a save. On error, the current value is
 * retained so the user's input is never silently lost; callers can surface an
 * inline retry link that invokes `retry()`.
 *
 * IMPORTANT: `value` is compared with `Object.is`. If you pass a composite
 * object, **memoize it with useMemo** so its reference is stable across renders
 * when the underlying primitives are unchanged. A fresh `{...}` literal every
 * render will look like a change and cause an auto-save loop.
 */
export function useDebouncedSave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  { delay = 500, savedLingerMs = 2000 }: UseDebouncedSaveOptions = {}
): UseDebouncedSaveReturn {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  const lastSavedRef = useRef<T>(value);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lingerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);

  // Keep the save callback fresh without destabilising the debounce effect below.
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const performSave = useCallback(async (val: T) => {
    setStatus("saving");
    setError(null);
    try {
      await saveRef.current(val);
      lastSavedRef.current = val;
      setStatus("saved");
      if (lingerRef.current) clearTimeout(lingerRef.current);
      lingerRef.current = setTimeout(() => setStatus("idle"), savedLingerMs);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setStatus("error");
    }
  }, [savedLingerMs]);

  useEffect(() => {
    if (Object.is(value, lastSavedRef.current)) return;

    if (pendingRef.current) clearTimeout(pendingRef.current);
    pendingRef.current = setTimeout(() => {
      performSave(value);
    }, delay);

    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
    };
  }, [value, delay, performSave]);

  useEffect(() => {
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
      if (lingerRef.current) clearTimeout(lingerRef.current);
    };
  }, []);

  const retry = useCallback(() => {
    performSave(value);
  }, [performSave, value]);

  return { status, error, retry };
}
