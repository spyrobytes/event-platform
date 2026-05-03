"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildSubmitRsvpSchema } from "@/schemas/rsvp";
import {
  trackFormStarted,
  trackFormSubmitted,
  trackFormAbandoned,
} from "@/lib/tracking";

type RsvpResponse = "YES" | "NO" | "MAYBE";

type RSVPFormProps = {
  inviteToken?: string;
  eventId?: string;
  guestName?: string;
  guestEmail?: string;
  plusOnesAllowed?: number;
  onSuccess?: () => void;
  showMaybeOption?: boolean;
  successMessage?: string;
  hideCard?: boolean;
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

export function RSVPForm({
  inviteToken,
  eventId,
  guestName = "",
  guestEmail = "",
  plusOnesAllowed = 0,
  onSuccess,
  showMaybeOption = true,
  successMessage,
  hideCard = false,
  needsEmail = false,
  inviteRef,
  enableWishes = false,
}: RSVPFormProps) {
  const [selectedResponse, setSelectedResponse] = useState<RsvpResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
      // Also track abandonment on unmount (SPA navigation)
      if (formStarted.current && !formSubmitted.current) {
        trackFormAbandoned(eventId, lastInteractedField.current ?? undefined, inviteRef);
      }
    };
  }, [eventId]);

  // Build a schema that knows whether email is required for this invite.
  // Memoized so the resolver reference is stable across renders when
  // `needsEmail` is unchanged.
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

  const watchGuestCount = watch("guestCount");
  const watchGuestName = watch("guestName");
  const watchGuestEmail = watch("guestEmail");

  // Gate Submit on required-field presence so the button reflects what the
  // schema would enforce on submit. Matches the * indicators next to labels.
  const hasName = typeof watchGuestName === "string" && watchGuestName.trim().length > 0;
  const hasEmail =
    !needsEmail ||
    (typeof watchGuestEmail === "string" && watchGuestEmail.trim().length > 0);
  const canSubmit = !!selectedResponse && hasName && hasEmail;

  const onSubmit = async (data: Record<string, unknown>) => {
    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        ...data,
        guestCount: data.guestCount || 1,
        additionalGuestNames,
      };

      if (inviteToken) {
        body.inviteToken = inviteToken;
      } else if (eventId) {
        body.eventId = eventId;
      } else {
        throw new Error("Missing invite token or event ID");
      }

      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit RSVP");
      }

      const responseData = await response.json().catch(() => ({}));
      if (responseData?.data?.message) {
        setApiMessage(responseData.data.message);
      }
      setSubmittedResponse(data.response as RsvpResponse);

      // Mark as submitted before updating state to prevent abandonment tracking
      formSubmitted.current = true;

      // Track successful submission
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

  // Filter response options based on showMaybeOption
  const responseOptions = showMaybeOption
    ? RESPONSE_OPTIONS
    : RESPONSE_OPTIONS.filter((opt) => opt.value !== "MAYBE");

  if (success) {
    const successContent = (
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
          <svg
            className="h-8 w-8 text-green-600"
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
        <h2 className="text-2xl font-bold">
          {submittedResponse === "YES"
            ? "See You There!"
            : submittedResponse === "NO"
              ? "We'll Miss You"
              : "Thank You!"}
        </h2>
        <p className="text-muted-foreground">
          {apiMessage || successMessage || "Your RSVP has been recorded. You'll receive a confirmation email shortly."}
        </p>
      </div>
    );

    if (hideCard) {
      return <div className="py-6">{successContent}</div>;
    }

    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="pt-6">{successContent}</CardContent>
      </Card>
    );
  }

  const formContent = (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Response Selection */}
        <div className="space-y-3">
          <Label>Will you be attending?</Label>
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
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectedResponse === option.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <p className="font-medium">{option.label}</p>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </button>
            ))}
          </div>
          {errors.response && (
            <p className="text-sm text-destructive">{errors.response.message}</p>
          )}
        </div>

        {/* Guest Name */}
        <div className="space-y-2">
          <Label htmlFor="guestName">Your Name *</Label>
          <Input
            id="guestName"
            placeholder="Enter your full name"
            {...register("guestName")}
            onFocus={() => handleFormInteraction("guestName")}
            aria-invalid={!!errors.guestName}
          />
          {errors.guestName && (
            <p className="text-sm text-destructive">{errors.guestName.message}</p>
          )}
        </div>

        {/* Guest Email — prominent for phone-only invites, optional otherwise */}
        {(needsEmail || !guestEmail) && (
          <div className="space-y-2">
            <Label htmlFor="guestEmail">
              Your Email {needsEmail ? "*" : "(optional)"}
            </Label>
            <Input
              id="guestEmail"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="your@email.com"
              {...register("guestEmail")}
              onFocus={() => handleFormInteraction("guestEmail")}
              aria-invalid={!!errors.guestEmail}
            />
            {needsEmail && (
              <p className="text-xs text-muted-foreground">
                Enter your email to receive confirmation and event updates
              </p>
            )}
            {errors.guestEmail && (
              <p className="text-sm text-destructive">{errors.guestEmail.message}</p>
            )}
          </div>
        )}

        {/* Guest Count (if plus ones allowed) */}
        {plusOnesAllowed > 0 && selectedResponse === "YES" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guestCount">Number of Guests (including yourself)</Label>
              <Input
                id="guestCount"
                type="number"
                min={1}
                max={plusOnesAllowed + 1}
                {...register("guestCount", {
                  valueAsNumber: true,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    updateGuestNameSlots(Number(e.target.value) || 1);
                  },
                })}
                onFocus={() => handleFormInteraction("guestCount")}
              />
              <p className="text-xs text-muted-foreground">
                You can bring up to {plusOnesAllowed} additional guest{plusOnesAllowed > 1 ? "s" : ""}
              </p>
              {errors.guestCount && (
                <p className="text-sm text-destructive">{errors.guestCount.message}</p>
              )}
            </div>

            {/* Additional Guest Names */}
            {(watchGuestCount ?? 1) > 1 && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Names of Additional Guests *</Label>
                  <p className="text-xs text-muted-foreground">
                    Required for reception planning and seating arrangements
                  </p>
                </div>
                {additionalGuestNames.map((name, idx) => (
                  <div key={idx} className="space-y-1">
                    <Input
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
                      aria-label={`Guest ${idx + 2} name`}
                    />
                    {name.trim() === "" && errors.additionalGuestNames && (
                      <p className="text-sm text-destructive">Guest name is required</p>
                    )}
                  </div>
                ))}
                {errors.additionalGuestNames && (
                  <p className="text-sm text-destructive">
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
          <div className="space-y-2">
            <Label htmlFor="dietaryRestrictions">Dietary Restrictions (optional)</Label>
            <Textarea
              id="dietaryRestrictions"
              placeholder="Any food allergies or dietary requirements?"
              rows={2}
              maxLength={500}
              {...register("dietaryRestrictions")}
              onFocus={() => handleFormInteraction("dietaryRestrictions")}
            />
          </div>
        )}

        {/* Song Requests */}
        {selectedResponse === "YES" && (
          <div className="space-y-2">
            <Label htmlFor="musicSuggestions">Song Requests (optional)</Label>
            <Textarea
              id="musicSuggestions"
              placeholder="Any songs you'd love to hear? Helps the host plan the playlist."
              rows={2}
              maxLength={500}
              {...register("musicSuggestions")}
              onFocus={() => handleFormInteraction("musicSuggestions")}
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Anything else you'd like us to know?"
            rows={3}
            {...register("notes")}
            onFocus={() => handleFormInteraction("notes")}
          />
        </div>

        {/* Message for the couple — only when the wishes section is enabled */}
        {enableWishes && (
          <div className="space-y-2">
            <Label htmlFor="messageToHost">Message for the couple (optional)</Label>
            <Textarea
              id="messageToHost"
              placeholder="A few kind words or a blessing for the couple"
              rows={4}
              maxLength={1000}
              {...register("messageToHost")}
              onFocus={() => handleFormInteraction("messageToHost")}
            />
            <p className="text-xs text-muted-foreground">
              Your message may be shared on the wedding page after review.
            </p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={submitting || !canSubmit}
        >
          {submitting ? "Submitting..." : "Submit RSVP"}
        </Button>
      </form>
    </>
  );

  if (hideCard) {
    return <div className="mx-auto max-w-lg">{formContent}</div>;
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>RSVP</CardTitle>
        <CardDescription>
          Let us know if you&apos;ll be attending
        </CardDescription>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
