"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type MobileNavItem = {
  id: string;
  label: string;
  href: string;
};

type MobileNavMenuProps = {
  items: MobileNavItem[];
  /** Outer container className. Each template sets a `*-mobile-only` class
   *  here and pairs it with a media query in its own <style> block to
   *  show the hamburger at narrow widths only. The container is
   *  `position: relative` so the menu popover anchors to it. */
  className?: string;
  /** Theme overrides for the hamburger button trigger. */
  buttonStyle?: React.CSSProperties;
  /** Theme overrides for the popover container. */
  menuStyle?: React.CSSProperties;
  /** Theme overrides for each link in the popover. */
  itemStyle?: React.CSSProperties;
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
  menuStyle,
  itemStyle,
  ariaLabel = "Open navigation",
}: MobileNavMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  if (items.length === 0) return null;

  const handleMenuKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (activeIndex + 1) % items.length;
      setActiveIndex(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = (activeIndex - 1 + items.length) % items.length;
      setActiveIndex(next);
      itemRefs.current[next]?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (!open) setActiveIndex(0);
          setOpen((o) => !o);
        }}
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
        <ul
          role="menu"
          aria-label="Mobile navigation"
          onKeyDown={handleMenuKey}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            left: "auto",
            zIndex: 100,
            width: 220,
            maxWidth: "calc(100vw - 24px)",
            margin: 0,
            padding: "6px 0",
            listStyle: "none",
            boxSizing: "border-box",
            background: "var(--surface, #ffffff)",
            border:
              "1px solid color-mix(in srgb, var(--text-on-card, var(--text, #000)) 22%, transparent)",
            borderRadius: 8,
            boxShadow: "0 12px 28px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)",
            maxHeight: "calc(100vh - var(--banner-offset, 0px) - 96px)",
            overflowY: "auto",
            ...menuStyle,
          }}
        >
          {items.map((item, i) => {
            const isActive = activeIndex === i;
            return (
              <li key={item.id} role="none">
                <a
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  role="menuitem"
                  href={item.href}
                  onMouseEnter={() => setActiveIndex(i)}
                  onFocus={() => setActiveIndex(i)}
                  onClick={close}
                  style={{
                    display: "block",
                    color: "var(--text-on-card, var(--text, #1f1f1f))",
                    textDecoration: "none",
                    padding: "10px 16px",
                    fontSize: "0.85rem",
                    background: isActive
                      ? "color-mix(in srgb, var(--accent, #000) 14%, transparent)"
                      : "transparent",
                    transition: "background 0.15s ease",
                    ...itemStyle,
                  }}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
