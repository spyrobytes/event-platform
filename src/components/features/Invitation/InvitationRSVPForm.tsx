"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { submitRsvpSchema } from "@/schemas/rsvp";
import {
  trackFormStarted,
  trackFormSubmitted,
  trackFormAbandoned,
} from "@/lib/tracking";

type RsvpResponse = "YES" | "NO" | "MAYBE";

type InvitationRSVPFormProps = {
  inviteToken: string;
  eventId: string;
  guestName?: string;
  plusOnesAllowed?: number;
  onSuccess?: () => void;
  showMaybeOption?: boolean;
  successMessage?: string;
};

const RESPONSE_OPTIONS: { value: RsvpResponse; label: string; description: string }[] = [
  { value: "YES", label: "Yes, I'll be there!", description: "Count me in for this event" },
  { value: "NO", label: "No, I can't make it", description: "I won't be able to attend" },
  { value: "MAYBE", label: "Maybe", description: "I'm not sure yet" },
];

/**
 * Themed RSVP form for invitation pages.
 * Uses invitation CSS variables for consistent theming.
 */
export function InvitationRSVPForm({
  inviteToken,
  eventId,
  guestName = "",
  plusOnesAllowed = 0,
  onSuccess,
  showMaybeOption = true,
  successMessage,
}: InvitationRSVPFormProps) {
  const [selectedResponse, setSelectedResponse] = useState<RsvpResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Analytics tracking refs
  const formStarted = useRef(false);
  const formSubmitted = useRef(false);
  const lastInteractedField = useRef<string | null>(null);

  // Track form start on first interaction
  const handleFormInteraction = useCallback(
    (fieldName: string) => {
      lastInteractedField.current = fieldName;
      if (!formStarted.current && eventId) {
        formStarted.current = true;
        trackFormStarted(eventId);
      }
    },
    [eventId]
  );

  // Track abandonment on page unload
  useEffect(() => {
    if (!eventId) return;

    const handleBeforeUnload = () => {
      if (formStarted.current && !formSubmitted.current) {
        trackFormAbandoned(eventId, lastInteractedField.current ?? undefined);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (formStarted.current && !formSubmitted.current) {
        trackFormAbandoned(eventId, lastInteractedField.current ?? undefined);
      }
    };
  }, [eventId]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(submitRsvpSchema),
    defaultValues: {
      guestName,
      guestCount: 1,
      response: undefined as RsvpResponse | undefined,
      guestEmail: "",
      dietaryRestrictions: "",
      notes: "",
    },
  });

  const onSubmit = async (data: Record<string, unknown>) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          guestCount: data.guestCount || 1,
          inviteToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit RSVP");
      }

      formSubmitted.current = true;

      if (eventId && data.response) {
        trackFormSubmitted(eventId, String(data.response));
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit RSVP");
    } finally {
      setSubmitting(false);
    }
  };

  const responseOptions = showMaybeOption
    ? RESPONSE_OPTIONS
    : RESPONSE_OPTIONS.filter((opt) => opt.value !== "MAYBE");

  // Input styles using invitation theme
  const inputStyles = cn(
    "w-full px-4 py-3 rounded-lg",
    "bg-[var(--inv-card-bg)] border border-[var(--inv-border)]",
    "text-[var(--inv-text-primary)] placeholder:text-[var(--inv-text-secondary)]/50",
    "focus:outline-none focus:ring-2 focus:ring-[var(--inv-accent)] focus:border-transparent",
    "transition-all duration-200"
  );

  const labelStyles = "block text-sm font-medium text-[var(--inv-text-primary)] mb-2";

  if (success) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--inv-accent)]/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[var(--inv-accent)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-xl font-[var(--inv-font-heading)] text-[var(--inv-text-primary)]">
          Thank You!
        </h2>
        <p className="text-[var(--inv-text-secondary)]">
          {successMessage || "Your RSVP has been recorded. We'll send you a confirmation email shortly."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Response Selection */}
        <div className="space-y-3">
          <label className={labelStyles}>Will you be attending?</label>
          <div className="grid gap-3">
            {responseOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  handleFormInteraction("response");
                  setSelectedResponse(option.value);
                  setValue("response", option.value);
                }}
                className={cn(
                  "rounded-lg border-2 p-4 text-left transition-all duration-200",
                  selectedResponse === option.value
                    ? "border-[var(--inv-accent)] bg-[var(--inv-accent)]/10"
                    : "border-[var(--inv-border)] hover:border-[var(--inv-accent)]/50 bg-[var(--inv-card-bg)]"
                )}
              >
                <p className="font-medium text-[var(--inv-text-primary)]">{option.label}</p>
                <p className="text-sm text-[var(--inv-text-secondary)]">{option.description}</p>
              </button>
            ))}
          </div>
          {errors.response && (
            <p className="text-sm text-red-600">{errors.response.message}</p>
          )}
        </div>

        {/* Guest Name */}
        <div>
          <label htmlFor="guestName" className={labelStyles}>
            Your Name <span className="text-[var(--inv-accent)]">*</span>
          </label>
          <input
            id="guestName"
            type="text"
            placeholder="Enter your full name"
            className={inputStyles}
            {...register("guestName")}
            onFocus={() => handleFormInteraction("guestName")}
            aria-invalid={!!errors.guestName}
          />
          {errors.guestName && (
            <p className="mt-1 text-sm text-red-600">{errors.guestName.message}</p>
          )}
        </div>

        {/* Guest Count (if plus ones allowed) */}
        {plusOnesAllowed > 0 && selectedResponse === "YES" && (
          <div>
            <label htmlFor="guestCount" className={labelStyles}>
              Number of Guests (including yourself)
            </label>
            <input
              id="guestCount"
              type="number"
              min={1}
              max={plusOnesAllowed + 1}
              className={inputStyles}
              {...register("guestCount", { valueAsNumber: true })}
              onFocus={() => handleFormInteraction("guestCount")}
            />
            <p className="mt-1 text-xs text-[var(--inv-text-secondary)]">
              You can bring up to {plusOnesAllowed} additional guest{plusOnesAllowed > 1 ? "s" : ""}
            </p>
            {errors.guestCount && (
              <p className="mt-1 text-sm text-red-600">{errors.guestCount.message}</p>
            )}
          </div>
        )}

        {/* Dietary Restrictions */}
        {selectedResponse === "YES" && (
          <div>
            <label htmlFor="dietaryRestrictions" className={labelStyles}>
              Dietary Restrictions <span className="text-[var(--inv-text-secondary)]">(optional)</span>
            </label>
            <textarea
              id="dietaryRestrictions"
              placeholder="Any food allergies or dietary requirements?"
              rows={2}
              className={inputStyles}
              {...register("dietaryRestrictions")}
              onFocus={() => handleFormInteraction("dietaryRestrictions")}
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label htmlFor="notes" className={labelStyles}>
            Additional Notes <span className="text-[var(--inv-text-secondary)]">(optional)</span>
          </label>
          <textarea
            id="notes"
            placeholder="Anything else you'd like us to know?"
            rows={3}
            className={inputStyles}
            {...register("notes")}
            onFocus={() => handleFormInteraction("notes")}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedResponse}
          className={cn(
            "w-full py-3 px-6 rounded-full",
            "bg-[var(--inv-accent)] text-[var(--inv-card-bg)]",
            "font-semibold text-sm uppercase tracking-wider",
            "transition-all duration-200",
            "hover:shadow-lg hover:scale-[1.02]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--inv-accent)] focus:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          )}
        >
          {submitting ? "Submitting..." : "Submit RSVP"}
        </button>
      </form>
    </div>
  );
}
