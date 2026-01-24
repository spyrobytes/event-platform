"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";

/**
 * Section visibility state
 */
export type SectionVisibility = {
  /** Section ID */
  id: string;
  /** Whether section is currently visible in viewport */
  isVisible: boolean;
  /** Intersection ratio (0-1) */
  ratio: number;
  /** Whether this is the "active" (most prominent) section */
  isActive: boolean;
};

/**
 * Section registry entry
 */
type RegisteredSection = {
  id: string;
  element: HTMLElement;
  label?: string;
};

/**
 * Context value for section observer
 */
type SectionObserverContextValue = {
  /** Register a section for observation */
  registerSection: (id: string, element: HTMLElement, label?: string) => void;
  /** Unregister a section */
  unregisterSection: (id: string) => void;
  /** Get visibility state for a section */
  getSectionVisibility: (id: string) => SectionVisibility | undefined;
  /** All visible section IDs in order of appearance */
  visibleSections: string[];
  /** Currently active (most prominent) section ID */
  activeSectionId: string | null;
  /** All registered sections with labels */
  registeredSections: Array<{ id: string; label?: string }>;
  /** Whether animations should be reduced */
  prefersReducedMotion: boolean;
};

const SectionObserverContext = createContext<SectionObserverContextValue | null>(null);

type SectionObserverProviderProps = {
  children: ReactNode;
  /** Intersection threshold for visibility (default: 0.1 = 10%) */
  visibilityThreshold?: number;
  /** Root margin for earlier/later triggering (default: "-10% 0px -10% 0px") */
  rootMargin?: string;
  /** Whether to enable observation (default: true) */
  enabled?: boolean;
};

/**
 * Provider that manages Intersection Observer for all registered sections
 *
 * Wrap your template/page with this provider, then use useSectionRef
 * in individual sections to register them for observation.
 *
 * @example
 * ```tsx
 * <SectionObserverProvider>
 *   <Template>
 *     <AnimatedSection id="hero">...</AnimatedSection>
 *     <AnimatedSection id="details">...</AnimatedSection>
 *   </Template>
 *   <FloatingNav /> // Can use activeSectionId
 * </SectionObserverProvider>
 * ```
 */
