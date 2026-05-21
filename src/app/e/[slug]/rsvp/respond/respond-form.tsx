"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clearInvitePreview, type InvitePreview } from "@/lib/public-rsvp-portal";
import { SIDE_OPTIONS, type RsvpSide } from "@/lib/rsvp-side";

type RsvpResponse = "YES" | "NO" | "MAYBE";

const RESPONSE_OPTIONS: { value: RsvpResponse; label: string; description: string }[] = [
  { value: "YES", label: "Yes, I'll be there!", description: "Count me in for this event" },
  { value: "NO", label: "No, I can't make it", description: "I won't be able to attend" },
  { value: "MAYBE", label: "Maybe", description: "I'm not sure yet" },
];

const ERROR_MESSAGES: Record<string, string> = {
  INVALID: "Your RSVP couldn't be processed. Please re-enter your invitation code and try again.",
  SESSION_INVALID: "Your session has expired. Please re-enter your invitation code.",
  INVITE_INVALID: "This invitation is no longer valid.",
  DEADLINE_PASSED: "RSVPs for this event are closed.",
  EVENT_ENDED: "This event has already taken place.",
  PARTY_SIZE_INVALID: "Please reduce the number of guests.",
  CAPACITY_FULL: "Sorry, this event has reached its maximum capacity.",
  EMAIL_CONFLICT:
    "We already have an RSVP for this email. Please check your inbox for the original invitation.",
};

const FALLBACK_ERROR = "Something went wrong. Please try again.";

type Props = {
  eventSlug: string;
  invitePreview: InvitePreview;
};

type SubmitResponseBody = {
  data?: {
    rsvp: { response: RsvpResponse };
    portalToken?: string;
  };
  error?: string;
  code?: string;
};

