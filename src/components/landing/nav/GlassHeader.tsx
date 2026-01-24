"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollThreshold } from "@/hooks";
import { Logo } from "@/components/brand/Logo";
import { handleAnchorClick } from "../ui/smooth-scroll";
import styles from "./GlassHeader.module.css";

type NavLink = { label: string; href: string };

type GlassHeaderProps = {
  brand?: { label: string; href: string };
  links?: NavLink[];
  cta?: { label: string; href: string };
  scrollThreshold?: number;
};

const DEFAULT_LINKS: NavLink[] = [
  { label: "Features", href: "#how-it-works" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "Tech", href: "#tech" },
  { label: "Mission", href: "#mission" },
];

export function GlassHeader({
  brand = { label: "EventsFixer", href: "/" },
  links = DEFAULT_LINKS,
  cta = { label: "Get Started", href: "/login" },
  scrollThreshold = 32,
}: GlassHeaderProps) {
  const scrolled = useScrollThreshold(scrollThreshold);

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = panelRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const textClass = scrolled ? "text-black" : "text-white";
  const mutedTextClass = scrolled ? "text-black/85" : "text-white/85";

  const handleNavLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      handleAnchorClick(e, href, () => setOpen(false));
    },
    []
  );

  return (
    <>
      <div className="fixed inset-x-0 top-4 z-50">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <header
            className={[
              styles.capsule,
              scrolled ? styles.capsuleScrolled : styles.capsuleTop,
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
                  <Logo variant="full" color={scrolled ? "dark" : "light"} />
                </span>
                <span className="sm:hidden">
                  <Logo variant="mark" color={scrolled ? "dark" : "light"} />
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={(e) => handleNavLinkClick(e, l.href)}
                    className={[
                      "rounded-xl px-3 py-2 text-sm transition",
                      mutedTextClass,
                      scrolled
                        ? "hover:bg-black/5 hover:text-black"
                        : "hover:bg-white/12 hover:text-white",
                    ].join(" ")}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <Link
                  href={cta.href}
                  className={[
                    "hidden md:inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition",
                    scrolled
                      ? "bg-black text-white hover:opacity-90"
                      : "bg-white text-black hover:bg-white/90",
                  ].join(" ")}
                >
                  {cta.label}
                </Link>

                <button
                  type="button"
                  className={[
                    "md:hidden inline-flex items-center justify-center rounded-2xl px-3 py-2 text-sm font-semibold transition",
                    scrolled
                      ? "bg-black/5 text-black hover:bg-black/10"
                      : "bg-white/10 text-white hover:bg-white/15",
                  ].join(" ")}
                  aria-label="Open menu"
                  aria-expanded={open}
                  onClick={() => setOpen(true)}
                >
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </header>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-x-0 top-4 px-4">
            <div ref={panelRef} className={[styles.drawer, "mx-auto max-w-6xl p-4"].join(" ")}>
              <div className="flex items-center justify-between">
                <Link
                  href={brand.href}
                  className="inline-flex items-center rounded-xl px-2 py-1"
                  onClick={() => setOpen(false)}
                >
                  <Logo variant="full" color="dark" />
                </Link>

                <button
                  type="button"
                  className="rounded-2xl bg-black/5 px-3 py-2 text-sm font-semibold text-black hover:bg-black/10"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                >
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="my-4">
                <div className={styles.divider} />
              </div>

              <nav className="grid gap-1">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="rounded-2xl px-4 py-3 text-sm font-medium text-black hover:bg-black/5"
                    onClick={(e) => handleNavLinkClick(e, l.href)}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-4">
                <Link
                  href={cta.href}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                  onClick={() => setOpen(false)}
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
