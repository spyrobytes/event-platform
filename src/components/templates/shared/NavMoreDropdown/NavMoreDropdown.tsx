"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type NavMoreItem = {
  id: string;
  label: string;
  href: string;
};

type NavMoreDropdownProps = {
  items: NavMoreItem[];
  label?: string;
  className?: string;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  menuClassName?: string;
  menuStyle?: React.CSSProperties;
  itemClassName?: string;
  itemStyle?: React.CSSProperties;
  onSelect?: (item: NavMoreItem) => void;
};

export function NavMoreDropdown({
  items,
  label = "More",
  className,
  buttonClassName,
  buttonStyle,
  menuClassName,
  menuStyle,
  itemClassName,
  itemStyle,
  onSelect,
}: NavMoreDropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const menuId = useId();

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
    if (open) {
      itemRefs.current[0]?.focus();
    }
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
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      itemRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const last = items.length - 1;
      setActiveIndex(last);
      itemRefs.current[last]?.focus();
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          if (!open) setActiveIndex(0);
          setOpen((o) => !o);
        }}
        style={buttonStyle}
        className={cn(
          "inline-flex items-center gap-1 transition-opacity hover:opacity-70",
          buttonClassName,
        )}
      >
        {label}
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
        >
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          onKeyDown={handleMenuKey}
          style={menuStyle}
          className={cn(
            "absolute right-0 top-full z-50 mt-2 min-w-[10rem] rounded-md py-1 shadow-lg",
            !menuStyle && "border bg-background",
            menuClassName,
          )}
        >
          {items.map((item, i) => (
            <li key={item.id} role="none">
              <a
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                role="menuitem"
                href={item.href}
                onClick={() => {
                  close();
                  onSelect?.(item);
                }}
                style={itemStyle}
                className={cn(
                  "block px-3 py-2 text-sm transition-colors focus:outline-none",
                  !itemStyle && "hover:bg-muted focus:bg-muted",
                  itemClassName,
                )}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
