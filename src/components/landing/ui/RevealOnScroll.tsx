"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type RevealOnScrollProps = {
  /** Class added once the wrapper enters the viewport. */
  visibleClassName: string;
  className?: string;
  children: ReactNode;
};

/**
 * Minimal client boundary for scroll-reveal sections: owns the
 * IntersectionObserver and toggles `visibleClassName`, so the section itself
 * can stay a server component. The hidden initial state should live in CSS
 * under `@media (scripting: enabled)` so content stays visible without JS.
 */
export function RevealOnScroll({
  visibleClassName,
  className,
  children,
}: RevealOnScrollProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn(className, isVisible && visibleClassName)}>
      {children}
    </div>
  );
}
