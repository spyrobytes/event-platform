"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import styles from "./Confetti.module.css";

type ConfettiProps = {
  active: boolean;
  /** Number of particles. Default 55 */
  count?: number;
};

/**
 * Mulberry32 — a 32-bit integer PRNG that produces identical results
 * on every JS engine. Uses only integer arithmetic so there's no
 * platform-dependent floating-point divergence → no SSR hydration mismatches.
 */
function createRng(seed: number) {
  let s = seed | 0;
  return (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function r(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

type Particle = {
  x: string;
  y: string;
  dx: string;
  dy: string;
  size: string;
  color: string;
  radius: string;
  duration: string;
  delay: string;
  spinMid: string;
  spinEnd: string;
  shimmer: boolean;
};

const COLORS = [
  "var(--sb-gold)",
  "var(--sb-gold-light)",
  "var(--sb-gold-dark)",
  "var(--sb-rose)",
  "var(--sb-sage)",
  "rgba(240, 245, 255, 0.7)",
  "rgba(201, 169, 110, 0.6)",
];

/**
 * CSS-only confetti burst with deterministic PRNG for SSR safety.
 */
export function Confetti({ active, count = 55 }: ConfettiProps) {
  const particles = useMemo<Particle[]>(() => {
    const rng = createRng(42);

    return Array.from({ length: count }, () => {
      const r1 = rng();
      const r2 = rng();
      const r3 = rng();
      const r4 = rng();
      const r5 = rng();
      const r6 = rng();
      const r7 = rng();

      const startX = 40 + r1 * 20;
      const startY = 35 + r2 * 30;

      const angle = r3 * Math.PI * 2;
      const distance = 80 + r4 * 250;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 60;

      const size = r5 < 0.3 ? 3 + r5 * 4 : 5 + r5 * 7;
      const isRound = r6 < 0.35;

      return {
        x: `${r(startX)}%`,
        y: `${r(startY)}%`,
        dx: `${r(dx, 0)}px`,
        dy: `${r(dy, 0)}px`,
        size: `${r(size, 0)}px`,
        color: COLORS[Math.floor(r3 * COLORS.length)],
        radius: isRound ? "50%" : `${r(1 + r6 * 2)}px`,
        duration: `${r(2 + r4 * 1.5)}s`,
        delay: `${r(r7 * 0.6)}s`,
        spinMid: `${r(r5 * 180 - 90, 0)}deg`,
        spinEnd: `${r(r6 * 720 - 360, 0)}deg`,
        shimmer: r7 < 0.25,
      };
    });
  }, [count]);

  return (
    <div className={styles.confettiContainer} aria-hidden>
      {particles.map((p, i) => (
        <div
          key={i}
          className={cn(
            styles.particle,
            active && styles.particleActive,
            p.shimmer && styles.shimmer,
          )}
          style={{
            "--x": p.x,
            "--y": p.y,
            "--dx": p.dx,
            "--dy": p.dy,
            "--size": p.size,
            "--color": p.color,
            "--radius": p.radius,
            "--duration": p.duration,
            "--delay": p.delay,
            "--spin-mid": p.spinMid,
            "--spin-end": p.spinEnd,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