export function SectionObserverProvider({
  children,
  visibilityThreshold = 0.1,
  rootMargin = "-10% 0px -10% 0px",
  enabled = true,
}: SectionObserverProviderProps) {
  const [visibilityMap, setVisibilityMap] = useState<Map<string, SectionVisibility>>(new Map());
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  // Initialize with SSR-safe default, will update on mount via effect subscription
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  // Track registered sections as state (updated when sections register/unregister)
  const [registeredSections, setRegisteredSections] = useState<Array<{ id: string; label?: string }>>([]);

  const sectionsRef = useRef<Map<string, RegisteredSection>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Subscribe to reduced motion preference changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Create and manage the observer
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      setVisibilityMap((prev) => {
        const next = new Map(prev);

        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-section-id");
          if (!id) return;

          next.set(id, {
            id,
            isVisible: entry.isIntersecting,
            ratio: entry.intersectionRatio,
            isActive: false, // Will be computed below
          });
        });

        // Determine active section (highest ratio among visible)
        let maxRatio = 0;
        let activeId: string | null = null;

        next.forEach((visibility, id) => {
          if (visibility.isVisible && visibility.ratio > maxRatio) {
            maxRatio = visibility.ratio;
            activeId = id;
          }
        });

        // Update isActive flags
        next.forEach((visibility, id) => {
          next.set(id, {
            ...visibility,
            isActive: id === activeId,
          });
        });

        setActiveSectionId(activeId);
        return next;
      });
    };

    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      rootMargin,
    });

    // Observe all currently registered sections
    sectionsRef.current.forEach(({ element }) => {
      observerRef.current?.observe(element);
    });

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [enabled, visibilityThreshold, rootMargin]);

  const registerSection = useCallback((id: string, element: HTMLElement, label?: string) => {
    // Add data attribute for identification
    element.setAttribute("data-section-id", id);

    sectionsRef.current.set(id, { id, element, label });

    // Update registered sections state
    setRegisteredSections((prev) => {
      // Avoid duplicates
      if (prev.some((s) => s.id === id)) {
        return prev.map((s) => (s.id === id ? { id, label } : s));
      }
      return [...prev, { id, label }];
    });

    // Start observing if observer exists
    observerRef.current?.observe(element);
  }, []);

  const unregisterSection = useCallback((id: string) => {
    const section = sectionsRef.current.get(id);
    if (section) {
      observerRef.current?.unobserve(section.element);
      sectionsRef.current.delete(id);
    }

    // Update registered sections state
    setRegisteredSections((prev) => prev.filter((s) => s.id !== id));

    setVisibilityMap((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getSectionVisibility = useCallback(
    (id: string) => visibilityMap.get(id),
    [visibilityMap]
  );

  const visibleSections = useMemo(() => {
    const visible: string[] = [];
    visibilityMap.forEach((v) => {
      if (v.isVisible) visible.push(v.id);
    });
    return visible;
  }, [visibilityMap]);

  const value = useMemo(
    () => ({
      registerSection,
      unregisterSection,
      getSectionVisibility,
      visibleSections,
      activeSectionId,
      registeredSections,
      prefersReducedMotion,
    }),
    [
      registerSection,
      unregisterSection,
      getSectionVisibility,
      visibleSections,
      activeSectionId,
      registeredSections,
      prefersReducedMotion,
    ]
  );

  return (
    <SectionObserverContext.Provider value={value}>
      {children}
    </SectionObserverContext.Provider>
  );
}

/**
 * Hook to access section observer context
 */
export function useSectionObserver() {
  const context = useContext(SectionObserverContext);
  if (!context) {
    throw new Error("useSectionObserver must be used within a SectionObserverProvider");
  }
  return context;
}

/**
 * Hook for registering a section and tracking its visibility
 *
 * Returns a ref callback to attach to the section element.
 *
 * @example
 * ```tsx
 * function MySection({ id }: { id: string }) {
 *   const { ref, isVisible, isActive } = useSectionRef(id, "My Section");
 *
 *   return (
 *     <section ref={ref} className={isVisible ? "visible" : ""}>
 *       ...
 *     </section>
 *   );
 * }
 * ```
 */
export function useSectionRef(id: string, label?: string) {
  const { registerSection, unregisterSection, getSectionVisibility, prefersReducedMotion } =
    useSectionObserver();

  const elementRef = useRef<HTMLElement | null>(null);

  const ref = useCallback(
    (element: HTMLElement | null) => {
      // Unregister previous element if exists
      if (elementRef.current && elementRef.current !== element) {
        unregisterSection(id);
      }

      elementRef.current = element;

      if (element) {
        registerSection(id, element, label);
      }
    },
    [id, label, registerSection, unregisterSection]
  );

  const visibility = getSectionVisibility(id);

  return {
    ref,
    isVisible: visibility?.isVisible ?? false,
    isActive: visibility?.isActive ?? false,
    ratio: visibility?.ratio ?? 0,
    prefersReducedMotion,
  };
}

/**
 * Standalone hook for observing a single element's visibility
 * Does not require SectionObserverProvider context
 *
 * Useful for one-off visibility detection (e.g., lazy loading, animations)
 *
 * @example
 * ```tsx
 * function FadeInSection({ children }) {
 *   const { ref, isVisible, hasBeenVisible } = useIntersectionObserver({
 *     threshold: 0.2,
 *     triggerOnce: true,
 *   });
 *
 *   return (
 *     <div ref={ref} className={hasBeenVisible ? "fade-in" : "opacity-0"}>
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntersectionObserver({
  threshold = 0.1,
  rootMargin = "0px",
  triggerOnce = false,
  enabled = true,
}: {
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
  enabled?: boolean;
} = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [ratio, setRatio] = useState(0);

  const elementRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (element: HTMLElement | null) => {
      // Cleanup previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      elementRef.current = element;

      if (!element || !enabled) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;

          setIsVisible(entry.isIntersecting);
          setRatio(entry.intersectionRatio);

          if (entry.isIntersecting) {
            setHasBeenVisible(true);

            if (triggerOnce) {
              observerRef.current?.disconnect();
            }
          }
        },
        { threshold, rootMargin }
      );

      observerRef.current.observe(element);
    },
    [threshold, rootMargin, triggerOnce, enabled]
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { ref, isVisible, hasBeenVisible, ratio };
}
