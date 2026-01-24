"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type ReactNode,
} from "react";

/**
 * Registered section info
 */
export type RegisteredSection = {
  id: string;
  label: string;
  element: HTMLElement;
  /** Optional chapter ID for grouping in navigation */
  chapterId?: string;
};

/**
 * Section nav context value
 */
type SectionNavContextValue = {
  /** Register a section for navigation */
  registerSection: (id: string, label: string, element: HTMLElement, chapterId?: string) => void;
  /** Unregister a section */
  unregisterSection: (id: string) => void;
  /** Currently active section ID */
  activeSectionId: string | null;
  /** All registered sections in order */
  sections: RegisteredSection[];
  /** Navigate to a section by ID */
  navigateToSection: (id: string) => void;
  /** Whether the nav should be visible */
  isNavVisible: boolean;
};

const SectionNavContext = createContext<SectionNavContextValue | null>(null);

type SectionNavProviderProps = {
  children: ReactNode;
  /** Threshold for determining active section (default: 0.3) */
  activeThreshold?: number;
  /** Scroll offset from top to hide nav (default: 200) */
  hideThreshold?: number;
  /** Whether to enable the section nav (default: true) */
  enabled?: boolean;
};

/**
 * Provider for section navigation
 *
 * Tracks registered sections, determines active section based on scroll,
 * and provides navigation utilities.
 */
export function SectionNavProvider({
  children,
  activeThreshold = 0.3,
  hideThreshold = 200,
  enabled = true,
}: SectionNavProviderProps) {
  const [sections, setSections] = useState<RegisteredSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isNavVisible, setIsNavVisible] = useState(false);

  const sectionsMapRef = useRef<Map<string, RegisteredSection>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Track scroll position for visibility
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let rafId: number | null = null;
    let ticking = false;

    const checkVisibility = () => {
      setIsNavVisible(window.scrollY > hideThreshold);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(checkVisibility);
        ticking = true;
      }
    };

    // Initial check
    checkVisibility();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [enabled, hideThreshold]);

  // Set up intersection observer for active section detection
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      // Find the section with highest intersection ratio
      let maxRatio = 0;
      let activeId: string | null = null;

      entries.forEach((entry) => {
        const id = entry.target.getAttribute("data-nav-section-id");
        if (id && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          activeId = id;
        }
      });

      // Also check currently tracked sections not in this batch
      sectionsMapRef.current.forEach(({ id, element }) => {
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
        const ratio = Math.max(0, visibleHeight / element.offsetHeight);

        if (ratio > maxRatio) {
          maxRatio = ratio;
          activeId = id;
        }
      });

      if (maxRatio >= activeThreshold && activeId) {
        setActiveSectionId(activeId);
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      rootMargin: "-10% 0px -10% 0px",
    });

    // Observe all currently registered sections
    sectionsMapRef.current.forEach(({ element }) => {
      observerRef.current?.observe(element);
    });

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [enabled, activeThreshold]);

  const registerSection = useCallback((id: string, label: string, element: HTMLElement, chapterId?: string) => {
    // Check if already registered with same element (prevents infinite loops)
    const existing = sectionsMapRef.current.get(id);
    if (existing && existing.element === element && existing.label === label && existing.chapterId === chapterId) {
      return;
    }

    // Add data attribute for identification
    element.setAttribute("data-nav-section-id", id);
    if (chapterId) {
      element.setAttribute("data-nav-chapter-id", chapterId);
    }

    const section: RegisteredSection = { id, label, element, chapterId };
    sectionsMapRef.current.set(id, section);

    // Update sections array (maintain DOM order)
    setSections(() => {
      const allSections = Array.from(sectionsMapRef.current.values());
      // Sort by DOM position
      allSections.sort((a, b) => {
        const position = a.element.compareDocumentPosition(b.element);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });
      return allSections;
    });

    // Start observing
    observerRef.current?.observe(element);
  }, []);

  const unregisterSection = useCallback((id: string) => {
    const section = sectionsMapRef.current.get(id);
    if (section) {
      observerRef.current?.unobserve(section.element);
      sectionsMapRef.current.delete(id);

      setSections((prev) => prev.filter((s) => s.id !== id));
    }
  }, []);

  const navigateToSection = useCallback((id: string) => {
    const section = sectionsMapRef.current.get(id);
    if (section) {
      section.element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      // Update active section immediately for responsive feel
      setActiveSectionId(id);
    }
  }, []);

  const value = useMemo(
    () => ({
      registerSection,
      unregisterSection,
      activeSectionId,
      sections,
      navigateToSection,
      isNavVisible,
    }),
    [registerSection, unregisterSection, activeSectionId, sections, navigateToSection, isNavVisible]
  );

  return (
    <SectionNavContext.Provider value={value}>
      {children}
    </SectionNavContext.Provider>
  );
}

/**
 * Hook to access section nav context
 */
export function useSectionNav() {
  const context = useContext(SectionNavContext);
  if (!context) {
    throw new Error("useSectionNav must be used within a SectionNavProvider");
  }
  return context;
}

/**
 * Hook to check if we're inside a SectionNavProvider
 */
export function useHasSectionNav(): boolean {
  const context = useContext(SectionNavContext);
  return context !== null;
}

/**
 * Hook to register a section for navigation
 *
 * @example
 * ```tsx
 * function MySection() {
 *   const ref = useSectionNavRef("my-section", "My Section", "chapter-1");
 *   return <section ref={ref}>...</section>;
 * }
 * ```
 */
export function useSectionNavRef(id: string, label: string, chapterId?: string) {
  const context = useContext(SectionNavContext);
  const elementRef = useRef<HTMLElement | null>(null);

  // Extract stable functions to avoid re-creating callback when sections change
  const registerSection = context?.registerSection;
  const unregisterSection = context?.unregisterSection;

  const ref = useCallback(
    (element: HTMLElement | null) => {
      // Unregister previous element if changing
      if (elementRef.current && elementRef.current !== element && unregisterSection) {
        unregisterSection(id);
      }

      elementRef.current = element;

      // Register new element
      if (element && registerSection) {
        registerSection(id, label, element, chapterId);
      }
    },
    [id, label, chapterId, registerSection, unregisterSection]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unregisterSection) {
        unregisterSection(id);
      }
    };
  }, [id, unregisterSection]);

  return ref;
}
