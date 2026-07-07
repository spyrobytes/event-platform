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

// Scroll threshold detection
export { useScrollThreshold } from "./use-scroll-threshold";

// Scroll an element into view when a value becomes truthy (e.g. form errors)
export { useScrollIntoViewWhen } from "./use-scroll-into-view-when";

// "Did you mean?" typo suggestion for email fields
export { useEmailTypoSuggestion } from "./use-email-typo-suggestion";

// Invitation animation state
export {
  useInvitationState,
  type InvitationState,
  type InvitationEvent,
  type UseInvitationStateReturn,
} from "./use-invitation-state";

// Reduced motion preference
export {
  useReducedMotion,
  getReducedMotionPreference,
} from "./use-reduced-motion";

// Animation completion detection
export { useAnimationComplete } from "./use-animation-complete";

// Unsaved-changes guard for editor pages
export { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

// Pointer-driven swipe / drag navigation (lightboxes)
export {
  useSwipeNavigation,
  lockAxis,
  resolveSwipe,
  windowVelocity,
  reanchorOffset,
  type VelocitySample,
  type BackdropProps,
  type UseSwipeNavigationOptions,
  type UseSwipeNavigationResult,
} from "./use-swipe-navigation";

// Modal focus management (focus handoff + Tab trap) for lightboxes/dialogs
export { useFocusTrap } from "./use-focus-trap";

// Body scroll lock that restores the prior overflow value
export { useBodyScrollLock } from "./use-body-scroll-lock";
