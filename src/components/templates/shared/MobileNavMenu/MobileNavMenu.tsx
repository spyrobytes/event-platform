"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * CSS custom properties to copy from the wrapper's computed style onto the
 * portal root, so the drawer (rendered to document.body via createPortal)
 * inherits the same per-variant theme tokens the article scope defines.
 * Without this the drawer would resolve var(--surface) etc. against :root,
 * where they may be space-separated rgb tuples for use with rgb() and
 * render invalid as plain background values — making the drawer transparent.
 */
const PORTAL_INHERITED_VARS = [
  "--surface",
  "--bg",
  "--text",
  "--text-on-card",
  "--text-2",
  "--text-2-on-card",
  "--muted",
  "--accent",
  "--accent-foreground",
  "--border",
  "--sans",
  "--serif",
] as const;

function captureThemeVars(el: HTMLElement | null): React.CSSProperties {
  if (!el || typeof window === "undefined") return {};
  const computed = window.getComputedStyle(el);
  const out: Record<string, string> = {};
  for (const name of PORTAL_INHERITED_VARS) {
    const value = computed.getPropertyValue(name).trim();
    if (value) out[name] = value;
  }
  return out as React.CSSProperties;
}

/**
 * Synchronously release the body scroll lock. Called from link onClick and
 * page lifecycle handlers so the body's inline overflow is reset BEFORE the
 * browser snapshots the page for BFCache.
 */
function releaseScrollLock(previous: string) {
  if (typeof document !== "undefined") {
    document.body.style.overflow = previous;
  }
}

export type MobileNavItem = {
  id: string;
  label: string;
  href: string;
  /** Items flagged isCta are pinned to the bottom and styled as an
   *  accent-filled action (typically RSVP). */
  isCta?: boolean;
};

type MobileNavMenuProps = {
  items: MobileNavItem[];
  /** Brand label shown in the drawer header (couple names, monogram, etc.). */
  brand?: React.ReactNode;
  /** Container className for the hamburger trigger wrapper. Each template
   *  pairs this with its own media query so the trigger only appears at
   *  small widths. */
  className?: string;
  /** Inline style overrides for the hamburger button. */
  buttonStyle?: React.CSSProperties;
  /** Hamburger button aria-label. */
  ariaLabel?: string;
  /** Width at which the drawer auto-closes when the viewport widens.
   *  Defaults to 768px. Templates with a different mobile breakpoint
   *  (e.g. Intimate Note uses 640px) can override. */
  desktopBreakpoint?: number;
};

