"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * What Tab should consider interactive inside a modal. Union of the selectors
 * the three lightbox focus traps used before consolidation, plus their
 * strictest filter (skip disabled elements).
 */
const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Modal focus management for a dialog/lightbox rendered while `active`:
 *
 * - On activation: snapshots the previously-focused element and moves focus
 *   to the container (give it `tabIndex={-1}` so it can receive it).
 * - While active: traps Tab / Shift+Tab inside the container, wrapping at
 *   the boundaries. If focus sits on the container itself (the just-opened
 *   state) or has escaped the dialog entirely (e.g. a click blurred to
 *   `<body>`), the keystroke routes back into the trap instead of leaking
 *   to the page underneath — an accessibility bug for keyboard and
 *   screen-reader users.
 * - On deactivation/unmount: restores focus to the snapshotted element.
 *
 * The listener is document-level so the trap holds even when focus has left
 * the dialog subtree.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active = true,
) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    container.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      // Container itself, or focus escaped the dialog: route into the trap.
      if (!activeEl || activeEl === container || !container.contains(activeEl)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [containerRef, active]);
}
