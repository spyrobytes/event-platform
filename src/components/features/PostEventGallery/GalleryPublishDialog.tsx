"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  eventId: string;
  galleryId: string;
  /** When already PUBLISHED, the dialog title / button label shift and
   *  ticking the email box re-triggers the broadcast (organizer can do
   *  this after fixing something on the gallery before re-publishing). */
  alreadyPublished: boolean;
  getIdToken: () => Promise<string | null>;
  onCancel: () => void;
  /** Fires after a successful publish. `emailsQueued` is 0 when
   *  notifyGuests was unchecked or no eligible recipients exist. */
  onPublished: (result: { emailsQueued: number }) => void;
};

/**
 * Publish-flow confirmation dialog with an opt-in email checkbox.
 *
 * On open, fetches the recipient count from
 * `/api/events/[id]/gallery/recipients-preview` so the organizer sees
 * exactly how many guests would receive the broadcast before ticking
 * the box. Same predicate as the enqueue endpoint — preview always
 * matches what actually ships.
 */
export function GalleryPublishDialog({
  open,
  eventId,
  galleryId,
  alreadyPublished,
  getIdToken,
  onCancel,
  onPublished,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [notifyGuests, setNotifyGuests] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Re-fetch recipient count on every open — RSVPs can change between
  // dialog opens, so a cached count would mislead.
  useEffect(() => {
    if (!open) return;
    setNotifyGuests(false);
    setError(null);
    setRecipientCount(null);
    setRecipientError(null);

    let cancelled = false;
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) {
          if (!cancelled) setRecipientError("Not authenticated");
          return;
        }
        const res = await fetch(
          `/api/events/${eventId}/gallery/recipients-preview`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error("Failed to load recipient count");
        const data = await res.json();
        if (!cancelled) setRecipientCount(data.data.recipientCount);
      } catch (err) {
        if (!cancelled) {
          setRecipientError(
            err instanceof Error ? err.message : "Couldn't load recipients",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, eventId, getIdToken]);

  const dismiss = () => {
    if (submitting) return;
    onCancel();
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(
        `/api/events/${eventId}/gallery/${galleryId}/publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ notifyGuests }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to publish gallery");
      }
      const data = await res.json();
      onPublished({ emailsQueued: data.data.emailsQueued ?? 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) dismiss();
  };

  if (!open) return null;

  const title = alreadyPublished ? "Republish gallery" : "Publish gallery";
  const submitLabel = alreadyPublished
    ? notifyGuests
      ? "Save & notify guests"
      : "Save"
    : notifyGuests
      ? "Publish & notify guests"
      : "Publish";
  const checkboxLabel =
    recipientCount === null
      ? "Email RSVPed guests"
      : recipientCount === 0
        ? "Email RSVPed guests (none eligible)"
        : `Email ${recipientCount} RSVPed ${recipientCount === 1 ? "guest" : "guests"}`;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onCancel={dismiss}
      className={cn(
        "fixed inset-0 z-50 m-auto",
        "w-full max-w-md rounded-lg border border-border bg-card p-0 shadow-lg",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm",
        "open:animate-in open:fade-in-0 open:zoom-in-95",
      )}
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {alreadyPublished
            ? "The gallery is already live. Re-publishing updates the timestamp; the email checkbox below re-triggers the broadcast."
            : "Make the gallery visible on the public event page. You can unpublish at any time."}
        </p>

        <label className="mt-4 flex items-start gap-3">
          <input
            type="checkbox"
            checked={notifyGuests}
            onChange={(e) => setNotifyGuests(e.target.checked)}
            disabled={recipientCount === 0}
            className="mt-0.5 h-4 w-4 rounded border-border accent-foreground"
          />
          <div className="space-y-1">
            <span className="text-sm font-medium text-foreground">
              {checkboxLabel}
            </span>
            <p className="text-xs text-muted-foreground">
              Sends an email with the gallery link to every guest who RSVPed
              Yes. Guests who unsubscribed are skipped.
            </p>
            {recipientError && (
              <p className="text-xs text-destructive">{recipientError}</p>
            )}
          </div>
        </label>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={dismiss}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={() => void submit()} disabled={submitting}>
            {submitting ? "Working…" : submitLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
