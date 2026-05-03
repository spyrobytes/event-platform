"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { writeInvitePreview, type InvitePreview } from "@/lib/public-rsvp-portal";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID:
    "We couldn't verify that invitation code. Please check it and try again.",
  RATE_LIMITED: "Too many attempts. Please wait a few minutes and try again.",
  DEADLINE_PASSED: "RSVPs for this event are closed.",
  EVENT_ENDED: "This event has already taken place.",
};

const FALLBACK_ERROR = "Something went wrong. Please try again.";

type Props = {
  eventId: string;
  eventSlug: string;
};

type VerifyResponseBody = {
  data?: {
    rsvpSessionToken: string;
    invitePreview: InvitePreview;
  };
  error?: string;
  code?: string;
};

export function CodeForm({ eventId, eventSlug }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [hp, setHp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/rsvp/public/verify-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Send eventId + raw code (server normalizes via normalizeRsvpCode).
        body: JSON.stringify({ eventId, code, hp: hp || undefined }),
      });

      const json = (await response.json().catch(() => ({}))) as VerifyResponseBody;

      if (!response.ok) {
        setError(ERROR_MESSAGES[json.code ?? ""] ?? json.error ?? FALLBACK_ERROR);
        setSubmitting(false);
        return;
      }

      // Stash preview for the /respond page. The session token itself sits in
      // the httpOnly cookie; we don't read it back in JS. Token is also in the
      // body for non-cookie clients, but the cookie path covers our flow.
      if (json.data?.invitePreview) {
        writeInvitePreview(json.data.invitePreview);
      }

      router.push(`/e/${eventSlug}/rsvp/respond`);
    } catch {
      setError(FALLBACK_ERROR);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="code">Enter your invitation code</Label>
        <Input
          id="code"
          name="code"
          type="text"
          inputMode="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="EVG-XXXX-XXXX-XXXX"
          maxLength={18}
          autoComplete="one-time-code"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby="code-hint"
          disabled={submitting}
          required
        />
        <p id="code-hint" className="text-xs text-muted-foreground">
          The code is on your invitation. Letters and numbers; hyphens are optional.
        </p>
      </div>

      {/* Honeypot — visually hidden but reachable for bots that fill every input. */}
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

      <Button type="submit" disabled={submitting || !code.trim()} className="w-full">
        {submitting ? "Verifying…" : "Continue"}
      </Button>
    </form>
  );
}