export function RespondForm({ eventSlug, invitePreview }: Props) {
  const router = useRouter();
  const maxGuestCount = 1 + invitePreview.plusOnesAllowed;

  const [response, setResponse] = useState<RsvpResponse | null>(null);
  const [guestName, setGuestName] = useState(invitePreview.name ?? "");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [additionalGuestNames, setAdditionalGuestNames] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [musicSuggestions, setMusicSuggestions] = useState("");
  const [notes, setNotes] = useState("");
  const [messageToHost, setMessageToHost] = useState("");
  const [side, setSide] = useState<RsvpSide | null>(null);
  const [hp, setHp] = useState("");

  const showSideField =
    typeof invitePreview.templateId === "string" &&
    invitePreview.templateId.startsWith("wedding");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGuestCountChange = (next: number) => {
    const clamped = Math.max(1, Math.min(maxGuestCount, next));
    setGuestCount(clamped);
    const needed = Math.max(0, clamped - 1);
    setAdditionalGuestNames((prev) => {
      const arr = prev.slice(0, needed);
      while (arr.length < needed) arr.push("");
      return arr;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response || !guestName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/rsvp/public/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Cookie carries the session (path-scoped to /api/rsvp/public). Body
        // includes the standard RSVP fields. No rsvpSessionToken in the body
        // for the cookie path; the server falls back to body if cookie absent.
        body: JSON.stringify({
          response,
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim() || undefined,
          guestCount,
          additionalGuestNames: response === "YES" && guestCount > 1 ? additionalGuestNames : [],
          dietaryRestrictions: dietaryRestrictions.trim() || undefined,
          musicSuggestions: musicSuggestions.trim() || undefined,
          notes: notes.trim() || undefined,
          messageToHost: messageToHost.trim() || undefined,
          side: side ?? undefined,
          hp: hp || undefined,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as SubmitResponseBody;

      if (!res.ok) {
        const code = json.code ?? "";
        // Session-invalid forces the user back to the code-entry page.
        if (code === "SESSION_INVALID") {
          clearInvitePreview();
          router.push(`/e/${eventSlug}/rsvp?error=session_expired`);
          return;
        }
        setError(ERROR_MESSAGES[code] ?? json.error ?? FALLBACK_ERROR);
        setSubmitting(false);
        return;
      }

      clearInvitePreview();
      const submittedResponse = json.data?.rsvp.response ?? response;
      const portalToken = json.data?.portalToken;
      const tkParam = portalToken
        ? `&tk=${encodeURIComponent(portalToken)}`
        : "";
      router.push(
        `/e/${eventSlug}/rsvp/confirmed?r=${submittedResponse}${tkParam}`
      );
    } catch {
      setError(FALLBACK_ERROR);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="space-y-3">
        <Label>Will you be attending?</Label>
        <div className="grid gap-3">
          {RESPONSE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setResponse(option.value)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                response === option.value
                  ? "border-ring ring-2 ring-ring ring-offset-2 bg-accent/10"
                  : "border-border hover:border-ring/50 hover:bg-muted/50"
              }`}
              disabled={submitting}
            >
              <p className="font-medium">{option.label}</p>
              <p className="text-sm text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {showSideField && (
        <div className="space-y-2">
          <Label>Which side are you with? (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Helps the couple with seating arrangements.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {SIDE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSide(option.value)}
                className={`rounded-lg border px-3 py-2 text-sm text-center transition-colors ${
                  side === option.value
                    ? "border-ring ring-2 ring-ring ring-offset-2 bg-accent/10 font-medium"
                    : "border-border hover:border-ring/50 hover:bg-muted/50"
                }`}
                disabled={submitting}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="guestName">Your name</Label>
        <Input
          id="guestName"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Enter your full name"
          maxLength={200}
          required
          disabled={submitting}
        />
      </div>

      {!invitePreview.hasEmail && (
        <div className="space-y-2">
          <Label htmlFor="guestEmail">Your email (optional)</Label>
          <Input
            id="guestEmail"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={submitting}
          />
          <p className="text-xs text-muted-foreground">
            We&apos;ll send a confirmation if you provide one.
          </p>
        </div>
      )}

      {response === "YES" && invitePreview.plusOnesAllowed > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guestCount">
              Number of guests (including yourself, max {maxGuestCount})
            </Label>
            <Input
              id="guestCount"
              type="number"
              min={1}
              max={maxGuestCount}
              value={guestCount}
              onChange={(e) =>
                handleGuestCountChange(parseInt(e.target.value, 10) || 1)
              }
              disabled={submitting}
            />
          </div>

          {guestCount > 1 && (
            <div className="space-y-3">
              <Label>Names of additional guests</Label>
              {additionalGuestNames.map((name, idx) => (
                <Input
                  key={idx}
                  value={name}
                  onChange={(e) =>
                    setAdditionalGuestNames((prev) => {
                      const next = [...prev];
                      next[idx] = e.target.value;
                      return next;
                    })
                  }
                  placeholder={`Guest ${idx + 2} full name`}
                  maxLength={200}
                  disabled={submitting}
                  required
                />
              ))}
            </div>
          )}
        </div>
      )}

      {response === "YES" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="dietaryRestrictions">Dietary restrictions (optional)</Label>
            <Textarea
              id="dietaryRestrictions"
              value={dietaryRestrictions}
              onChange={(e) => setDietaryRestrictions(e.target.value)}
              placeholder="Any food allergies or dietary requirements?"
              rows={2}
              maxLength={500}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="musicSuggestions">Song suggestions (optional)</Label>
            <Textarea
              id="musicSuggestions"
              value={musicSuggestions}
              onChange={(e) => setMusicSuggestions(e.target.value)}
              placeholder="Song title and artist name"
              rows={2}
              maxLength={500}
              disabled={submitting}
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Additional notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else you'd like us to know?"
          rows={3}
          maxLength={1000}
          disabled={submitting}
        />
      </div>

      {invitePreview.enableWishes && (
        <div className="space-y-2">
          <Label htmlFor="messageToHost">Message for the couple (optional)</Label>
          <Textarea
            id="messageToHost"
            value={messageToHost}
            onChange={(e) => setMessageToHost(e.target.value)}
            placeholder="A few kind words or a blessing for the couple"
            rows={4}
            maxLength={1000}
            disabled={submitting}
          />
          <p className="text-xs text-muted-foreground">
            Your message may be shared on the wedding page after review.
          </p>
        </div>
      )}

      {/* Honeypot */}
      <div aria-hidden="true" className="absolute left-[-10000px] h-px w-px overflow-hidden">
        <label htmlFor="companyName">Company name (leave empty)</label>
        <input
          id="companyName"
          name="companyName"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={submitting || !response || !guestName.trim()}
        className="w-full"
      >
        {submitting ? "Submitting…" : "Submit RSVP"}
      </Button>
    </form>
  );
}
