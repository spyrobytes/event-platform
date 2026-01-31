import type { InvitationData } from "@/schemas/invitation";
import type { InvitationState } from "@/hooks";

/**
 * Props for the FlipFlapReveal component
 */
export type FlipFlapRevealProps = {
  /** Invitation data from schema */
  data: InvitationData;

  /** Initial state of the card */
  initialState?: InvitationState;

  /** Callback when state changes */
  onStateChange?: (state: InvitationState) => void;

  /** Whether to show the close button when open */
  showCloseButton?: boolean;

  /** Whether to show the "Tap to Open" hint */
  showHint?: boolean;

  /** Disable confetti animation */
  disableConfetti?: boolean;

  /** Additional CSS classes */
  className?: string;
};

/**
 * Confetti particle shape
 */
export type ConfettiShape = "circle" | "square" | "diamond";

/**
 * Confetti particle state
 */
export type ConfettiPiece = {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  shape: ConfettiShape;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
};

/**
 * Internal state for the card
 */
export type CardState = {
  isOpen: boolean;
  isAnimating: boolean;
};
