/**
 * Client-side analytics tracking utilities
 *
 * Provides functions and hooks for tracking user behavior on event pages.
 * Uses anonymous session IDs stored in sessionStorage.
 */

// =============================================================================
// TYPES
// =============================================================================

export type AnalyticsEventType =
  | "page_view"
  | "rsvp_form_started"
  | "rsvp_form_abandoned"
  | "rsvp_form_submitted"
  | "section_viewed";

export type TrackEventData = {
  eventId: string;
  type: AnalyticsEventType;
  data?: Record<string, unknown>;
};

// =============================================================================
// SESSION ID MANAGEMENT
// =============================================================================

const SESSION_ID_KEY = "ef_session_id";

/**
 * Generate a random session ID
 */
function generateSessionId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get or create a session ID for the current browser session
 * Stored in sessionStorage so it persists across page navigations
 * but not across browser sessions
 */
export function getSessionId(): string {
  if (typeof window === "undefined") {
    // Server-side: return placeholder (won't be used)
    return "server";
  }

  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

// =============================================================================
// TRACKING FUNCTIONS
// =============================================================================

/**
 * Track an analytics event
 *
 * Sends event to the tracking API. Fails silently to avoid
 * disrupting user experience.
 */
export async function trackEvent({
  eventId,
  type,
  data,
}: TrackEventData): Promise<void> {
  if (typeof window === "undefined") {
    return; // No tracking on server
  }

  const sessionId = getSessionId();

  try {
    // Use sendBeacon for better reliability during page unload
    const payload = JSON.stringify({
      eventId,
      type,
      sessionId,
      data,
    });

    // Try sendBeacon first (works during page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      const sent = navigator.sendBeacon("/api/analytics/track", blob);
      if (sent) return;
    }

    // Fallback to fetch
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true, // Allows request to complete after page unload
    });
  } catch {
    // Fail silently - analytics should never break the user experience
    if (process.env.NODE_ENV === "development") {
      console.warn("[Analytics] Failed to track event:", type);
    }
  }
}

/**
 * Track a page view event
 */
export function trackPageView(
  eventId: string,
  source?: string
): Promise<void> {
  return trackEvent({
    eventId,
    type: "page_view",
    data: source ? { source } : undefined,
  });
}

/**
 * Track RSVP form interaction start
 */
export function trackFormStarted(eventId: string): Promise<void> {
  return trackEvent({
    eventId,
    type: "rsvp_form_started",
  });
}

/**
 * Track RSVP form abandonment
 */
export function trackFormAbandoned(
  eventId: string,
  lastField?: string
): Promise<void> {
  return trackEvent({
    eventId,
    type: "rsvp_form_abandoned",
    data: lastField ? { lastField } : undefined,
  });
}

/**
 * Track RSVP form submission
 */
export function trackFormSubmitted(
  eventId: string,
  response: string
): Promise<void> {
  return trackEvent({
    eventId,
    type: "rsvp_form_submitted",
    data: { response },
  });
}

/**
 * Track section viewed (scroll tracking)
 */
export function trackSectionViewed(
  eventId: string,
  sectionId: string
): Promise<void> {
  return trackEvent({
    eventId,
    type: "section_viewed",
    data: { sectionId },
  });
}
