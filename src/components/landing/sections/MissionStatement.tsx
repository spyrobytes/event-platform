"use client";

import { useEffect, useRef, useState } from "react";
import { Section } from "../ui/Section";
import styles from "./MissionStatement.module.css";

export function MissionStatement() {
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
    <Section id="mission" className="bg-zinc-50 overflow-hidden">
      <div ref={sectionRef} className="relative">
        <div className={styles.bgPattern} aria-hidden="true" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div
            className={[
              styles.badge,
              isVisible ? styles.badgeVisible : "",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-4 py-1.5 text-xs font-medium text-black/60 ring-1 ring-black/5">
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
              Our Mission
            </span>
          </div>

          <div
            className={[
              styles.quote,
              isVisible ? styles.quoteVisible : "",
            ].join(" ")}
          >
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-black sm:text-4xl lg:text-5xl">
              Make it effortless to bring people together
            </h2>
          </div>

          <div
            className={[
              styles.supporting,
              isVisible ? styles.supportingVisible : "",
            ].join(" ")}
          >
            <p className="mt-6 text-lg leading-relaxed text-black/60 sm:text-xl">
              Without fighting tools, workflows, or limits.
            </p>

            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="h-px w-12 bg-black/10" />
              <svg
                className="size-5 text-black/20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <div className="h-px w-12 bg-black/10" />
            </div>

            <p className="mt-8 text-base text-black/50 max-w-lg mx-auto">
              Events are about people, not spreadsheets. We build software that stays
              out of the way — and works when it matters.
            </p>
          </div>

          <div
            className={[
              styles.values,
              isVisible ? styles.valuesVisible : "",
            ].join(" ")}
          >
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              {["Simplicity", "Reliability", "Performance"].map((value, index) => (
                <span
                  key={value}
                  className={[
                    styles.valuePill,
                    isVisible ? styles.valuePillVisible : "",
                  ].join(" ")}
                  style={{
                    transitionDelay: `${0.6 + index * 0.1}s`,
                  }}
                >
                  {value}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
