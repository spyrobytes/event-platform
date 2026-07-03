"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useReducedMotion } from "@/hooks";
import { Section } from "../ui/Section";
import styles from "./CreationDemo.module.css";

type Step = {
  id: number;
  label: string;
  title: string;
  variant: "templates" | "form" | "share" | "dashboard";
  fields?: { label: string; value: string; type?: "text" | "date" | "textarea" }[];
  buttonLabel?: string;
};

/*
 * The demo walks the real product loop — template, details, share, track —
 * telling the page's one story (Avery & Jordan, same couple as the showcase
 * captures; RSVP numbers match the ProductValueSplit planner mock).
 */
const steps: Step[] = [
  {
    id: 1,
    label: "Pick template",
    title: "Choose a template",
    variant: "templates",
  },
  {
    id: 2,
    label: "Details",
    title: "New Event",
    variant: "form",
    fields: [
      { label: "Event name", value: "Avery & Jordan's Wedding", type: "text" },
      { label: "Date & time", value: "Sat, Jun 20, 2026 · 4:00 PM", type: "date" },
      { label: "Location", value: "Rosewood Garden Estate", type: "text" },
    ],
    buttonLabel: "Publish Event",
  },
  {
    id: 3,
    label: "Share",
    title: "Invite your guests",
    variant: "share",
  },
  {
    id: 4,
    label: "Track",
    title: "Event Dashboard",
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

/* The same real captures the TemplateShowcase plates use — the picker shows
   the actual templates, not color swatches. */
const TEMPLATE_PLATES = [
  { name: "Cinematic", src: "/landing/templates/cinematic.jpg", width: 860, height: 1760 },
  { name: "Grand Luxe", src: "/landing/templates/grand-luxe.jpg", width: 860, height: 1760, focusMid: true },
  { name: "Celebration", src: "/landing/templates/celebration.jpg", width: 860, height: 1760 },
  { name: "Scrapbook", src: "/landing/templates/scrapbook.jpg", width: 1805, height: 547, wide: true },
];

function TemplatesContent({ isActive }: { isActive: boolean }) {
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const timeout = setTimeout(() => setSelected(true), 900);
    return () => {
      clearTimeout(timeout);
      setSelected(false);
    };
  }, [isActive]);

  return (
    <div className={styles.templateGrid}>
      {TEMPLATE_PLATES.map((plate, i) => (
        <div
          key={plate.name}
          className={[
            styles.plate,
            selected && isActive && i === 0 ? styles.plateSelected : "",
          ].join(" ")}
        >
          <div className={styles.plateThumb}>
            <Image
              src={plate.src}
              alt=""
              width={plate.width}
              height={plate.height}
              sizes="160px"
              className={[
                styles.plateThumbImg,
                plate.wide ? styles.plateThumbImgWide : "",
                plate.focusMid ? styles.plateThumbImgMid : "",
              ].join(" ")}
            />
          </div>
          <div className={styles.plateName}>{plate.name}</div>
          <span className={styles.plateCheck}>
            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        </div>
      ))}
    </div>
  );
}

const SHARE_CHANNELS = [
  {
    label: "WhatsApp",
    status: "Sent",
    icon: (
      <svg aria-hidden className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
  {
    label: "Text message",
    status: "Sent",
    icon: (
      <svg aria-hidden className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
  },
  {
    label: "Copy link",
    status: "Copied",
    icon: (
      <svg aria-hidden className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
  },
];

function ShareContent({ isActive }: { isActive: boolean }) {
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const timeout = setTimeout(() => setSent(true), 600);
    return () => {
      clearTimeout(timeout);
      setSent(false);
    };
  }, [isActive]);

  return (
    <div className={[styles.share, sent && isActive ? styles.shareSent : ""].join(" ")}>
      {SHARE_CHANNELS.map((channel) => (
        <div key={channel.label} className={styles.shareRow}>
          <span className={styles.shareIcon}>{channel.icon}</span>
          <span className={styles.shareLabel}>{channel.label}</span>
          <span className={styles.sharePill}>{channel.status}</span>
        </div>
      ))}
      <div className={styles.shareNote}>
        <svg aria-hidden className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        </svg>
        QR passes attach to every confirmation email
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
          <span className={styles.eventDateDay}>20</span>
          <span className={styles.eventDateMonth}>JUN</span>
        </div>
        <div className={styles.eventInfo}>
          <div className={styles.eventTitle}>Avery &amp; Jordan&apos;s Wedding</div>
          <div className={styles.eventMeta}>4:00 PM · Rosewood Garden Estate</div>
        </div>
      </div>

      <div className={[styles.statsGrid, effectiveShowStats ? styles.statsVisible : ""].join(" ")}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>86</div>
          <div className={styles.statLabel}>RSVPs in</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>120</div>
          <div className={styles.statLabel}>Invited</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>164</div>
          <div className={styles.statLabel}>Days to go</div>
        </div>
      </div>

      <div className={styles.dashboardActions}>
        <div className={styles.actionButton}>Share Event</div>
        <div className={styles.actionButtonSecondary}>Send Update</div>
      </div>
    </div>
  );
}

function StepCard({ step, isActive }: { step: Step; isActive: boolean }) {
  return (
    <div
      className={[
        styles.card,
        isActive ? styles.cardActive : "",
        step.variant === "dashboard" ? styles.cardDashboard : "",
      ].join(" ")}
    >
      <div className={styles.cardHeader}>
        <div className={styles.windowControls}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
        <span className={styles.cardTitle}>{step.title}</span>
      </div>
      <div className={styles.cardBody}>
        {step.variant === "templates" && <TemplatesContent isActive={isActive} />}
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
        {step.variant === "share" && <ShareContent isActive={isActive} />}
        {step.variant === "dashboard" && <DashboardContent isActive={isActive} />}
      </div>
    </div>
  );
}

export function CreationDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const handleStepSelect = (index: number) => {
    setActiveStep(index);
    setHasInteracted(true);
  };

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
    // No auto-advance for reduced-motion users or once the user has taken
    // control via the step buttons — the demo becomes click-to-explore.
    if (!isVisible || reducedMotion || hasInteracted) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, STEP_DURATION);

    return () => clearInterval(interval);
  }, [isVisible, reducedMotion, hasInteracted]);

  return (
    <Section id="demo" className="bg-zinc-950 overflow-hidden">
      <div ref={sectionRef}>
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            From zero to live event in minutes
          </h2>
          <p className="mt-3 text-base text-white/70">
            Pick a template, add the details, share it — then watch the RSVPs land.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => handleStepSelect(i)}
                aria-current={i === activeStep ? "step" : undefined}
                aria-label={`Show step ${step.id}: ${step.label}`}
                className={styles.stepButton}
              >
                <span
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
                </span>
                {/* Below sm only the active step's label fits — the rest
                    stay as numbered circles. */}
                <span
                  className={[
                    "ml-2 text-sm font-medium transition-colors",
                    i === activeStep
                      ? "text-white"
                      : "hidden sm:inline text-white/50",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </button>
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
              <StepCard step={step} isActive={i === activeStep && isVisible} />
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
            Your event is live — RSVPs land here in real time
          </div>
        </div>
      </div>
    </Section>
  );
}
