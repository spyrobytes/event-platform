import { cn } from "@/lib/utils";
import Image from "next/image";
import styles from "./Logo.module.css";

type LogoProps = {
  /** Show full wordmark or just the mark */
  variant?: "full" | "mark";
  /** Scale: "md" (default) = header size, "sm" = compact footer/credit size */
  size?: "sm" | "md";
  /** Preload the mark image. Default true (above-the-fold header); set false for footers. */
  priority?: boolean;
  /** Play the wordmark entrance fade. Default true; set false for static contexts. */
  animate?: boolean;
  /** Additional classes */
  className?: string;
};

const SIZES = {
  sm: { px: 16, imgClass: "h-4 w-4", word: "text-xs", gap: "gap-1.5" },
  md: { px: 32, imgClass: "h-8 w-8", word: "text-sm", gap: "gap-2" },
} as const;

/**
 * Brand logo component using the official eventfxr logo.
 */
export function Logo({
  variant = "full",
  size = "md",
  priority = true,
  animate = true,
  className,
}: LogoProps) {
  const s = SIZES[size];

  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      {/* Logo mark */}
      <Image
        src="/brand/logo-2a-optimized.svg"
        alt="EventFXr"
        width={s.px}
        height={s.px}
        className={s.imgClass}
        priority={priority}
      />

      {/* Wordmark - shown when variant is "full" */}
      {variant === "full" && (
        <span className={cn(s.word, "font-semibold tracking-tight", styles.wordmark)}>
          <span className={animate ? styles.eventPart : styles.eventPartStatic}>Event</span>
          <span className={animate ? styles.fxrPart : styles.fxrPartStatic}>FXr</span>
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