export function MobileNavMenu({
  items,
  brand,
  className,
  buttonStyle,
  ariaLabel = "Open menu",
  desktopBreakpoint = 768,
}: MobileNavMenuProps) {
  const [open, setOpen] = useState(false);
  const [themeVars, setThemeVars] = useState<React.CSSProperties>({});
  const drawerId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousOverflowRef = useRef<string>("");
  const openRef = useRef(false);

  // setOpen wrapper that also mirrors the resolved value into openRef
  // from INSIDE the updater. The conventional pattern is a separate
  // `useEffect(() => { openRef.current = open }, [open])` mirror, but
  // that lags by a render: a synchronous reader fired between the state
  // update and the next commit would see the stale value. The pagehide
  // listener (registered once, fires whenever the browser is about to
  // snapshot for BFCache) is exactly such a reader — it guards on
  // openRef.current and must see the latest committed-or-pending value.
  //
  // The mirror is idempotent (the ref is assigned the same value the
  // updater returns, not derived from the previous ref), so React's
  // "no side effects in updaters" guidance does not bite here.
  const setOpenState = useCallback((next: SetStateAction<boolean>) => {
    setOpen((current) => {
      const resolved =
        typeof next === "function"
          ? (next as (value: boolean) => boolean)(current)
          : next;
      openRef.current = resolved;
      return resolved;
    });
  }, []);

  const close = useCallback(() => {
    setOpenState(false);
    // Return focus to the hamburger trigger so keyboard users land
    // back where they invoked the drawer. Skipped automatically when
    // the trigger is gone (e.g. resized past desktop breakpoint, or
    // hidden by CSS in templates with a desktop nav).
    triggerRef.current?.focus();
  }, [setOpenState]);

  /**
   * Synchronous-commit close path for browser navigation and BFCache
   * lifecycle events. Browser Back restores BFCache snapshots
   * byte-for-byte; if a link navigates away before React commits the
   * drawer close, the fixed backdrop can be restored above the
   * hamburger and intercept every click. `flushSync` forces the portal
   * to unmount in the same tick.
   *
   * Invariant: MUST be called from outside React's render/commit/effect
   * phase. React warns (and the flush is downgraded to async) when
   * `flushSync` runs nested inside another commit. Safe call sites are
   * DOM event handlers — link `onClick`, the `pagehide` listener, the
   * persisted-`pageshow` listener. Never call from a `useEffect` body
   * or from inside another `flushSync`.
   *
   * No focus restoration here: hash navigation hands focus to the link
   * target, full navigations leave the page entirely, and a BFCache
   * restore shouldn't yank focus from wherever the user is now.
   */
  const closeBeforePageCacheSnapshot = useCallback(() => {
    if (!openRef.current) return;

    // Explicit synchronous scroll-lock release BEFORE the flushSync
    // below. The scroll-lock useEffect's cleanup will also call
    // releaseScrollLock when `open` flips to false in the commit, so
    // this is intentionally a double-release — idempotent on the second
    // pass, load-bearing on the first: the `pagehide` path needs the
    // body to have overflow cleared BEFORE the browser snapshots, and
    // we can't trust React's cleanup to land before snapshotting.
    releaseScrollLock(previousOverflowRef.current);

    flushSync(() => {
      setOpenState(false);
    });
  }, [setOpenState]);
  const toggle = useCallback(() => {
    // Snapshot the wrapper's theme tokens before the portal mounts. The
    // wrapper lives inside the article scope where per-variant CSS vars
    // are defined; capturing them here so the portaled drawer can inherit
    // them on the body root (where :root's globals would otherwise win
    // with non-color values and render the drawer transparent).
    if (wrapperRef.current) {
      setThemeVars(captureThemeVars(wrapperRef.current));
    }
    setOpenState((o) => !o);
  }, [setOpenState]);

  // Body scroll lock when drawer is open. The cleanup also runs on BFCache
  // restore via the pageshow listener below.
  useEffect(() => {
    if (!open) return;
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      releaseScrollLock(previousOverflowRef.current);
    };
  }, [open]);

  // BFCache survival. The cached snapshot must not be taken with
  // overflow:hidden pinned, and a restored snapshot must clear any
  // open-state drawer carried in by BFCache.
  useEffect(() => {
    const onPageHide = () => {
      closeBeforePageCacheSnapshot();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      closeBeforePageCacheSnapshot();
    };
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [closeBeforePageCacheSnapshot]);

  // Drawer link clicks go through the sync-commit close so a real
  // document navigation can't outrun the portal unmount. See
  // `closeBeforePageCacheSnapshot` for the full rationale (including
  // why focus is intentionally NOT restored on this path).
  const onItemClick = closeBeforePageCacheSnapshot;

  // Move focus into the drawer when it opens so keyboard users land
  // inside the dialog rather than on the (now-aria-hidden-by-modal)
  // page content behind it.
  useEffect(() => {
    if (!open) return;
    // Defer to next frame so the portal has mounted and refs are
    // populated before we call .focus().
    const raf = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Escape, Tab focus trap, and auto-close on resize past mobile.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "Tab") {
        // Keep focus inside the drawer. Without this, Tab leaks into
        // the page behind the modal overlay.
        const drawer = document.getElementById(drawerId);
        if (!drawer) return;
        const focusable = drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        // If focus has escaped the drawer entirely, pull it back.
        if (!active || !drawer.contains(active)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
          return;
        }
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const onResize = () => {
      if (window.innerWidth >= desktopBreakpoint) close();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open, close, drawerId, desktopBreakpoint]);

  if (items.length === 0) return null;

  const nonCtaItems = items.filter((i) => !i.isCta);
  const ctaItems = items.filter((i) => i.isCta);

  return (
    <>
      <div
        ref={wrapperRef}
        className={className}
        style={{ display: "inline-flex", alignItems: "center" }}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-label={open ? "Close menu" : ariaLabel}
          aria-expanded={open}
          aria-controls={drawerId}
          aria-haspopup="dialog"
          onClick={toggle}
          style={buttonStyle}
          className={cn(
            "inline-grid place-content-center cursor-pointer",
            "focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current focus-visible:rounded-full",
          )}
        >
          <span
            aria-hidden
            style={{
              display: "grid",
              gap: 5,
              transition: "transform 260ms ease",
            }}
          >
            <HamburgerLine
              transform={open ? "translateY(7px) rotate(45deg)" : undefined}
            />
            <HamburgerLine
              opacity={open ? 0 : 1}
              transform={open ? "scaleX(0)" : undefined}
            />
            <HamburgerLine
              transform={open ? "translateY(-7px) rotate(-45deg)" : undefined}
            />
          </span>
        </button>
      </div>

      {open && typeof document !== "undefined" && createPortal(
        <div style={themeVars}>
          {/* Backdrop (click-to-close). Portaled to body so it escapes any
              transformed/filtered/contained ancestor (e.g. the Grand Luxe
              floating pill has `transform: translateX(-50%)` on its <nav>,
              which would otherwise make it the containing block for
              `position: fixed` descendants and trap the drawer inside the
              pill's rect). */}
          <div
            onClick={close}
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 90,
              background: "rgba(18, 12, 10, 0.46)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              animation: "mnm-fade-in 240ms ease",
            }}
          />

          {/* Side drawer. Marked as a modal dialog so screen readers
              announce it correctly and the focus trap is meaningful. */}
          <aside
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              zIndex: 100,
              width: "min(84vw, 340px)",
              padding: "1rem",
              background: "var(--surface, #ffffff)",
              color: "var(--text-on-card, var(--text, #1f1f1f))",
              boxShadow: "0 30px 80px rgba(0,0,0,0.24)",
              borderRight:
                "1px solid color-mix(in srgb, var(--text-on-card, var(--text, #000)) 12%, transparent)",
              animation: "mnm-slide-in 360ms cubic-bezier(0.22, 1, 0.36, 1)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 62,
                paddingBottom: "0.75rem",
                borderBottom:
                  "1px solid color-mix(in srgb, var(--text-on-card, var(--text, #000)) 14%, transparent)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--serif, Georgia, serif)",
                  fontSize: "1.35rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                {brand}
              </span>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close menu"
                onClick={close}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  border:
                    "1px solid color-mix(in srgb, var(--text-on-card, var(--text, #000)) 18%, transparent)",
                  background: "transparent",
                  color: "inherit",
                  fontSize: "1.5rem",
                  lineHeight: 1,
                  cursor: "pointer",
                  transition: "transform 220ms ease, background 220ms ease",
                }}
                className="focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                <span aria-hidden>×</span>
              </button>
            </div>

            <nav
              aria-label="Mobile section navigation"
              style={{
                paddingTop: "1.25rem",
                display: "grid",
                gap: "0.25rem",
                overflowY: "auto",
                flex: 1,
              }}
            >
              {nonCtaItems.map((item, i) => (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={onItemClick}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    minHeight: 48,
                    padding: "0.75rem 0.9rem",
                    borderRadius: 14,
                    color: "inherit",
                    textDecoration: "none",
                    fontSize: "1rem",
                    fontWeight: 600,
                    letterSpacing: "0.01em",
                    animation: `mnm-item-in 320ms cubic-bezier(0.22, 1, 0.36, 1) ${
                      i * 45
                    }ms both`,
                  }}
                  className="mnm-item"
                >
                  <span>{item.label}</span>
                  <span
                    aria-hidden
                    className="mnm-item-chevron"
                    style={{
                      color: "var(--text-2, var(--muted, currentColor))",
                      opacity: 0.5,
                      fontSize: "0.95rem",
                    }}
                  >
                    →
                  </span>
                </a>
              ))}
              {ctaItems.map((item, i) => (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={onItemClick}
                  style={{
                    marginTop: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 50,
                    padding: "0.85rem 1rem",
                    borderRadius: 14,
                    background: "var(--accent, #9f5f50)",
                    color: "var(--accent-foreground, #ffffff)",
                    textDecoration: "none",
                    fontSize: "1rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    boxShadow:
                      "0 12px 30px color-mix(in srgb, var(--accent, #9f5f50) 30%, transparent)",
                    animation: `mnm-item-in 320ms cubic-bezier(0.22, 1, 0.36, 1) ${
                      (nonCtaItems.length + i) * 45
                    }ms both`,
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          <style>{`
            @keyframes mnm-fade-in {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes mnm-slide-in {
              from { transform: translateX(-104%); }
              to { transform: translateX(0); }
            }
            @keyframes mnm-item-in {
              from { opacity: 0; transform: translateX(-18px); }
              to { opacity: 1; transform: translateX(0); }
            }
            .mnm-item:hover {
              background: color-mix(in srgb, var(--accent, currentColor) 12%, transparent) !important;
            }
            .mnm-item:hover .mnm-item-chevron {
              opacity: 1 !important;
              transform: translateX(2px);
            }
            @media (prefers-reduced-motion: reduce) {
              [id="${drawerId}"], [id="${drawerId}"] a {
                animation: none !important;
              }
            }
          `}</style>
        </div>,
        document.body,
      )}
    </>
  );
}

function HamburgerLine({
  opacity,
  transform,
}: {
  opacity?: number;
  transform?: string;
}) {
  return (
    <span
      style={{
        display: "block",
        width: 20,
        height: 2,
        borderRadius: 999,
        background: "currentColor",
        transition:
          "transform 260ms ease, opacity 180ms ease, width 220ms ease",
        opacity,
        transform,
      }}
    />
  );
}
