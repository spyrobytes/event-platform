// Authentication
export { useAuth } from "./use-auth";

// Event temporal state
export {
  useEventTemporal,
  getEventTemporalState,
  type EventPhase,
  type TimeRemaining,
  type EventTemporalState,
} from "./use-event-temporal";

// Scroll position tracking
export {
  useScrollPosition,
  useHasScrolledPast,
  type ScrollDirection,
  type ScrollPositionState,
} from "./use-scroll-position";

// Section visibility and observation
export {
  SectionObserverProvider,
  useSectionObserver,
  useSectionRef,
  useIntersectionObserver,
  type SectionVisibility,
} from "./use-section-visibility";
