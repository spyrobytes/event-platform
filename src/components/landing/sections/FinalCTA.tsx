"use client";

import { useEffect, useRef, useState } from "react";
import { Section } from "../ui/Section";
import { ButtonLink } from "../ui/ButtonLink";
import styles from "./FinalCTA.module.css";

const trustPoints = [
  {
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    text: "No credit card required",
    color: "#3b82f6",
  },
  {
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    text: "Privacy-first by default",
    color: "#10b981",
  },
  {
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    text: "Built for performance & longevity",
    color: "#f59e0b",
  },
];

export function FinalCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <Section className="bg-zinc-950 text-white overflow-hidden">
      <div ref={sectionRef} className="relative">
        <div className={styles.glowOrb} aria-hidden="true" />

        <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
          <div
            className={[
              styles.content,
              isVisible ? styles.contentVisible : "",
            ].join(" ")}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/10">
              <span className="relative flex size-1.5">
                <span className={`absolute inset-0 rounded-full bg-emerald-400 ${isVisible ? styles.pulse : ""}`} />
                <span className="relative size-1.5 rounded-full bg-emerald-500" />
              </span>
              Ready when you are
            </div>

            <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Start with one event.
              <span className="block text-white/60">Scale when you&apos;re ready.</span>
            </h2>

            <p className="mt-4 text-lg text-white/70 max-w-md">
              Launch your first event in minutes. No setup fees, no complexity — just results.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ButtonLink
                href="/login"
                variant="secondary"
                className="px-6 py-3 text-base"
              >
                Create Your Free Event
              </ButtonLink>
              <ButtonLink
                href="#demo"
                variant="ghost"
                className="text-white/80 hover:text-white"
              >
                Watch it in action →
              </ButtonLink>
            </div>
          </div>

          <div
            className={[
              styles.trustCard,
              isVisible ? styles.trustCardVisible : "",
            ].join(" ")}
          >
            <div className="rounded-3xl bg-gradient-to-br from-white/10 to-white/5 p-8 ring-1 ring-white/10 backdrop-blur-sm">
              <div className="text-sm font-semibold text-white/90 mb-6">
                Why teams choose us
              </div>

              <div className="space-y-5">
                {trustPoints.map((point, index) => (
                  <div
                    key={point.text}
                    className={[
                      styles.trustPoint,
                      isVisible ? styles.trustPointVisible : "",
                    ].join(" ")}
                    style={{
                      transitionDelay: `${0.3 + index * 0.15}s`,
                    }}
                  >
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${point.color}20`,
                        color: point.color,
                      }}
                    >
                      {point.icon}
                    </div>
                    <span className="text-sm text-white/80">{point.text}</span>
                  </div>
                ))}
              </div>

              <div className={[
                styles.socialProof,
                isVisible ? styles.socialProofVisible : "",
              ].join(" ")}>
                <div className="mt-8 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="size-8 rounded-full bg-gradient-to-br from-white/20 to-white/5 ring-2 ring-zinc-950 flex items-center justify-center text-xs font-medium text-white/60"
                        >
                          {["S", "M", "A", "J"][i]}
                        </div>
                      ))}
                    </div>
                    <div className="text-sm">
                      <span className="text-white/90">Join 100+ organizers</span>
                      <span className="text-white/50"> already on the platform</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
