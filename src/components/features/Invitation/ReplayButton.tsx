"use client";

import { cn } from "@/lib/utils";

type ReplayButtonProps = {
  /** Click handler */
  onClick: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
};

/**
 * Button to replay the invitation animation.
 *
 * Hidden when reduced motion is preferred (handled by parent).
 *
 * @example
 * ```tsx
 * const { replay, state } = useInvitationState();
 *
 * {state === 'open' && <ReplayButton onClick={replay} />}
 * ```
 */
export function ReplayButton({
  onClick,
  disabled = false,
  className,
}: ReplayButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2",
        "px-4 py-2",
        "text-sm font-medium",
        "text-[var(--inv-text-secondary)]",
        "bg-transparent",
        "border border-[var(--inv-border)]",
        "rounded-full",
        "transition-all duration-200",
        "hover:border-[var(--inv-accent)] hover:text-[var(--inv-accent)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--inv-accent)] focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      aria-label="Replay invitation animation"
    >
      <ReplayIcon className="w-4 h-4" />
      <span>Replay</span>
    </button>
  );
}

function ReplayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
