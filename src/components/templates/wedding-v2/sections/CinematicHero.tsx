"use client";

import { cn } from "@/lib/utils";
import type { HeroConfig } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import { useTemporal } from "../../shared";
import styles from "./CinematicHero.module.css";

type CinematicHeroProps = {
  config: HeroConfig;
  heroAsset?: MediaAsset | null;
  primaryColor: string;
};

/**
 * Cinematic Hero - V2 wedding hero section
 *
 * Full-viewport hero with floating countdown card, schedule cards,
 * and decorative SVG kicker line. When `style` is "cinematic",
 * applies the premium visual treatment.
 */
export function CinematicHero({ config, heroAsset, primaryColor }: CinematicHeroProps) {
  const {
    title,
    subtitle,
    align = "center",
    overlay = "soft",
    style: heroStyle = "standard",
    showCountdown = false,
    showScheduleCards = false,
    coupleNames,
    monogram,
  } = config;

  const temporal = useTemporal();

  const isCinematic = heroStyle === "cinematic";

  const overlayClasses = {
    none: "",
    soft: "bg-black/30",
    strong: "bg-black/60",
  };

  const alignClasses = {
    left: "text-left items-start",
    center: "text-center items-center",
  };

  // Use temporal context for countdown
  const countdown = (() => {
    if (!showCountdown || !temporal?.shouldShowCountdown || !temporal.timeRemaining) return null;
    const { days, hours, minutes } = temporal.timeRemaining;
    return { days, hours, minutes };
  })();

  return (
    <section
      aria-label="Event hero"
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        isCinematic ? "min-h-screen" : "min-h-[60vh] md:min-h-[70vh]",
        styles.hero
      )}
    >
      {/* Background Image */}
      {heroAsset?.publicUrl ? (
        <img
          src={heroAsset.publicUrl}
          alt={heroAsset.alt || title}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            isCinematic && styles.parallaxBg
          )}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}40 100%)`,
          }}
        />
      )}

      {/* Overlay */}
      {overlay !== "none" && (
        <div className={cn("absolute inset-0", overlayClasses[overlay])} />
      )}

      {/* Cinematic vignette */}
      {isCinematic && <div className={styles.vignette} />}

      {/* Content */}
      <div
        className={cn(
          "relative z-10 flex w-full max-w-4xl flex-col px-4 py-16",
          alignClasses[align]
        )}
      >
        {/* Monogram above title (cinematic) */}
        {isCinematic && monogram && (
          <div
            className={styles.monogram}
            style={{ color: `${primaryColor}` }}
          >
            {monogram}
          </div>
        )}

        {/* Decorative line */}
        {isCinematic && (
          <div className={styles.kickerLine} aria-hidden="true">
            <svg width="120" height="2" viewBox="0 0 120 2">
              <line x1="0" y1="1" x2="120" y2="1" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
            </svg>
          </div>
        )}

        {/* Couple names (cinematic) or title */}
        {isCinematic && coupleNames ? (
          <>
            <h1
              className="mb-2 text-5xl font-bold tracking-tight text-white drop-shadow-lg md:text-6xl lg:text-7xl"
              style={{
                fontFamily: "var(--wedding-font-heading, Georgia, serif)",
                textShadow: "2px 2px 8px rgba(0,0,0,0.4)",
              }}
            >
              {coupleNames}
            </h1>
            {title && (
              <p className="mb-4 text-lg text-white/80 md:text-xl">
                {title}
              </p>
            )}
          </>
        ) : (
          <h1
            className="mb-4 text-4xl font-bold tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl"
            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}
          >
            {title}
          </h1>
        )}

        {subtitle && (
          <p
            className="max-w-2xl text-lg text-white/90 drop-shadow md:text-xl"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}
          >
            {subtitle}
          </p>
        )}

        {/* Floating Countdown Card */}
        {isCinematic && countdown && (
          <div className={cn("mt-8", styles.countdownCard)}>
            <div
              className="inline-flex gap-6 rounded-2xl border border-white/20 bg-white/10 px-8 py-4 backdrop-blur-md"
            >
              {[
                { value: countdown.days, label: "Days" },
                { value: countdown.hours, label: "Hours" },
                { value: countdown.minutes, label: "Minutes" },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-white md:text-4xl">
                    {value}
                  </span>
                  <span className="text-xs uppercase tracking-widest text-white/70">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating Schedule Cards */}
        {isCinematic && showScheduleCards && (
          <div className={cn("mt-6 flex gap-4", styles.scheduleCards)}>
            <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-center backdrop-blur-md">
              <p className="text-xs uppercase tracking-widest text-white/70">Ceremony</p>
              <p className="text-sm font-medium text-white">Details in schedule</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-center backdrop-blur-md">
              <p className="text-xs uppercase tracking-widest text-white/70">Reception</p>
              <p className="text-sm font-medium text-white">Details in schedule</p>
            </div>
          </div>
        )}
      </div>

      {/* Decorative gradient at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
