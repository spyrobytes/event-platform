"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { buildSubmitRsvpSchema } from "@/schemas/rsvp";
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
  guestEmail?: string;
  plusOnesAllowed?: number;
  onSuccess?: () => void;
  showMaybeOption?: boolean;
  successMessage?: string;
  /** When true, the email field is shown prominently (phone-only invites) */
  needsEmail?: boolean;
  /** For analytics attribution — first 16 chars of tokenHash */
  inviteRef?: string;
  /** When true, show the "Message for the couple" field. Set by event pages
   *  whose page config has the `wishes` section enabled. */
  enableWishes?: boolean;
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
  guestEmail = "",
  plusOnesAllowed = 0,
  onSuccess,
  showMaybeOption = true,
  successMessage,
  needsEmail = false,
  inviteRef,
  enableWishes = false,
}: InvitationRSVPFormProps) {
  const [selectedResponse, setSelectedResponse] = useState<RsvpResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [submittedResponse, setSubmittedResponse] = useState<RsvpResponse | null>(null);
  const [additionalGuestNames, setAdditionalGuestNames] = useState<string[]>([]);

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
        trackFormStarted(eventId, inviteRef);
      }
    },
    [eventId]
  );

  // Track abandonment on page unload
  useEffect(() => {
    if (!eventId) return;

    const handleBeforeUnload = () => {
      if (formStarted.current && !formSubmitted.current) {
        trackFormAbandoned(eventId, lastInteractedField.current ?? undefined, inviteRef);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (formStarted.current && !formSubmitted.current) {
        trackFormAbandoned(eventId, lastInteractedField.current ?? undefined, inviteRef);
      }
    };
  }, [eventId]);

  // Build a schema that knows whether email is required for this invite
  // (phone-only invites pass `needsEmail={true}`). Memoized so the resolver
  // reference is stable when `needsEmail` is unchanged.
  const formSchema = useMemo(
    () => buildSubmitRsvpSchema({ emailRequired: needsEmail }),
    [needsEmail]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestName,
      guestCount: 1,
      response: undefined as RsvpResponse | undefined,
      guestEmail: guestEmail || "",
      additionalGuestNames: [] as string[],
      dietaryRestrictions: "",
      musicSuggestions: "",
      notes: "",
    },
  });

  const watchGuestCount = watch("guestCount");
  const watchGuestName = watch("guestName");
  const watchGuestEmail = watch("guestEmail");

  // Gate Submit on all required-field presence so the button matches the
  // `*` indicators next to labels. Each condition mirrors what the Zod schema
  // (and superRefine) would reject on submit.
  const hasName = typeof watchGuestName === "string" && watchGuestName.trim().length > 0;
  const hasEmail =
    !needsEmail ||
    (typeof watchGuestEmail === "string" && watchGuestEmail.trim().length > 0);
  const expectedAdditional =
    selectedResponse === "YES" ? Math.max(0, (watchGuestCount ?? 1) - 1) : 0;
  const additionalGuestsValid =
    expectedAdditional === 0 ||
    (additionalGuestNames.length === expectedAdditional &&
      additionalGuestNames.every((n) => n.trim().length > 0));
  const canSubmit = !!selectedResponse && hasName && hasEmail && additionalGuestsValid;

  // Sync additionalGuestNames array length when guestCount changes
  const updateGuestNameSlots = useCallback(
    (count: number) => {
      const needed = Math.max(0, count - 1);
      setAdditionalGuestNames((prev) => {
        const next = prev.slice(0, needed);
        while (next.length < needed) next.push("");
        setValue("additionalGuestNames", next);
        return next;
      });
    },
    [setValue]
  );

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
          additionalGuestNames,
          inviteToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit RSVP");
      }

      const responseData = await response.json().catch(() => ({}));
      if (responseData?.data?.portalUrl) {
        setPortalUrl(responseData.data.portalUrl);
      }
      if (responseData?.data?.message) {
        setApiMessage(responseData.data.message);
      }
      setSubmittedResponse(data.response as RsvpResponse);

      formSubmitted.current = true;

      if (eventId && data.response) {
        trackFormSubmitted(eventId, String(data.response), inviteRef);
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
          {submittedResponse === "YES"
            ? "See You There!"
            : submittedResponse === "NO"
              ? "We'll Miss You"
              : "Thank You!"}
        </h2>
        <p className="text-[var(--inv-text-secondary)]">
          {apiMessage || successMessage || "Your RSVP has been recorded. You'll receive a confirmation email shortly."}
        </p>
        {portalUrl && (
          <a
            href={portalUrl}
            className={cn(
              "inline-block mt-2 px-6 py-2 rounded-full text-sm font-medium",
              "bg-[var(--inv-accent)] text-[var(--inv-card-bg)]",
              "hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
            )}
          >
            {submittedResponse === "NO"
              ? "Browse Gift Registry"
              : "View Event Details"}
          </a>
        )}
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

        {/* Guest Email — prominent for phone-only invites */}
        {(needsEmail || !guestEmail) && (
          <div>
            <label htmlFor="guestEmail" className={labelStyles}>
              Your Email{" "}
              {needsEmail ? (
                <span className="text-[var(--inv-accent)]">*</span>
              ) : (
                <span className="text-[var(--inv-text-secondary)]">(optional)</span>
              )}
            </label>
            <input
              id="guestEmail"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="your@email.com"
              className={inputStyles}
              {...register("guestEmail")}
              onFocus={() => handleFormInteraction("guestEmail")}
              aria-invalid={!!errors.guestEmail}
            />
            {needsEmail && (
              <p className="mt-1 text-xs text-[var(--inv-text-secondary)]">
                Enter your email to receive confirmation and event updates
              </p>
            )}
            {errors.guestEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.guestEmail.message}</p>
            )}
          </div>
        )}

        {/* Guest Count (if plus ones allowed) */}
        {plusOnesAllowed > 0 && selectedResponse === "YES" && (
          <div className="space-y-4">
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
                {...register("guestCount", {
                  valueAsNumber: true,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    updateGuestNameSlots(Number(e.target.value) || 1);
                  },
                })}
                onFocus={() => handleFormInteraction("guestCount")}
              />
              <p className="mt-1 text-xs text-[var(--inv-text-secondary)]">
                You can bring up to {plusOnesAllowed} additional guest{plusOnesAllowed > 1 ? "s" : ""}
              </p>
              {errors.guestCount && (
                <p className="mt-1 text-sm text-red-600">{errors.guestCount.message}</p>
              )}
            </div>

            {/* Additional Guest Names */}
            {(watchGuestCount ?? 1) > 1 && (
              <div className="space-y-3">
                <label className={labelStyles}>
                  Names of Additional Guests <span className="text-[var(--inv-accent)]">*</span>
                </label>
                <p className="text-xs text-[var(--inv-text-secondary)] -mt-2">
                  Required for reception planning and seating arrangements
                </p>
                {additionalGuestNames.map((name, idx) => (
                  <div key={idx}>
                    <input
                      type="text"
                      placeholder={`Guest ${idx + 2} full name`}
                      value={name}
                      onChange={(e) => {
                        handleFormInteraction(`additionalGuestName_${idx}`);
                        setAdditionalGuestNames((prev) => {
                          const next = [...prev];
                          next[idx] = e.target.value;
                          setValue("additionalGuestNames", next);
                          return next;
                        });
                      }}
                      className={inputStyles}
                      aria-label={`Guest ${idx + 2} name`}
                    />
                    {name.trim() === "" && errors.additionalGuestNames && (
                      <p className="mt-1 text-sm text-red-600">Guest name is required</p>
                    )}
                  </div>
                ))}
                {errors.additionalGuestNames && (
                  <p className="text-sm text-red-600">
                    {typeof errors.additionalGuestNames.message === "string"
                      ? errors.additionalGuestNames.message
                      : "Please provide names for all additional guests"}
                  </p>
                )}
              </div>
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

        {/* Song Requests */}
        {selectedResponse === "YES" && (
          <div>
            <label htmlFor="musicSuggestions" className={labelStyles}>
              Song Requests <span className="text-[var(--inv-text-secondary)]">(optional)</span>
            </label>
            <textarea
              id="musicSuggestions"
              placeholder="Any songs you'd love to hear? Helps the host plan the playlist."
              rows={2}
              maxLength={500}
              className={inputStyles}
              {...register("musicSuggestions")}
              onFocus={() => handleFormInteraction("musicSuggestions")}
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

        {/* Message for the couple — only when the wishes section is enabled */}
        {enableWishes && (
          <div>
            <label htmlFor="messageToHost" className={labelStyles}>
              Message for the couple <span className="text-[var(--inv-text-secondary)]">(optional)</span>
            </label>
            <textarea
              id="messageToHost"
              placeholder="A few kind words or a blessing for the couple"
              rows={4}
              maxLength={1000}
              className={inputStyles}
              {...register("messageToHost")}
              onFocus={() => handleFormInteraction("messageToHost")}
            />
            <p className="mt-1 text-xs text-[var(--inv-text-secondary)]">
              Your message may be shared on the wedding page after review.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !canSubmit}
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
