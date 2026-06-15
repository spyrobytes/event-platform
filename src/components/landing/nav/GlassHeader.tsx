"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { getReducedMotionPreference, useScrollThreshold } from "@/hooks";
import { Logo } from "@/components/brand/Logo";
import { handleAnchorClick } from "../ui/smooth-scroll";
import styles from "./GlassHeader.module.css";
import linkStyles from "../ui/link-styles.module.css";

type NavLink = { label: string; href: string };

type GlassHeaderProps = {
  brand?: { label: string; href: string };
  links?: NavLink[];
  cta?: { label: string; href: string };
  /** Compact quick-link shown in the capsule on phones (below md). */
  discover?: NavLink;
  scrollThreshold?: number;
};

const DEFAULT_LINKS: NavLink[] = [
  { label: "Discover Events", href: "/events" },
  { label: "Features", href: "#how-it-works" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "Tech", href: "#tech" },
  { label: "Mission", href: "#mission" },
];

// Frosted-veil exit timing: the dissolve duration plus a small buffer so React
// only unmounts after the animation has visibly finished. CSS reads the same
// dissolve duration via the keyframes below — keep them in sync.
const VEIL_EXIT_MS = 420;
const EXIT_UNMOUNT_BUFFER_MS = 40;
const VEIL_EXIT_TOTAL_MS = VEIL_EXIT_MS + EXIT_UNMOUNT_BUFFER_MS;

// Tailwind `md` breakpoint — the full desktop nav takes over at/above this.
const DESKTOP_BREAKPOINT_PX = 768;

