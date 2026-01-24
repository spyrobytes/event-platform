"use client";

import { useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSectionNav } from "./SectionNavContext";
import styles from "./SectionNav.module.css";

type SectionNavProps = {
  /** Custom accent color (hex or CSS variable) */
  accentColor?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show labels on hover (default: true) */
  showLabels?: boolean;
  /** Aria label for the navigation (default: "Page sections") */
  ariaLabel?: string;
  /** Whether to show chapter separators (default: true) */
  showChapterSeparators?: boolean;
};

/**
 * Floating Section Navigation
 *
 * Displays a minimal dot navigation on the right side of the screen.
 * Shows section labels on hover and highlights the current section.
 *
 * Must be used within a SectionNavProvider.
 *
 * @example
 * ```tsx
 * <SectionNavProvider>
 *   <Template>...</Template>
 *   <SectionNav accentColor="#B76E79" />
 * </SectionNavProvider>
 * ```
 */
export function SectionNav({
  accentColor,
  className,
  showLabels = true,
  ariaLabel = "Page sections",
  showChapterSeparators = true,
}: SectionNavProps) {
  const { sections, activeSectionId, navigateToSection, isNavVisible } = useSectionNav();
  const navRef = useRef<HTMLElement>(null);
  const activeIndexRef = useRef<number>(-1);

  // Update active index when active section changes
  useEffect(() => {
    const index = sections.findIndex((s) => s.id === activeSectionId);
    activeIndexRef.current = index;
  }, [sections, activeSectionId]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (sections.length === 0) return;

      let newIndex = activeIndexRef.current;

      switch (event.key) {
        case "ArrowUp":
        case "ArrowLeft":
          event.preventDefault();
          newIndex = Math.max(0, activeIndexRef.current - 1);
          break;
        case "ArrowDown":
        case "ArrowRight":
          event.preventDefault();
          newIndex = Math.min(sections.length - 1, activeIndexRef.current + 1);
          break;
        case "Home":
          event.preventDefault();
          newIndex = 0;
          break;
        case "End":
          event.preventDefault();
          newIndex = sections.length - 1;
          break;
        default:
          return;
      }

      if (newIndex !== activeIndexRef.current && sections[newIndex]) {
        navigateToSection(sections[newIndex].id);
        // Focus the button
        const button = navRef.current?.querySelector(
          `[data-section-nav-id="${sections[newIndex].id}"]`
        ) as HTMLButtonElement | null;
        button?.focus();
      }
    },
    [sections, navigateToSection]
  );

  // Don't render if no sections registered
  if (sections.length === 0) {
    return null;
  }

  const navStyle = accentColor
    ? ({ "--nav-accent-color": accentColor } as React.CSSProperties)
    : undefined;

  // Helper to check if a section starts a new chapter
  const isNewChapter = (index: number): boolean => {
    if (!showChapterSeparators || index === 0) return false;
    const currentChapter = sections[index].chapterId;
    if (!currentChapter) return false;

    // Find previous section with a chapter ID
    for (let i = index - 1; i >= 0; i--) {
      if (sections[i].chapterId) {
        return sections[i].chapterId !== currentChapter;
      }
    }
    return true; // First section with a chapter ID after ones without
  };

  return (
    <nav
      ref={navRef}
      className={cn(
        styles.nav,
        isNavVisible ? styles.visible : styles.hidden,
        className
      )}
      style={navStyle}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      <ul className={styles.list} role="list">
        {sections.map((section, index) => {
          const isActive = section.id === activeSectionId;

          return (
            <li
              key={section.id}
              className={cn(
                styles.item,
                isNewChapter(index) && styles.chapterStart
              )}
            >
              <button
                type="button"
                className={cn(styles.button, isActive && styles.active)}
                onClick={() => navigateToSection(section.id)}
                aria-label={`Go to ${section.label}`}
                aria-current={isActive ? "true" : undefined}
                data-section-nav-id={section.id}
                tabIndex={isActive ? 0 : -1}
              />
              {showLabels && (
                <span className={styles.label} aria-hidden="true">
                  {section.label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Minimal progress bar variant of section navigation
 * Shows a vertical progress indicator instead of dots
 */
type SectionNavProgressProps = {
  /** Custom accent color */
  accentColor?: string;
  /** Additional CSS classes */
  className?: string;
};

export function SectionNavProgress({
  accentColor,
  className,
}: SectionNavProgressProps) {
  const { sections, activeSectionId, isNavVisible } = useSectionNav();

  const activeIndex = sections.findIndex((s) => s.id === activeSectionId);
  const progress = sections.length > 0 ? ((activeIndex + 1) / sections.length) * 100 : 0;

  if (sections.length === 0) {
    return null;
  }

  const navStyle = accentColor
    ? ({ "--nav-accent-color": accentColor } as React.CSSProperties)
    : undefined;

  return (
    <div
      className={cn(
        styles.nav,
        isNavVisible ? styles.visible : styles.hidden,
        className
      )}
      style={navStyle}
      role="progressbar"
      aria-valuenow={activeIndex + 1}
      aria-valuemin={1}
      aria-valuemax={sections.length}
      aria-label={`Section ${activeIndex + 1} of ${sections.length}`}
    >
      <div className={styles.progress}>
        <div
          className={styles.progressFill}
          style={{ height: `${progress}%` }}
        />
      </div>
    </div>
  );
}
