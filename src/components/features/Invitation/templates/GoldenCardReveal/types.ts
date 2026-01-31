import type { InvitationData } from "@/schemas/invitation";
import type { InvitationState } from "@/hooks";

/**
 * Props for the GoldenCardReveal component
 */
export type GoldenCardRevealProps = {
  /** Invitation data from schema */
  data: InvitationData;

  /** Initial state of the card */
  initialState?: InvitationState;

  /** Callback when state changes */
  onStateChange?: (state: InvitationState) => void;

  /** Whether to show replay button when open */
  showReplay?: boolean;

  /** Whether to show the "Tap to Open" hint */
  showHint?: boolean;

  /** Disable confetti animation */
  disableConfetti?: boolean;

  /** Disable tilt effect */
  disableTilt?: boolean;

  /** Additional CSS classes */
  className?: string;
};

/**
 * Confetti particle shape
 */
export type ConfettiShape = "circle" | "square" | "star";

/**
 * Internal state for the card
 */
export type CardState = {
  isFlipped: boolean;
  isAnimating: boolean;
  isBreaking: boolean;
};
