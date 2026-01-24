"use client";

import { useEffect, useState, useRef } from "react";
import { Section } from "../ui/Section";
import styles from "./CreationDemo.module.css";

type Step = {
  id: number;
  label: string;
  title: string;
  variant: "form" | "dashboard";
  fields?: { label: string; value: string; type?: "text" | "date" | "textarea" }[];
  buttonLabel?: string;
};

const steps: Step[] = [
  {
    id: 1,
    label: "Sign up",
    title: "Create your account",
    variant: "form",
    fields: [
      { label: "Email", value: "sarah@company.co", type: "text" },
      { label: "Password", value: "••••••••••••", type: "text" },
    ],
    buttonLabel: "Create Account",
  },
  {
    id: 2,
    label: "Log in",
    title: "Welcome back",
    variant: "form",
    fields: [
      { label: "Email", value: "sarah@company.co", type: "text" },
      { label: "Password", value: "••••••••••••", type: "text" },
    ],
    buttonLabel: "Sign In",
  },
  {
    id: 3,
    label: "Create event",
    title: "New Event",
    variant: "form",
    fields: [
      { label: "Event name", value: "Summer Product Launch 2025", type: "text" },
      { label: "Date & time", value: "Aug 15, 2025 · 6:00 PM", type: "date" },
      { label: "Location", value: "The Grand Hall, San Francisco", type: "text" },
    ],
    buttonLabel: "Publish Event",
  },
  {
    id: 4,
    label: "Live!",
    title: "Summer Product Launch 2025",
    variant: "dashboard",
  },
];

const STEP_DURATION = 4000;
const TYPE_SPEED = 50;

function useTypewriter(text: string, isActive: boolean, speed: number = TYPE_SPEED) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    // Reset index when starting fresh
    indexRef.current = 0;

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => {
      clearInterval(interval);
      setDisplayed("");
      indexRef.current = 0;
    };
  }, [text, isActive, speed]);

  // When not active, return empty string without triggering a state update
  return isActive ? displayed : "";
}

function TypewriterField({
  label,
  value,
  isActive,
  delay = 0,
}: {
  label: string;
  value: string;
  isActive: boolean;
  delay?: number;
}) {
  const [shouldType, setShouldType] = useState(false);
  const displayed = useTypewriter(value, shouldType && isActive);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const timeout = setTimeout(() => setShouldType(true), delay);
    return () => {
      clearTimeout(timeout);
      setShouldType(false);
    };
  }, [isActive, delay]);

  const effectiveShouldType = shouldType && isActive;

  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldInput}>
        <span>{displayed}</span>
        {effectiveShouldType && displayed.length < value.length && (
          <span className={styles.cursor}>|</span>
        )}
      </div>
    </div>
  );
}

function DashboardContent({ isActive }: { isActive: boolean }) {
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const timeout = setTimeout(() => setShowStats(true), 300);
    return () => {
      clearTimeout(timeout);
      setShowStats(false);
    };
  }, [isActive]);

  const effectiveShowStats = showStats && isActive;

  return (
    <div className={styles.dashboard}>
      <div className={styles.statusBadge}>
        <span className={styles.statusDotLive} />
        Live
      </div>

      <div className={styles.eventHeader}>
        <div className={styles.eventDate}>
          <span className={styles.eventDateDay}>15</span>
          <span className={styles.eventDateMonth}>AUG</span>
        </div>
        <div className={styles.eventInfo}>
          <div className={styles.eventTitle}>Summer Product Launch 2025</div>
          <div className={styles.eventMeta}>6:00 PM · The Grand Hall, SF</div>
        </div>
      </div>

      <div className={[styles.statsGrid, effectiveShowStats ? styles.statsVisible : ""].join(" ")}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>247</div>
          <div className={styles.statLabel}>RSVPs</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>89%</div>
          <div className={styles.statLabel}>Open rate</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>12</div>
          <div className={styles.statLabel}>Days left</div>
        </div>
      </div>

      <div className={styles.dashboardActions}>
        <div className={styles.actionButton}>Share Event</div>
        <div className={styles.actionButtonSecondary}>Send Update</div>
      </div>
    </div>
  );
}

function StepCard({ step, isActive, isPast }: { step: Step; isActive: boolean; isPast: boolean }) {
  return (
    <div
      className={[
        styles.card,
        isActive ? styles.cardActive : "",
        isPast ? styles.cardPast : "",
        step.variant === "dashboard" ? styles.cardDashboard : "",
      ].join(" ")}
    >
      <div className={styles.cardHeader}>
        <div className={styles.windowControls}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
        <span className={styles.cardTitle}>
          {step.variant === "dashboard" ? "Event Dashboard" : step.title}
        </span>
      </div>
      <div className={styles.cardBody}>
        {step.variant === "form" && step.fields && (
          <>
            {step.fields.map((field, i) => (
              <TypewriterField
                key={field.label}
                label={field.label}
                value={field.value}
                isActive={isActive}
                delay={i * 600}
              />
            ))}
            {step.buttonLabel && (
              <div className={styles.cardButton}>{step.buttonLabel}</div>
            )}
          </>
        )}
        {step.variant === "dashboard" && (
          <DashboardContent isActive={isActive} />
        )}
      </div>
    </div>
  );
}

export function CreationDemo() {
  const [activeStep, setActiveStep] = useState(0);
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

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, STEP_DURATION);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <Section id="demo" className="bg-zinc-950 overflow-hidden">
      <div ref={sectionRef}>
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            From zero to live event in minutes
          </h2>
          <p className="mt-3 text-base text-white/70">
            Three simple steps. No complexity. Just results.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div
                className={[
                  styles.stepIndicator,
                  i === activeStep ? styles.stepActive : "",
                  i < activeStep ? styles.stepComplete : "",
                ].join(" ")}
              >
                {i < activeStep ? (
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <span
                className={[
                  "ml-2 text-sm font-medium transition-colors",
                  i === activeStep ? "text-white" : "text-white/50",
                ].join(" ")}
              >
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <div className={styles.connector}>
                  <svg className="size-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="relative flex justify-center items-center min-h-[340px]">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={[
                styles.cardWrapper,
                i === activeStep ? styles.cardWrapperActive : "",
                i < activeStep ? styles.cardWrapperLeft : "",
                i > activeStep ? styles.cardWrapperRight : "",
              ].join(" ")}
            >
              <StepCard
                step={step}
                isActive={i === activeStep && isVisible}
                isPast={i < activeStep}
              />
            </div>
          ))}
        </div>

        <div className={[
          styles.successHint,
          activeStep === 3 ? styles.successHintVisible : "",
        ].join(" ")}>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm text-emerald-400 ring-1 ring-emerald-500/30">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Your event is live — start sharing and tracking RSVPs
          </div>
        </div>
      </div>
    </Section>
  );
}
