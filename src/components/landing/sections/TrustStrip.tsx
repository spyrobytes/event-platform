"use client";

import { useEffect, useRef, useState } from "react";
import { Section } from "../ui/Section";
import styles from "./TrustStrip.module.css";

const trustPoints = [
  {
    icon: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    text: "Built by engineers who ship production systems",
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.1)",
  },
  {
    icon: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
    text: "Reliable, repeatable workflows",
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.1)",
  },
  {
    icon: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    text: "Designed to scale from day one",
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.1)",
  },
];

export function TrustStrip() {
  const [isVisible, setIsVisible] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (stripRef.current) {
      observer.observe(stripRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <Section className="py-8 sm:py-10 bg-white border-y border-black/5">
      <div ref={stripRef}>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-8 lg:gap-12">
          {trustPoints.map((point, index) => (
            <div
              key={point.text}
              className={[
                styles.trustPoint,
                isVisible ? styles.trustPointVisible : "",
              ].join(" ")}
              style={{
                transitionDelay: `${index * 0.1}s`,
              }}
            >
              <div
                className={styles.iconBadge}
                style={{
                  backgroundColor: point.bgColor,
                  color: point.color,
                }}
              >
                {point.icon}
              </div>
              <span className="text-sm text-black/70">{point.text}</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
