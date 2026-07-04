"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useIntersectionObserver, useReducedMotion } from "@/hooks";
import { cn } from "@/lib/utils";
import { Section } from "../ui/Section";
import { QrCodeIcon } from "../ui/icons";
import { STORY } from "./story";
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
 * telling the page's one story (see ./story.ts; same couple as the showcase
 * captures, same numbers as the ProductValueSplit console).
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
      { label: "Event name", value: STORY.eventName, type: "text" },
      { label: "Date & time", value: STORY.dateLine, type: "date" },
      { label: "Location", value: STORY.venue, type: "text" },
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
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isActive || reducedMotion) {
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
  }, [text, isActive, speed, reducedMotion]);

  if (!isActive) {
    return "";
  }
  // Reduced motion: the full value appears at once instead of typing out.
  return reducedMotion ? text : displayed;
}

/* Flips true `ms` after the card becomes active; resets when it deactivates.
   Folds in the isActive render guard so the flag is never stale-true during
   the deactivation frame (cleanup runs after the re-render). */
function useDelayedFlag(isActive: boolean, ms: number): boolean {
  const [flag, setFlag] = useState(false);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const timeout = setTimeout(() => setFlag(true), ms);
    return () => {
      clearTimeout(timeout);
      setFlag(false);
    };
  }, [isActive, ms]);

  return flag && isActive;
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
  const shouldType = useDelayedFlag(isActive, delay);
  const displayed = useTypewriter(value, shouldType);

  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldInput}>
        <span>{displayed}</span>
        {shouldType && displayed.length < value.length && (
          <span className={styles.cursor}>|</span>
        )}
      </div>
    </div>
  );
}

type TemplatePlate = {
  name: string;
  src: string;
  width: number;
  height: number;
};

/*
 * Pre-cropped webp thumbs (320x149, ~1-3KB each) derived from the real
 * captures in public/landing/templates/ — the picker shows the actual
 * templates without shipping the full-resolution originals (the custom image
 * loader passes marker-less public assets through untouched, so a sizes hint
 * cannot downscale them). Regenerate with sharp from ../<name>.jpg if a
 * capture is re-shot (crop focus: hero band at 12%, grand-luxe 30%,
 * scrapbook centered).
 */
const TEMPLATE_PLATES: TemplatePlate[] = [
  { name: "Cinematic", src: "/landing/templates/thumbs/cinematic.webp", width: 320, height: 149 },
  { name: "Grand Luxe", src: "/landing/templates/thumbs/grand-luxe.webp", width: 320, height: 149 },
  { name: "Celebration", src: "/landing/templates/thumbs/celebration.webp", width: 320, height: 149 },
  { name: "Scrapbook", src: "/landing/templates/thumbs/scrapbook.webp", width: 320, height: 149 },
];

function TemplatesContent({ isActive }: { isActive: boolean }) {
  const selected = useDelayedFlag(isActive, 900);

  return (
    <div className={styles.templateGrid}>
      {TEMPLATE_PLATES.map((plate, i) => (
        <div
          key={plate.name}
          className={cn(styles.plate, selected && i === 0 && styles.plateSelected)}
        >
          <div className={styles.plateThumb}>
            <Image
              src={plate.src}
              alt=""
              width={plate.width}
              height={plate.height}
              className={styles.plateThumbImg}
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
  const sent = useDelayedFlag(isActive, 600);

  return (
    <div className={cn(styles.share, sent && styles.shareSent)}>
      {SHARE_CHANNELS.map((channel) => (
        <div key={channel.label} className={styles.shareRow}>
          <span className={styles.shareIcon}>{channel.icon}</span>
          <span className={styles.shareLabel}>{channel.label}</span>
          <span className={styles.sharePill}>{channel.status}</span>
        </div>
      ))}
      <div className={styles.shareNote}>
        <QrCodeIcon className="size-3.5 shrink-0" />
        QR passes attach to every confirmation email
      </div>
    </div>
  );
}

function DashboardContent({ isActive }: { isActive: boolean }) {
  const showStats = useDelayedFlag(isActive, 300);

  return (
    <div className={styles.dashboard}>
      <div className={styles.statusBadge}>
        <span className={styles.statusDotLive} />
        Live
      </div>

      <div className={styles.eventHeader}>
        <div className={styles.eventDate}>
          <span className={styles.eventDateDay}>{STORY.dateDay}</span>
          <span className={styles.eventDateMonth}>{STORY.dateMonth}</span>
        </div>
        <div className={styles.eventInfo}>
          <div className={styles.eventTitle}>{STORY.eventName}</div>
          <div className={styles.eventMeta}>{`${STORY.time} · ${STORY.venue}`}</div>
        </div>
      </div>

      <div className={cn(styles.statsGrid, showStats && styles.statsVisible)}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{STORY.responded}</div>
          <div className={styles.statLabel}>RSVPs in</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{STORY.invited}</div>
          <div className={styles.statLabel}>Invited</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{STORY.daysToGo}</div>
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
      className={cn(
        styles.card,
        isActive && styles.cardActive,
        step.variant === "dashboard" && styles.cardDashboard
      )}
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
  const [hasInteracted, setHasInteracted] = useState(false);
  const { ref: sectionRef, hasBeenVisible: isVisible } = useIntersectionObserver({
    threshold: 0.3,
    triggerOnce: true,
  });

  const handleStepSelect = (index: number) => {
    setActiveStep(index);
    setHasInteracted(true);
  };

  useEffect(() => {
    // Auto-advance until the user takes control via the step buttons — then
    // the demo becomes click-to-explore. Reduced-motion users keep the
    // auto-advance (hiding steps 2-4 from them would remove content, and the
    // CSS reduced-motion block turns the card swap into a plain crossfade);
    // the step buttons double as the WCAG pause control.
    if (!isVisible || hasInteracted) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, STEP_DURATION);

    return () => clearInterval(interval);
  }, [isVisible, hasInteracted]);

  const isLastStep = activeStep === steps.length - 1;

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

        <div className="flex items-center justify-center gap-2 mb-4 sm:mb-10">
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
                  className={cn(
                    styles.stepIndicator,
                    i === activeStep && styles.stepActive,
                    i < activeStep && styles.stepComplete
                  )}
                >
                  {i < activeStep ? (
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{step.id}</span>
                  )}
                </span>
                {/* Labels don't fit below sm; the active one renders in a
                    dedicated line under the row so the circles never shift. */}
                <span
                  className={cn(
                    "ml-2 text-sm font-medium transition-colors hidden sm:inline",
                    i === activeStep ? "text-white" : "text-white/50"
                  )}
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

        <div aria-hidden className="sm:hidden mb-10 text-center text-sm font-medium text-white">
          {steps[activeStep].label}
        </div>

        <div className="relative flex justify-center items-center min-h-[340px]">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={cn(
                styles.cardWrapper,
                i === activeStep && styles.cardWrapperActive,
                i < activeStep && styles.cardWrapperLeft,
                i > activeStep && styles.cardWrapperRight
              )}
            >
              <StepCard step={step} isActive={i === activeStep && isVisible} />
            </div>
          ))}
        </div>

        <div className={cn(styles.successHint, isLastStep && styles.successHintVisible)}>
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
