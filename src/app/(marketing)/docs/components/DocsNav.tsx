"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
};

const NAV_ITEMS: NavItem[] = [
  { id: "quick-start", label: "Getting Started" },
  { id: "templates", label: "Templates" },
  {
    id: "editor",
    label: "Page Editor",
    children: [
      { id: "theme", label: "Theme & Hero" },
      { id: "media", label: "Media Library" },
      { id: "sections", label: "Sections" },
      { id: "gallery", label: "Gallery" },
      { id: "schedule-rsvp", label: "Schedule & RSVP" },
      { id: "versions", label: "Version History" },
    ],
  },
  { id: "publishing", label: "Publishing" },
  { id: "tips", label: "Tips & Limits" },
];

export function DocsNav() {
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    const allIds = NAV_ITEMS.flatMap((item) => [
      item.id,
      ...(item.children?.map((c) => c.id) || []),
    ]);

    allIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(id);
            }
          });
        },
        { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 96;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
      setIsOpen(false);
    }
  }, []);

  const isActive = (id: string) => activeId === id;

  const isParentActive = (item: NavItem) => {
    if (isActive(item.id)) return true;
    return item.children?.some((child) => isActive(child.id)) || false;
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
        aria-label="Toggle navigation"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Navigation */}
      <nav
        className={cn(
          "fixed z-40 transition-transform lg:sticky lg:top-24 lg:h-fit lg:translate-x-0",
          // Mobile styles
          "bottom-0 left-0 right-0 max-h-[60vh] overflow-y-auto rounded-t-2xl bg-background p-4 shadow-2xl lg:bottom-auto lg:left-auto lg:right-auto lg:max-h-none lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none",
          isOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0"
        )}
      >
        <div className="mb-4 text-center font-semibold text-muted-foreground lg:hidden">
          Jump to section
        </div>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                  isParentActive(item)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </button>
              {item.children && (
                <ul className="ml-4 mt-1 space-y-1 border-l pl-3">
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <button
                        onClick={() => scrollToSection(child.id)}
                        className={cn(
                          "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                          isActive(child.id)
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {child.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
