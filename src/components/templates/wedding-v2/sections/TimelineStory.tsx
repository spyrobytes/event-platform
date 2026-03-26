"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { MediaAsset } from "@prisma/client";
import type { Milestone } from "@/schemas/event-page";
import styles from "./TimelineStory.module.css";

type TimelineStoryProps = {
  data: {
    heading?: string;
    content: string;
    layout?: "full" | "split" | "timeline";
    imageAssetId?: string;
    milestones?: Milestone[];
  };
  assets: MediaAsset[];
};

/**
 * Timeline Story — POC-parity rewrite
 *
 * 2-column grid with scroll-drawn SVG timeline + sticky photo.
 * SVG progress track draws on scroll. Milestone circles animate
 * with dash-draw, inner dot, pulse ring, and golden glow burst.
 */
export function TimelineStory({ data, assets }: TimelineStoryProps) {
  const {
    heading = "Our Story",
    content,
    layout = "timeline",
    milestones = [],
    imageAssetId,
  } = data;

  const timelineRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fillRef = useRef<SVGLineElement>(null);
  const [kickerDrawn, setKickerDrawn] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const kickerRef = useRef<HTMLParagraphElement>(null);
  const reachedRef = useRef<Set<number>>(new Set());

  const getAssetUrl = (assetId?: string): string | null => {
    if (!assetId) return null;
    const asset = assets.find((a) => a.id === assetId);
    return asset?.publicUrl || null;
  };

  const storyPhotoUrl = getAssetUrl(imageAssetId);
  const kickerText = "Our Story";
  const showKicker = kickerText.toLowerCase() !== heading.toLowerCase();
  const hasMilestones = milestones.length > 0;
  // Respect the user's layout choice:
  // - "full": text-only, ignores milestones
  // - "split": text + image side-by-side, ignores milestones
  // - "timeline": full timeline with milestones (falls back to full if none)
  const effectiveLayout = layout === "timeline" && !hasMilestones ? "full" : layout;

  // Kicker underline draw on scroll
  useEffect(() => {
    if (kickerDrawn) return; // already drawn (e.g., reduced motion)
    const el = kickerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setKickerDrawn(true);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [kickerDrawn]);

  // Scroll-driven timeline animation
  const layoutAndAnimate = useCallback(() => {
    const timeline = timelineRef.current;
    const svg = svgRef.current;
    const fill = fillRef.current;
    if (!timeline || !svg || !fill) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = timeline.querySelectorAll<HTMLElement>("[data-tl-item]");
    const milestoneGroups = svg.querySelectorAll<SVGGElement>(".tl-milestone");

    const scrollTop = window.scrollY;
    const timelineRect = timeline.getBoundingClientRect();
    const timelineTop = timelineRect.top + scrollTop;
    const timelineH = timeline.offsetHeight;

    // Set SVG line endpoints
    const bgLine = svg.querySelector(".tl-track-bg");
    if (bgLine) {
      bgLine.setAttribute("y1", "8");
      bgLine.setAttribute("y2", String(timelineH - 8));
    }
    fill.setAttribute("y1", "8");
    fill.setAttribute("y2", String(timelineH - 8));

    const lineLen = timelineH - 16;
    fill.style.strokeDasharray = String(lineLen);

    if (reducedMotion) {
      fill.style.strokeDashoffset = "0";
      milestoneGroups.forEach((g) => {
        g.querySelector(".tl-circle-fill")?.classList.add("drawn");
        g.querySelector(".tl-circle-dot")?.classList.add("filled");
      });
      items.forEach((item) => {
        item.classList.add(styles.reached);
        const card = item.querySelector("[data-tl-card]");
        if (card) card.classList.add(styles.cardRevealed);
      });
      return;
    }

    // Position milestone circles at their item positions
    const positions: number[] = [];
    items.forEach((item, i) => {
      const itemRect = item.getBoundingClientRect();
      const itemTop = itemRect.top + scrollTop;
      const y = itemTop - timelineTop + 12;
      positions.push(y);

      const g = milestoneGroups[i];
      if (!g) return;
      g.querySelectorAll("circle").forEach((c) => {
        c.setAttribute("cy", String(y));
      });
    });

    // Calculate progress and draw
    const viewMid = scrollTop + window.innerHeight * 0.65;
    const progress = Math.min(1, Math.max(0, (viewMid - timelineTop) / (timelineTop + timelineH - timelineTop)));
    const offset = lineLen * (1 - progress);
    fill.style.strokeDashoffset = String(Math.max(0, offset));

    // Check milestones
    positions.forEach((yPos, i) => {
      const milestoneScrollY = timelineTop + yPos;
      if (viewMid >= milestoneScrollY && !reachedRef.current.has(i)) {
        reachedRef.current.add(i);

        const g = milestoneGroups[i];
        const item = items[i];
        if (!g || !item) return;

        const cf = g.querySelector(".tl-circle-fill");
        const cd = g.querySelector(".tl-circle-dot");
        const cp = g.querySelector(".tl-circle-pulse");
        const glow = g.querySelector(".tl-glow");

        if (cf) cf.classList.add("drawn");
        setTimeout(() => {
          if (cd) cd.classList.add("filled");
          if (cp) cp.classList.add("active");
          if (glow) glow.classList.add("active");
        }, 200);

        item.classList.add(styles.reached);
        const card = item.querySelector("[data-tl-card]");
        if (card) setTimeout(() => card.classList.add(styles.cardRevealed), 150);
      }
    });
  }, []);

  useEffect(() => {
    if (effectiveLayout !== "timeline") return;
    // Initial layout
    requestAnimationFrame(() => {
      layoutAndAnimate();
    });

    const handleScroll = () => layoutAndAnimate();
    window.addEventListener("scroll", handleScroll, { passive: true });

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => layoutAndAnimate(), 200);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [effectiveLayout, layoutAndAnimate]);

  if (effectiveLayout === "full") {
    return (
      <section className="section" style={{ padding: "var(--section-y, 96px) 0" }} aria-label="Our story" id="story">
        <div style={{ width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))", margin: "0 auto" }}>
          <div className={styles.sectionHeader}>
            <p ref={kickerRef} className={`${styles.kicker} ${kickerDrawn ? styles.kickerDrawn : ""}`}>
              {heading}
            </p>
          </div>
          <div style={{ maxWidth: "56ch", margin: "0 auto", textAlign: "center" }}>
            <p style={{ color: "var(--text-2)", lineHeight: 1.75, whiteSpace: "pre-line" }}>{content}</p>
          </div>
        </div>
      </section>
    );
  }

  if (effectiveLayout === "split") {
    return (
      <section className="section" style={{ padding: "var(--section-y, 96px) 0" }} aria-label="Our story" id="story">
        <div style={{ width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))", margin: "0 auto" }}>
          <div className={styles.sectionHeader}>
            <p ref={kickerRef} className={`${styles.kicker} ${kickerDrawn ? styles.kickerDrawn : ""}`}>
              Our Story
            </p>
            <h2 className={styles.heading}>{heading}</h2>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: storyPhotoUrl ? "1fr 1fr" : "1fr",
            gap: "clamp(24px, 4vw, 48px)",
            alignItems: "center",
          }}>
            <div style={{ maxWidth: "56ch" }}>
              <p style={{ color: "var(--text-2)", lineHeight: 1.75, whiteSpace: "pre-line" }}>{content}</p>
            </div>
            {storyPhotoUrl && (
              <div style={{
                borderRadius: "var(--r-lg, 24px)",
                overflow: "hidden",
                boxShadow: "var(--shadow-lg)",
              }}>
                <img
                  src={storyPhotoUrl}
                  alt="Our story"
                  loading="lazy"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
            )}
          </div>
        </div>
        <style>{`
          @media (max-width: 700px) {
            #story [style*="grid-template-columns: 1fr 1fr"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </section>
    );
  }

  const isLastMilestone = (index: number) => index === milestones.length - 1;

  return (
    <section
      className="section"
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="Our story timeline"
      id="story"
    >
      <div style={{ width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))", margin: "0 auto" }}>
        {/* Section header */}
        <div className={styles.sectionHeader}>
          {showKicker && (
            <p
              ref={kickerRef}
              className={`${styles.kicker} ${kickerDrawn ? styles.kickerDrawn : ""}`}
            >
              {kickerText}
            </p>
          )}
          <h2 className={styles.heading}>{heading}</h2>
          {content && <p className={styles.intro}>{content}</p>}
        </div>

        {/* Story grid: timeline + sticky photo */}
        <div className={styles.storyGrid}>
          <div ref={timelineRef} className={styles.timeline}>
            {/* SVG progress track */}
            <div className={styles.track} aria-hidden="true">
              <svg
                ref={svgRef}
                className={styles.trackSvg}
                width="48"
                height="100%"
                overflow="visible"
              >
                <defs>
                  <linearGradient id="tlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--sage-l, #a8b8a0)" />
                    <stop offset="60%" stopColor="var(--accent, #7a8c72)" />
                    <stop offset="100%" stopColor="var(--gold-l, #ddc07a)" />
                  </linearGradient>
                </defs>
                {/* Background line */}
                <line
                  className="tl-track-bg"
                  x1="24"
                  y1="0"
                  x2="24"
                  y2="100%"
                  stroke="var(--linen, #e8e1d6)"
                  strokeWidth="1.5"
                  fill="none"
                />
                {/* Progress fill line */}
                <line
                  ref={fillRef}
                  className="tl-track-fill"
                  x1="24"
                  y1="0"
                  x2="24"
                  y2="100%"
                  stroke="url(#tlGradient)"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  style={{ strokeDasharray: 1000, strokeDashoffset: 1000, transition: "stroke-dashoffset 60ms linear" }}
                />

                {/* Milestone circles */}
                {milestones.map((_, i) => {
                  const isGold = isLastMilestone(i);
                  return (
                    <g key={i} className="tl-milestone" data-index={i}>
                      {isGold && (
                        <circle className="tl-glow" cx="24" cy="0" r="8" fill="none" stroke="var(--gold-l, #ddc07a)" opacity="0" />
                      )}
                      <circle
                        className={`tl-circle-pulse ${isGold ? "tl-circle-pulse--gold" : ""}`}
                        cx="24" cy="0" r="8"
                        fill="none"
                        stroke={isGold ? "var(--gold-l, #ddc07a)" : "var(--sage-l, #a8b8a0)"}
                        strokeWidth="1" opacity="0"
                      />
                      <circle
                        className="tl-circle-bg"
                        cx="24" cy="0" r="8"
                        fill="none"
                        stroke="var(--linen, #e8e1d6)"
                        strokeWidth="1.5"
                      />
                      <circle
                        className={`tl-circle-fill ${isGold ? "tl-circle-fill--gold" : ""}`}
                        cx="24" cy="0" r="8"
                        fill="none"
                        stroke={isGold ? "var(--gold, #c5a55a)" : "var(--accent, #7a8c72)"}
                        strokeWidth="2" strokeLinecap="round"
                        style={{ strokeDasharray: "50.27", strokeDashoffset: "50.27", transition: "stroke-dashoffset .6s var(--ease-out-expo, cubic-bezier(.16,1,.3,1))" }}
                      />
                      <circle
                        className={`tl-circle-dot ${isGold ? "tl-circle-dot--gold" : ""}`}
                        cx="24" cy="0" r="0"
                        fill={isGold ? "var(--gold-l, #ddc07a)" : "var(--sage-l, #a8b8a0)"}
                        style={{ transition: "r .4s .2s var(--ease-out-expo, cubic-bezier(.16,1,.3,1))" }}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Timeline items */}
            {milestones.map((milestone, i) => {
              const isGold = isLastMilestone(i);
              return (
                <div
                  key={i}
                  className={styles.tlItem}
                  data-tl-item={i}
                >
                  <div className={styles.dateCol}>
                    <span className={styles.dateText}>{milestone.year}</span>
                  </div>
                  <div className={styles.dotCol} />
                  <div className={styles.contentCol}>
                    <div className={styles.dateMobile}>
                      <span className={styles.dateText}>{milestone.year}</span>
                    </div>
                    <div
                      className={styles.card}
                      data-tl-card
                      style={isGold ? { borderColor: "var(--gold-l, #ddc07a)" } : undefined}
                    >
                      <h3 className={styles.cardTitle}>{milestone.title}</h3>
                      <p className={styles.cardDesc}>{milestone.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky photo */}
          {storyPhotoUrl && (
            <div className={styles.stickyPhoto}>
              <img
                src={storyPhotoUrl}
                alt="Couple photo"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>

      {/* SVG animation styles (injected via style tag for class-based animations) */}
      <style>{`
        .tl-circle-fill.drawn { stroke-dashoffset: 0 !important; }
        .tl-circle-dot.filled { r: 4 !important; }
        .tl-circle-pulse.active { animation: circlePulse .8s var(--ease-out-expo, cubic-bezier(.16,1,.3,1)) forwards; }
        .tl-glow.active { animation: glowBurst 1.2s var(--ease-out-expo, cubic-bezier(.16,1,.3,1)) forwards; }
        @keyframes circlePulse {
          0%   { r: 8; opacity: .6; stroke-width: 2; }
          100% { r: 20; opacity: 0; stroke-width: 0.5; }
        }
        @keyframes glowBurst {
          0%   { r: 6; opacity: .5; stroke-width: 3; }
          50%  { opacity: .3; }
          100% { r: 32; opacity: 0; stroke-width: 0.5; }
        }
      `}</style>
    </section>
  );
}
