"use client";

import { useReducer, useCallback } from "react";

/**
 * Invitation animation states
 */
export type InvitationState = "idle" | "opening" | "open" | "closing";

/**
 * Events that can trigger state transitions
 */
export type InvitationEvent =
  | { type: "CLICK" }
  | { type: "COMPLETE" }
  | { type: "REPLAY" }
  | { type: "SKIP" };

/**
 * State machine reducer for invitation animations.
 * Blocks interactions during transitions to prevent race conditions.
 */
function invitationReducer(
  state: InvitationState,
  event: InvitationEvent
): InvitationState {
  // Block clicks during transitions
  if (
    (state === "opening" || state === "closing") &&
    event.type === "CLICK"
  ) {
    return state;
  }

  switch (state) {
    case "idle":
      if (event.type === "CLICK" || event.type === "SKIP") {
        return "opening";
      }
      return state;

    case "opening":
      if (event.type === "COMPLETE" || event.type === "SKIP") {
        return "open";
      }
      return state;

    case "open":
      if (event.type === "REPLAY") {
        return "closing";
      }
      return state;

    case "closing":
      if (event.type === "COMPLETE") {
        return "idle";
      }
      return state;

    default:
      return state;
  }
}

/**
 * Return type for useInvitationState hook
 */
export type UseInvitationStateReturn = {
  /** Current animation state */
  state: InvitationState;
  /** Whether animation is currently in progress */
  isAnimating: boolean;
  /** Trigger the opening animation */
  open: () => void;
  /** Signal that the current animation has completed */
  complete: () => void;
  /** Trigger the closing animation (semantic alias for replay) */
  close: () => void;
  /** Trigger the closing animation (replay) */
  replay: () => void;
  /** Skip to the open state immediately */
  skip: () => void;
};

/**
 * Hook for managing invitation animation state.
 *
 * Uses a state machine pattern to ensure predictable transitions
 * and prevent race conditions from rapid user interactions.
 *
 * @param initialState - Starting state (default: 'idle')
 * @returns State and transition functions
 *
 * @example
 * ```tsx
 * const { state, open, complete, replay } = useInvitationState();
 *
 * return (
 *   <button onClick={state === 'idle' ? open : undefined}>
 *     {state === 'idle' ? 'Open' : 'Opening...'}
 *   </button>
 * );
 * ```
 */
export function useInvitationState(
  initialState: InvitationState = "idle"
): UseInvitationStateReturn {
  const [state, dispatch] = useReducer(invitationReducer, initialState);

  const open = useCallback(() => dispatch({ type: "CLICK" }), []);
  const complete = useCallback(() => dispatch({ type: "COMPLETE" }), []);
  const replay = useCallback(() => dispatch({ type: "REPLAY" }), []);
  const close = useCallback(() => dispatch({ type: "REPLAY" }), []);
  const skip = useCallback(() => dispatch({ type: "SKIP" }), []);

  const isAnimating = state === "opening" || state === "closing";

  return { state, isAnimating, open, complete, close, replay, skip };
}
