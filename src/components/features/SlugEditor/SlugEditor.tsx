"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { SLUG_PATTERN, type SlugAvailability } from "@/schemas/event";
import { isReservedSlug } from "@/lib/reserved-slugs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://eventfxr.com";
const URL_PREFIX = `${BASE_URL.replace(/^https?:\/\//, "")}/e/`;

type Props = {
  eventId: string;
  currentSlug: string;
  /** Async to allow callers to fetch a fresh Firebase ID token per request. */
  getIdToken: () => Promise<string | null>;
  /** Called after a successful rename so the parent can update local state
   *  and (if the current page URL embeds the slug) navigate to the new path. */
  onRenamed: (newSlug: string) => void;
};

/** Local check-state. Drives the badge + Save button. */
type Check =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "result"; data: SlugAvailability };

const DEBOUNCE_MS = 300;

export function SlugEditor({ eventId, currentSlug, getIdToken, onRenamed }: Props) {
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [value, setValue] = useState(currentSlug);
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputId = useId();

  // Hold getIdToken in a ref so the debounce effect doesn't restart whenever
  // the parent re-renders. AuthProvider memoizes today, but a future tick-y
  // parent (or an unmemoized auth refactor) would otherwise abort the
  // in-flight check on every render and the badge would never settle.
  const getIdTokenRef = useRef(getIdToken);
  useEffect(() => {
    getIdTokenRef.current = getIdToken;
  }, [getIdToken]);

  // Debounced availability check. Runs on every value change while in edit
  // mode. Cancels the in-flight request when the value changes again.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (mode !== "edit") return;
    abortRef.current?.abort();

    // Skip the round-trip for client-detectable issues so the badge updates
    // instantly and we don't spam the endpoint.
    const candidate = value.trim().toLowerCase();
    if (candidate === currentSlug) {
      setCheck({ state: "result", data: { available: true, reason: "self" } });
      return;
    }
    if (!SLUG_PATTERN.test(candidate)) {
      setCheck({ state: "result", data: { available: false, reason: "invalid" } });
      return;
    }
    if (isReservedSlug(candidate)) {
      setCheck({ state: "result", data: { available: false, reason: "reserved" } });
      return;
    }

    setCheck({ state: "checking" });
    const ac = new AbortController();
    abortRef.current = ac;
    const timer = setTimeout(async () => {
      try {
        const token = await getIdTokenRef.current();
        if (!token) return;
        const res = await fetch(
          `/api/events/check-slug?slug=${encodeURIComponent(candidate)}&eventId=${encodeURIComponent(eventId)}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: ac.signal }
        );
        if (ac.signal.aborted) return;
        if (!res.ok) {
          setCheck({ state: "idle" });
          return;
        }
        const body = await res.json();
        setCheck({ state: "result", data: body.data as SlugAvailability });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setCheck({ state: "idle" });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [value, mode, currentSlug, eventId]);

  const enterEdit = () => {
    setValue(currentSlug);
    setApiError(null);
    setMode("edit");
  };

  const cancelEdit = () => {
    abortRef.current?.abort();
    setValue(currentSlug);
    setCheck({ state: "idle" });
    setApiError(null);
    setMode("read");
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(`${BASE_URL}/e/${currentSlug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can fail in unsecured contexts; just no-op.
    }
  };

  const performSave = async () => {
    setSaving(true);
    setApiError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug: value.trim().toLowerCase() }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to update URL");
      }

      const newSlug = body?.data?.slug as string | undefined;
      if (!newSlug) throw new Error("Update succeeded but response was malformed");

      onRenamed(newSlug);
      setMode("read");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to update URL");
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  };

  const result = check.state === "result" ? check.data : null;
  const canSave =
    mode === "edit" &&
    !saving &&
    check.state === "result" &&
    result?.available === true &&
    result?.reason !== "self";

  const badge = renderBadge(check, value === currentSlug);
  const helper = renderHelper(check);

  return (
    <>
      <div className="space-y-3">
        {mode === "read" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-border bg-input px-3 py-2 text-sm">
              <span className="text-muted-foreground">{URL_PREFIX}</span>
              <span className="font-medium text-foreground">{currentSlug}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyUrl}>
                {copied ? "Copied" : "Copy URL"}
              </Button>
              <Button variant="outline" size="sm" onClick={enterEdit}>
                Change URL
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label
              htmlFor={inputId}
              className="block text-xs font-medium text-muted-foreground"
            >
              New URL
            </label>
            <div className="flex items-stretch overflow-hidden rounded-md border border-input-border bg-input">
              <span className="flex items-center pl-3 pr-1 text-sm text-muted-foreground">
                {URL_PREFIX}
              </span>
              <Input
                id={inputId}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="my-event"
                autoFocus
                maxLength={60}
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                error={result?.available === false}
                className="rounded-none border-0 bg-transparent px-1 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">{badge}</div>
              <span className="tabular-nums text-muted-foreground">
                {value.length}/60
              </span>
            </div>

            {helper && (
              <p className="text-xs text-muted-foreground">{helper}</p>
            )}

            {apiError && (
              <p className="text-xs text-destructive">{apiError}</p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowConfirm(true)}
                disabled={!canSave}
              >
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showConfirm}
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => performSave()}
        title="Change event URL?"
        description={`The new URL will be ${URL_PREFIX}${value.trim().toLowerCase()}.\n\nLinks pointing at the old URL will redirect to the new one — but anything you've already printed (invitations, QR codes, save-the-dates) won't update. Make sure that's OK before continuing.`}
        confirmLabel={saving ? "Saving..." : "Change URL"}
        cancelLabel="Keep current URL"
      />
    </>
  );
}

function renderBadge(check: Check, isUnchanged: boolean) {
  if (check.state === "idle" || isUnchanged) {
    return <BadgeChip tone="neutral">Current URL</BadgeChip>;
  }
  if (check.state === "checking") {
    return <BadgeChip tone="neutral">Checking…</BadgeChip>;
  }
  const r = check.data;
  if (r.available && r.reason === "self") {
    return <BadgeChip tone="neutral">Current URL</BadgeChip>;
  }
  if (r.available) {
    return <BadgeChip tone="success">Available</BadgeChip>;
  }
  switch (r.reason) {
    case "taken":
      return <BadgeChip tone="error">Taken</BadgeChip>;
    case "reserved":
      return <BadgeChip tone="error">Reserved</BadgeChip>;
    case "invalid":
      return <BadgeChip tone="error">Invalid format</BadgeChip>;
  }
}

function renderHelper(check: Check): string | null {
  if (check.state !== "result") return null;
  const r = check.data;
  if (r.available) return null;
  switch (r.reason) {
    case "taken":
      return "Another event is using this URL (or used it previously).";
    case "reserved":
      return "This word is reserved by the platform. Try something more specific.";
    case "invalid":
      return "Use 3–60 letters, numbers, or hyphens. No leading or trailing hyphen.";
  }
}

function BadgeChip({
  tone,
  children,
}: {
  tone: "success" | "error" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "success" && "bg-success/15 text-success",
        tone === "error" && "bg-destructive/15 text-destructive",
        tone === "neutral" && "bg-surface-3 text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}
