"use client";

import { cn } from "@/lib/utils";
import styles from "./TemporalComponents.module.css";

/**
 * Confetti Burst
 *
 * One-shot celebratory burst fired when the countdown reaches zero.
 * Particle geometry is deterministic (golden-angle fan + index hashing) so
 * render stays pure and SSR-stable — no Math.random. Motion lives in the
 * CSS module; prefers-reduced-motion suppresses the pieces entirely.
 */

const PIECE_COUNT = 24;
const GOLDEN_ANGLE_DEG = 137.508;

type ConfettiPiece = {
  dx: string;
  dy: string;
  rot: string;
  delay: string;
  duration: string;
};

const PIECES: ConfettiPiece[] = Array.from({ length: PIECE_COUNT }, (_, i) => {
  const angle = ((i * GOLDEN_ANGLE_DEG) % 360) * (Math.PI / 180);
  const distance = 90 + ((i * 53) % 80);
  // Vertical squash + upward bias: fountain, not an even radial ring
  const dx = Math.round(Math.cos(angle) * distance);
  const dy = Math.round(Math.sin(angle) * distance * 0.8) - 60;
  const rot = ((i * 97) % 720) - 360;
  const delay = (i % 6) * 40;
  const duration = 1100 + ((i * 271) % 600);
  return {
    dx: `${dx}px`,
    dy: `${dy}px`,
    rot: `${rot}deg`,
    delay: `${delay}ms`,
    duration: `${duration}ms`,
  };
});

type ConfettiBurstProps = {
  /** Additional CSS classes */
  className?: string;
  /** Accent color */
  accentColor?: string;
};

export function ConfettiBurst({ className, accentColor }: ConfettiBurstProps) {
  const style = accentColor
    ? ({ "--temporal-accent": accentColor } as React.CSSProperties)
    : undefined;

  return (
    <div className={cn(styles.confetti, className)} style={style} aria-hidden="true">
      {PIECES.map((piece, i) => (
        <span
          key={i}
          className={styles.confettiPiece}
          style={
            {
              "--cf-dx": piece.dx,
              "--cf-dy": piece.dy,
              "--cf-rot": piece.rot,
              "--cf-delay": piece.delay,
              "--cf-duration": piece.duration,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