export function GlassHeader({
  brand = { label: "EventFXr", href: "/" },
  links = DEFAULT_LINKS,
  cta = { label: "Get Started", href: "/join" },
  discover = { label: "Discover Events", href: "/events" },
  scrollThreshold = 32,
}: GlassHeaderProps) {
  const scrolled = useScrollThreshold(scrollThreshold);

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();

  const rendered = open || closing;

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openMenu = useCallback(() => {
    clearCloseTimer();
    setClosing(false);
    setOpen(true);
  }, [clearCloseTimer]);

  const closeMenu = useCallback(
    (animate = true) => {
      clearCloseTimer();
      // Return focus to the trigger if it currently lives inside the panel
      // (keyboard users); pointer users keep their place on the page.
      const panel = panelRef.current;
      if (panel && panel.contains(document.activeElement)) {
        triggerRef.current?.focus();
      }
      // Instant teardown for reduced motion and for navigation-driven closes:
      // a lingering fold-up while the next page loads reads as broken.
      if (!animate || getReducedMotionPreference()) {
        setOpen(false);
        setClosing(false);
        return;
      }
      setOpen(false);
      setClosing(true);
      closeTimerRef.current = setTimeout(() => {
        setClosing(false);
        closeTimerRef.current = null;
      }, VEIL_EXIT_TOTAL_MS);
    },
    [clearCloseTimer]
  );

  const toggleMenu = useCallback(() => {
    if (open) closeMenu(true);
    else openMenu();
  }, [open, openMenu, closeMenu]);

  // Keyboard: Escape closes (animated); Tab is trapped across the trigger + panel.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu(true);
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      const trigger = triggerRef.current;
      if (!panel) return;
      const focusables = [
        trigger,
        ...Array.from(
          panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")
        ),
      ].filter((el): el is HTMLElement => el != null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeMenu]);

  // Pointer outside the panel + trigger closes (animated).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      closeMenu(true);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open, closeMenu]);

  // Crossing into desktop layout closes the menu instantly (layout change).
  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      if (window.innerWidth >= DESKTOP_BREAKPOINT_PX) closeMenu(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, closeMenu]);

  // Lock body scroll while the curtain is mounted (including the fold-up).
  useEffect(() => {
    if (!rendered) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [rendered]);

  // Move focus into the dialog itself on open (deferred a frame so it has laid
  // out). Focusing the container — not the first link — lets screen readers
  // announce the dialog and avoids a :focus ring on the first item for pointer
  // users; keyboard users still Tab through the trapped focusables from here.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const id = window.requestAnimationFrame(() => panel.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  // Clear any pending exit timer on unmount.
  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  // While the dark veil is up the capsule goes transparent with white chrome so
  // the logo + morphing X float on the veil; otherwise it tracks scroll state.
  const lightChrome = scrolled && !rendered;
  const textClass = lightChrome ? "text-black" : "text-white";
  const mutedTextClass = lightChrome ? "text-black/85" : "text-white/85";

  const handleNavLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      // In-page anchors scroll smoothly then close instantly; route links fall
      // through to navigation and also tear the curtain down instantly.
      handleAnchorClick(e, href, () => closeMenu(false));
      if (!href.startsWith("#")) closeMenu(false);
    },
    [closeMenu]
  );

  const dataState = closing ? "closing" : "open";
  // The capsule already carries the "Discover Events" shortcut, so drop it from
  // the veil list to avoid the duplicate.
  const menuLinks = links.filter((l) => l.href !== discover.href);
  const itemCount = menuLinks.length + 1; // links + CTA share the cascade

  return (
    <>
      <div className="fixed inset-x-0 top-4 z-[60]">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <header
            className={[
              styles.capsule,
              rendered
                ? styles.capsuleVeil
                : scrolled
                  ? styles.capsuleScrolled
                  : styles.capsuleTop,
              "px-4 py-3",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-3">
              <Link
                href={brand.href}
                className={[
                  "inline-flex items-center rounded-xl px-2 py-1",
                  textClass,
                ].join(" ")}
                aria-label={brand.label}
              >
                <span className="hidden sm:inline">
                  <Logo variant="full" />
                </span>
                <span className="sm:hidden">
                  <Logo variant="mark" />
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={(e) => handleNavLinkClick(e, l.href)}
                    className={[
                      styles.navLink,
                      "rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
                      mutedTextClass,
                      lightChrome
                        ? "hover:text-black focus:ring-black"
                        : "hover:text-white focus:ring-white focus:ring-offset-transparent",
                    ].join(" ")}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                {/* Phone-only quick link — fills the otherwise two-item capsule
                    (logo + trigger) below the md breakpoint. */}
                <Link
                  href={discover.href}
                  onClick={(e) => handleNavLinkClick(e, discover.href)}
                  className={[
                    styles.navLink,
                    "md:hidden rounded-xl px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
                    mutedTextClass,
                    lightChrome
                      ? "hover:text-black focus:ring-black"
                      : "hover:text-white focus:ring-white focus:ring-offset-transparent",
                  ].join(" ")}
                >
                  {discover.label}
                </Link>

                <Link
                  href={cta.href}
                  className={[
                    linkStyles.ctaButton,
                    "hidden md:inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2",
                    lightChrome
                      ? "bg-black text-white focus:ring-black"
                      : "bg-white text-black focus:ring-white focus:ring-offset-transparent",
                  ].join(" ")}
                >
                  {cta.label}
                </Link>

                <button
                  ref={triggerRef}
                  type="button"
                  className={[
                    styles.menuTrigger,
                    "md:hidden inline-flex items-center justify-center rounded-2xl px-3 py-2.5 transition focus:outline-none focus:ring-2 focus:ring-offset-2",
                    lightChrome
                      ? "bg-black/5 text-black hover:bg-black/10 focus:ring-black"
                      : "bg-white/10 text-white hover:bg-white/15 focus:ring-white focus:ring-offset-transparent",
                  ].join(" ")}
                  aria-label={open ? "Close menu" : "Open menu"}
                  aria-haspopup="dialog"
                  aria-expanded={open}
                  aria-controls={menuId}
                  data-open={open}
                  onClick={toggleMenu}
                >
                  <span className={styles.bars} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </button>
              </div>
            </div>
          </header>
        </div>
      </div>

      {rendered && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className={styles.veilSurface}
            data-state={dataState}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            data-state={dataState}
            tabIndex={-1}
            className={[styles.veil, "focus:outline-none"].join(" ")}
          >
            <div className={styles.veilInner}>
              <nav className={styles.veilNav}>
                {menuLinks.map((l, i) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    style={
                      {
                        "--fxr-i": i,
                        "--fxr-i-rev": itemCount - 1 - i,
                      } as React.CSSProperties
                    }
                    className={[
                      styles.menuItem,
                      "block rounded-2xl px-4 py-3 text-center text-2xl font-semibold tracking-tight text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-transparent",
                    ].join(" ")}
                    onClick={(e) => handleNavLinkClick(e, l.href)}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>

              <div className={styles.veilFooter}>
                <Link
                  href={cta.href}
                  style={
                    {
                      "--fxr-i": menuLinks.length,
                      "--fxr-i-rev": 0,
                    } as React.CSSProperties
                  }
                  className={[
                    styles.menuCta,
                    linkStyles.ctaButton,
                    "inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-black focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-transparent",
                  ].join(" ")}
                  onClick={() => closeMenu(false)}
                >
                  {cta.label}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="h-20" aria-hidden="true" />
    </>
  );
}
