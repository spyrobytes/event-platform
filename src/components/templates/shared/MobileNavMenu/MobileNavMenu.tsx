"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type MobileNavItem = {
  id: string;
  label: string;
  href: string;
  isCta?: boolean;
};

type MobileNavMenuProps = {
  items: MobileNavItem[];
  /** Outer container className. Each template sets a `*-mobile-only` class
   *  here and pairs it with a media query in its own <style> block to
   *  show the hamburger at narrow widths only. */
  className?: string;
  /** Theme overrides for the hamburger button trigger. */
  buttonStyle?: React.CSSProperties;
  /** Theme overrides for the drawer panel. */
  drawerStyle?: React.CSSProperties;
  /** Theme overrides for each link in the drawer. */
  itemStyle?: React.CSSProperties;
  /** Theme overrides for a CTA-flagged link (e.g. RSVP). */
  ctaItemStyle?: React.CSSProperties;
  /** CSS top value for the drawer panel. Defaults to clearing the banner
   *  offset plus a 60px nav. Templates with taller/shorter nav bars should
   *  pass an explicit value. */
  drawerTop?: string;
  /** Hamburger button aria-label. */
  ariaLabel?: string;
};

const HAMBURGER_LINES = (
  <>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </>
);

const CLOSE_LINES = (
  <>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </>
);

export function MobileNavMenu({
  items,
  className,
  buttonStyle,
  drawerStyle,
  itemStyle,
  ctaItemStyle,
  drawerTop = "calc(var(--banner-offset, 0px) + 60px)",
  ariaLabel = "Open navigation",
}: MobileNavMenuProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (items.length === 0) return null;

  return (
    <div className={className} style={{ display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={buttonStyle}
        className={cn(
          "inline-flex items-center justify-center transition-colors",
          "focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current focus-visible:rounded-sm",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          width={22}
          height={22}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden
        >
          {open ? CLOSE_LINES : HAMBURGER_LINES}
        </svg>
      </button>
      {open && (
        <>
          {/* Click-outside backdrop (transparent — drawer sits above). */}
          <div
            onClick={close}
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99,
              background: "transparent",
            }}
          />
          {/* Full-viewport-width drawer panel. */}
          <div
            role="menu"
            aria-label="Mobile navigation"
            style={{
              position: "fixed",
              top: drawerTop,
              left: 0,
              right: 0,
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              background: "var(--surface, #ffffff)",
              borderBottom:
                "1px solid color-mix(in srgb, var(--text-on-card, var(--text, #000)) 18%, transparent)",
              boxShadow: "0 12px 28px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)",
              padding: "8px 0",
              maxHeight: "calc(100vh - var(--banner-offset, 0px) - 80px)",
              overflowY: "auto",
              ...drawerStyle,
            }}
          >
            {items.map((item) => (
              <a
                key={item.id}
                role="menuitem"
                href={item.href}
                onClick={close}
                style={{
                  color: "var(--text-on-card, var(--text, #1f1f1f))",
                  textDecoration: "none",
                  padding: "12px 24px",
                  fontSize: "0.9rem",
                  ...(item.isCta ? ctaItemStyle : itemStyle),
                }}
              >
                {item.label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
