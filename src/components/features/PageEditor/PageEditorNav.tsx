"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export type PageEditorNavBadge = "disabled" | "hidden" | "orphaned";

export type PageEditorNavItem = {
  /** DOM id of the target Card */
  id: string;
  label: string;
  badges?: PageEditorNavBadge[];
};

export type PageEditorNavGroup = {
  label: string;
  items: PageEditorNavItem[];
};

type PageEditorNavProps = {
  open: boolean;
  onClose: () => void;
  groups: PageEditorNavGroup[];
  activeId: string | null;
};

const BADGE: Record<
  PageEditorNavBadge,
  { label: string; title: string; className: string }
> = {
  disabled: {
    label: "Off",
    title: "Disabled — not shown on the published page",
    className: "bg-muted text-muted-foreground",
  },
  hidden: {
    label: "Hidden",
    title: "Hidden for the current viewer",
    className: "bg-amber-100 text-amber-800",
  },
  orphaned: {
    label: "Unused",
    title: "Not rendered by the current template",
    className: "bg-amber-100 text-amber-800",
  },
};

export function PageEditorNav({
  open,
  onClose,
  groups,
  activeId,
}: PageEditorNavProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleItemClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    onClose();
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id="page-editor-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Page sections navigation"
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-80 max-w-[85vw] flex-col border-l border-border bg-background shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Sections</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close navigation"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </header>

        <nav className="flex-1 overflow-y-auto">
          {groups.map((group) => (
            <div
              key={group.label}
              className="border-b border-border last:border-b-0"
            >
              <div className="flex items-center justify-between px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{group.label}</span>
                {group.items.length > 0 && (
                  <span className="font-normal normal-case tracking-normal">
                    {group.items.length}
                  </span>
                )}
              </div>
              {group.items.length === 0 ? (
                <p className="px-4 pb-3 text-xs italic text-muted-foreground">
                  None yet
                </p>
              ) : (
                <ul className="pb-2">
                  {group.items.map((item) => {
                    const isActive = item.id === activeId;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleItemClick(item.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm transition-colors",
                            isActive
                              ? "bg-primary/10 font-medium text-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                          aria-current={isActive ? "true" : undefined}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                                isActive
                                  ? "bg-primary"
                                  : "bg-muted-foreground/40"
                              )}
                            />
                            <span className="truncate">{item.label}</span>
                          </span>
                          {item.badges && item.badges.length > 0 && (
                            <span className="flex flex-shrink-0 items-center gap-1">
                              {item.badges.map((b) => (
                                <span
                                  key={b}
                                  title={BADGE[b].title}
                                  className={cn(
                                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                    BADGE[b].className
                                  )}
                                >
                                  {BADGE[b].label}
                                </span>
                              ))}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
