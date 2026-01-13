"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { submitRsvpSchema } from "@/schemas/rsvp";

type RsvpResponse = "YES" | "NO" | "MAYBE";

type RSVPFormProps = {
  inviteToken?: string;
  eventId?: string;
  guestName?: string;
  plusOnesAllowed?: number;
  onSuccess?: () => void;
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
  plusOnesAllowed = 0,
  onSuccess,
}: RSVPFormProps) {
  const [selectedResponse, setSelectedResponse] = useState<RsvpResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      const body: Record<string, unknown> = {
        ...data,
        guestCount: data.guestCount || 1,
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

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit RSVP");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="pt-6">
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
            <h2 className="text-2xl font-bold">Thank You!</h2>
            <p className="text-muted-foreground">
              Your RSVP has been recorded. We&apos;ll send you a confirmation email shortly.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>RSVP</CardTitle>
        <CardDescription>
          Let us know if you&apos;ll be attending
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              {RESPONSE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
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
              aria-invalid={!!errors.guestName}
            />
            {errors.guestName && (
              <p className="text-sm text-destructive">{errors.guestName.message}</p>
            )}
          </div>

          {/* Guest Count (if plus ones allowed) */}
          {plusOnesAllowed > 0 && selectedResponse === "YES" && (
            <div className="space-y-2">
              <Label htmlFor="guestCount">Number of Guests (including yourself)</Label>
              <Input
                id="guestCount"
                type="number"
                min={1}
                max={plusOnesAllowed + 1}
                {...register("guestCount", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                You can bring up to {plusOnesAllowed} additional guest{plusOnesAllowed > 1 ? "s" : ""}
              </p>
              {errors.guestCount && (
                <p className="text-sm text-destructive">{errors.guestCount.message}</p>
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
                {...register("dietaryRestrictions")}
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
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !selectedResponse}
          >
            {submitting ? "Submitting..." : "Submit RSVP"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
