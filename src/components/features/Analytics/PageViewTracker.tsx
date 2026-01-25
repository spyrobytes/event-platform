"use client";

import { useEffect, useRef } from "react";
import { trackPageView } from "@/lib/tracking";

type PageViewTrackerProps = {
  eventId: string;
  source?: string;
};

/**
 * PageViewTracker Component
 *
 * Invisible component that tracks page views when mounted.
 * Designed to be embedded in server-rendered pages.
 *
 * Usage:
 * ```tsx
 * <PageViewTracker eventId={event.id} source="direct" />
 * ```
 */
export function PageViewTracker({ eventId, source }: PageViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    // Only track once per mount
    if (tracked.current) return;
    tracked.current = true;

    trackPageView(eventId, source);
  }, [eventId, source]);

  // Render nothing - this is a tracking-only component
  return null;
}
