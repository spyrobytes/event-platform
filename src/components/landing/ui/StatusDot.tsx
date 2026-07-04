import { cn } from "@/lib/utils";
import styles from "./StatusDot.module.css";

/**
 * The landing page's pulsing "live" dot (HeroMontage badge, FinalCTA badge).
 * Size via className on the wrapper (default size-1.5); the inner dot fills
 * it. The pulse honors prefers-reduced-motion.
 */
export function StatusDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-1.5", className)}>
      <span className={cn("absolute inset-0 rounded-full bg-emerald-400", styles.pulse)} />
      <span className="relative size-full rounded-full bg-emerald-500" />
    </span>
  );
}
