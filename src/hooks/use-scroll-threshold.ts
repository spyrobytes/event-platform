"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when window.scrollY >= threshold.
 * Lightweight and safe for client components.
 */
export function useScrollThreshold(threshold = 24) {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY >= threshold);
    onScroll(); // init
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return past;
}
