import { cn } from "@/lib/utils";
import Image from "next/image";
import styles from "./Logo.module.css";

type LogoProps = {
  /** Show full wordmark or just the mark */
  variant?: "full" | "mark";
  /** Additional classes */
  className?: string;
};

/**
 * Brand logo component using the official eventfxr logo.
 */
export function Logo({ variant = "full", className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* Logo mark */}
      <Image
        src="/brand/logo-2a-optimized.svg"
        alt="EventFXr"
        width={32}
        height={32}
        className="h-8 w-8"
        priority
      />

      {/* Wordmark - shown when variant is "full" */}
      {variant === "full" && (
        <span className={cn("text-sm font-semibold tracking-tight", styles.wordmark)}>
          <span className={styles.eventPart}>Event</span>
          <span className={styles.fxrPart}>FXr</span>
        </span>
      )}
    </span>
  );
}

/**
 * Compact logo for mobile header
 */
export function LogoCompact({ className }: Omit<LogoProps, "variant">) {
  return <Logo variant="mark" className={className} />;
}
