import { cn } from "@/lib/utils";
import Image from "next/image";

type LogoProps = {
  /** Show full wordmark or just the mark */
  variant?: "full" | "mark";
  /** Color scheme */
  color?: "light" | "dark" | "auto";
  /** Additional classes */
  className?: string;
};

/**
 * Brand logo component using the official eventfxr logo.
 */
export function Logo({ variant = "full", color = "auto", className }: LogoProps) {
  // Text color for wordmark
  const textColorClass = color === "light" ? "text-white" : color === "dark" ? "text-black" : "";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* Logo mark */}
      <Image
        src="/brand/logo-2a-optimized.svg"
        alt="EventsFixer"
        width={32}
        height={32}
        className="h-8 w-8"
        priority
      />

      {/* Wordmark - shown when variant is "full" */}
      {variant === "full" && (
        <span className={cn("text-sm font-semibold tracking-tight", textColorClass)}>
          EventsFixer
        </span>
      )}
    </span>
  );
}

/**
 * Compact logo for mobile header
 */
export function LogoCompact({ color = "auto", className }: Omit<LogoProps, "variant">) {
  return <Logo variant="mark" color={color} className={className} />;
}
