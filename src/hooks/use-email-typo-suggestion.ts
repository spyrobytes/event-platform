"use client";

import { useCallback, useState } from "react";
import { suggestEmailCorrection } from "@/lib/email-domain-suggest";

/**
 * Tracks a non-blocking "did you mean?" suggestion for an email field. Call
 * `checkEmail` (typically on blur) to recompute it from the current value, and
 * `dismiss` (on change, or after the guest accepts) to clear it. `suggestion`
 * is the corrected full email, or null when there's nothing to suggest.
 */
export function useEmailTypoSuggestion() {
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const checkEmail = useCallback((email: string) => {
    setSuggestion(suggestEmailCorrection(email));
  }, []);

  const dismiss = useCallback(() => setSuggestion(null), []);

  return { suggestion, checkEmail, dismiss };
}
