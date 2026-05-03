"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDebouncedSave, type SaveStatus } from "@/hooks/useDebouncedSave";

const FIELD_MAX = 500;
/** Must match MAX_REGENERATIONS in the regenerate API route. */
const MAX_REGENERATIONS = 3;

type RsvpResponse = "YES" | "NO" | "MAYBE";

export type PanelInvite = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  plusOnesAllowed: number;
  seatAssignment: string | null;
  plannerNotes: string | null;
  tokenRegenerateCount?: number;
  rsvpCodeIssuedAt?: string | null;
  rsvpCodeRegenerateCount?: number;
  rsvp?: {
    response: RsvpResponse;
    guestName: string;
    guestCount: number;
    dietaryRestrictions?: string | null;
    musicSuggestions?: string | null;
  } | null;
};

export type PlanningFields = {
  seatAssignment: string | null;
  plannerNotes: string | null;
};

export type InvitePlanningPanelProps = {
  open: boolean;
  invite: PanelInvite | null;
  /** Raw invite token — required for the Copy invite link action. When absent, the Copy button is disabled. */
  token: string | null;
  onClose: () => void;
  onSavePlanning: (data: PlanningFields) => Promise<void>;
  onRegenerate?: () => Promise<void>;
  onRegenerateRsvpCode?: () => Promise<{ rsvpCode: string } | null>;
  onRevoke?: () => Promise<void>;
};

const RSVP_BADGE: Record<RsvpResponse | "PENDING" | "REVOKED", { label: string; cls: string }> = {
  YES: { label: "Attending", cls: "bg-green-100 text-green-800 border-green-200" },
  MAYBE: { label: "Maybe", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  NO: { label: "Declined", cls: "bg-red-100 text-red-800 border-red-200" },
  PENDING: { label: "RSVP pending", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  REVOKED: { label: "Revoked", cls: "bg-red-100 text-red-800 border-red-200" },
};

function getPartyLabel(invite: PanelInvite): string | null {
  if (invite.rsvp && invite.rsvp.guestCount > 1) {
    return `Party of ${invite.rsvp.guestCount}`;
  }
  if (!invite.rsvp && invite.plusOnesAllowed > 0) {
    return `Up to ${1 + invite.plusOnesAllowed} guests`;
  }
  return null;
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const text =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved ✓"
        : "Save failed";
  const cls =
    status === "error"
      ? "text-red-600"
      : status === "saved"
        ? "text-green-600"
        : "text-muted-foreground";
  return (
    <span className={cn("text-xs", cls)} aria-live="polite">
      {text}
    </span>
  );
}

export function InvitePlanningPanel({
  open,
  invite,
  token,
  onClose,
  onSavePlanning,
  onRegenerate,
  onRegenerateRsvpCode,
  onRevoke,
}: InvitePlanningPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Local edit state keyed off invite id — reset when invite changes.
  const [seat, setSeat] = useState<string>(invite?.seatAssignment ?? "");
  const [notes, setNotes] = useState<string>(invite?.plannerNotes ?? "");
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [freshRsvpCode, setFreshRsvpCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const currentInviteIdRef = useRef<string | null>(invite?.id ?? null);
  useEffect(() => {
    if (invite && invite.id !== currentInviteIdRef.current) {
      currentInviteIdRef.current = invite.id;
      setSeat(invite.seatAssignment ?? "");
      setNotes(invite.plannerNotes ?? "");
      setCopied(false);
      // Newly-issued code is single-use display — clear when switching invites.
      setFreshRsvpCode(null);
      setCodeCopied(false);
    }
  }, [invite]);

  const save = useCallback(
    async (next: PlanningFields) => {
      await onSavePlanning(next);
    },
    [onSavePlanning]
  );

  const seatForSave = seat.trim() === "" ? null : seat;
  const notesForSave = notes.trim() === "" ? null : notes;
  // Memoize the snapshot so its reference is stable when underlying primitives
  // don't change. useDebouncedSave compares with Object.is, so a fresh object
  // every render would look like a change and cause an auto-save loop.
  const planningSnapshot = useMemo<PlanningFields>(
    () => ({
      seatAssignment: seatForSave,
      plannerNotes: notesForSave,
    }),
    [seatForSave, notesForSave]
  );

  const { status, retry } = useDebouncedSave(planningSnapshot, save, { delay: 500 });

  // Sync native <dialog> open state with the `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleCopyLink = useCallback(async () => {
    if (!token) return;
    const baseUrl =
      typeof window !== "undefined"
        ? (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin)
        : (process.env.NEXT_PUBLIC_BASE_URL ?? "");
    const url = `${baseUrl}/invite/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [token]);

  const handleRegenerateClick = useCallback(async () => {
    if (!onRegenerate) return;
    try {
      setRegenerating(true);
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  }, [onRegenerate]);

  const handleRegenerateRsvpCodeClick = useCallback(async () => {
    if (!onRegenerateRsvpCode) return;
    try {
      setRegeneratingCode(true);
      setCodeCopied(false);
      const result = await onRegenerateRsvpCode();
      if (result) setFreshRsvpCode(result.rsvpCode);
    } finally {
      setRegeneratingCode(false);
    }
  }, [onRegenerateRsvpCode]);

  const handleCopyRsvpCode = useCallback(async () => {
    if (!freshRsvpCode) return;
    await navigator.clipboard.writeText(freshRsvpCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [freshRsvpCode]);

  const handleRevokeClick = useCallback(async () => {
    if (!onRevoke) return;
    try {
      setRevoking(true);
      await onRevoke();
    } finally {
      setRevoking(false);
    }
  }, [onRevoke]);

  if (!open) return null;

  // Empty state: panel was opened (e.g. via ?invite=<id>) but the referenced invite was not found.
  if (!invite) {
    return (
      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
        className={cn(
          "fixed inset-y-0 right-0 m-0 h-full max-h-none w-full max-w-[480px] rounded-none border-0 border-l border-border bg-card text-card-foreground p-0 shadow-lg",
          "max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-0 max-sm:h-[75vh] max-sm:max-w-none max-sm:border-l-0 max-sm:border-t",
          "backdrop:bg-black/40 backdrop:backdrop-blur-sm"
        )}
        aria-labelledby="planning-panel-title"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 id="planning-panel-title" className="text-lg font-semibold">
              Invite not found
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close panel">
              ×
            </Button>
          </div>
          <div className="flex-1 p-6 text-sm text-muted-foreground">
            <p>
              This invite may have been deleted or is not available on the current page. Close this
              panel to continue.
            </p>
          </div>
        </div>
      </dialog>
    );
  }

  const isRevoked = invite.status === "REVOKED";
  // REVOKED takes precedence over RSVP state — even if a guest had previously
  // RSVP'd, the invite is no longer active and the surface should reflect
  // that, not the historical RSVP response.
  const badgeKey: RsvpResponse | "PENDING" | "REVOKED" = isRevoked
    ? "REVOKED"
    : (invite.rsvp?.response ?? "PENDING");
  const badge = RSVP_BADGE[badgeKey];
  const displayName = invite.name ?? invite.rsvp?.guestName ?? invite.email ?? "Guest";
  const partyLabel = getPartyLabel(invite);
  const canCopy = Boolean(token) && !isRevoked;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={cn(
        "fixed inset-y-0 right-0 m-0 h-full max-h-none w-full max-w-[480px] rounded-none border-0 border-l border-border bg-card text-card-foreground p-0 shadow-lg",
        "max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-0 max-sm:h-[75vh] max-sm:max-w-none max-sm:border-l-0 max-sm:border-t",
        "backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      )}
      aria-labelledby="planning-panel-title"
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div className="min-w-0 flex-1">
            <h2 id="planning-panel-title" className="truncate text-lg font-semibold">
              {displayName}
            </h2>
            <SaveIndicator status={status} />
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close panel">
            ×
          </Button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {isRevoked && (
            <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              This invite has been revoked. The link no longer works and the
              recipient cannot RSVP. RSVP history is preserved below for your
              records.
            </div>
          )}
          {/* Overview */}
          <section className="border-b border-border p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Overview
            </h3>
            <dl className="space-y-2 text-sm">
              {invite.email && (
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted-foreground">Email</dt>
                  <dd className="min-w-0 break-words">{invite.email}</dd>
                </div>
              )}
              {invite.phone && (
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted-foreground">Phone</dt>
                  <dd>{invite.phone}</dd>
                </div>
              )}
              <div className="flex gap-2 items-center">
                <dt className="w-20 shrink-0 text-muted-foreground">RSVP</dt>
                <dd>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                      badge.cls
                    )}
                  >
                    {badge.label}
                  </span>
                </dd>
              </div>
              {partyLabel && (
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted-foreground">Party</dt>
                  <dd>{partyLabel}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Guest responses — only shown when the guest has RSVP'd and provided
              free-text details. Read-only here; editable on the guest's RSVP form. */}
          {invite.rsvp &&
            (invite.rsvp.dietaryRestrictions || invite.rsvp.musicSuggestions) && (
              <section className="border-b border-border p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Guest responses
                </h3>
                <dl className="space-y-3 text-sm">
                  {invite.rsvp.dietaryRestrictions && (
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground">
                        Dietary restrictions
                      </dt>
                      <dd className="mt-0.5 whitespace-pre-wrap break-words">
                        {invite.rsvp.dietaryRestrictions}
                      </dd>
                    </div>
                  )}
                  {invite.rsvp.musicSuggestions && (
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground">
                        Song requests
                      </dt>
                      <dd className="mt-0.5 whitespace-pre-wrap break-words">
                        {invite.rsvp.musicSuggestions}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

          {/* Invite link */}
          <section className="border-b border-border p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Invite link
            </h3>
            {isRevoked ? (
              <p className="text-xs text-muted-foreground">
                The invite link is disabled because this invite has been revoked.
              </p>
            ) : canCopy ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                disabled={copied}
              >
                {copied ? "Copied ✓" : "Copy invite link"}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                The raw invite link isn&apos;t stored server-side. Use{" "}
                <span className="font-medium">Regenerate invite link</span> below to create a fresh
                one — the new link will be copied to your clipboard.
              </p>
            )}
          </section>

          {/* RSVP code — public-portal entry point, paired with the invite link */}
          {onRegenerateRsvpCode && !isRevoked && (
            <section className="border-b border-border p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                RSVP code
              </h3>
              {freshRsvpCode ? (
                // Just-issued code — visible once. After the panel closes or
                // the user switches invites, it's gone (only the hash persists).
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    New code issued. Copy it now — for security, it won&apos;t be shown again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm tracking-wider">
                      {freshRsvpCode}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyRsvpCode}
                      disabled={codeCopied}
                    >
                      {codeCopied ? "Copied ✓" : "Copy"}
                    </Button>
                  </div>
                </div>
              ) : invite.rsvpCodeIssuedAt ? (
                <p className="text-xs text-muted-foreground">
                  A code is set on this invite (sent in the invite email). The raw value
                  isn&apos;t stored server-side — use{" "}
                  <span className="font-medium">Regenerate RSVP code</span> below to issue a fresh
                  one if the guest needs it again.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No public-portal code has been issued yet. Use{" "}
                  <span className="font-medium">Regenerate RSVP code</span> below to create one.
                </p>
              )}
            </section>
          )}

          {/* Planning */}
          <section className="border-b border-border p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Planning
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="planning-seat"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Seat assignment
                </label>
                <input
                  id="planning-seat"
                  type="text"
                  value={seat}
                  onChange={(e) => setSeat(e.target.value.slice(0, FIELD_MAX))}
                  maxLength={FIELD_MAX}
                  placeholder="e.g. Table 3, Seat 7"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <SaveFailedRetry status={status} onRetry={retry} />
              </div>
              <div>
                <label
                  htmlFor="planning-notes"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Planner notes
                </label>
                <textarea
                  id="planning-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, FIELD_MAX))}
                  maxLength={FIELD_MAX}
                  rows={4}
                  placeholder="Allergies, accessibility, VIP flags…"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div
                  className="mt-1 text-right text-xs text-muted-foreground"
                  aria-live="polite"
                >
                  {notes.length}/{FIELD_MAX}
                </div>
              </div>
            </div>
          </section>

          {/* Manage invite */}
          {(onRegenerate || onRegenerateRsvpCode || onRevoke) && !isRevoked && (
            <section className="p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Manage invite
              </h3>
              <div className="space-y-4">
                {onRegenerate && (() => {
                  const used = invite.tokenRegenerateCount ?? 0;
                  const remaining = Math.max(0, MAX_REGENERATIONS - used);
                  const limitReached = remaining <= 0;
                  const label = regenerating
                    ? "Regenerating…"
                    : limitReached
                      ? "Limit reached"
                      : `Regenerate invite link (${remaining} left)`;
                  return (
                    <div className="space-y-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerateClick}
                        disabled={regenerating || limitReached}
                      >
                        {label}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {limitReached ? (
                          <>
                            This invite has been regenerated {MAX_REGENERATIONS} times. Revoke it
                            and create a new invite if the guest still needs access.
                          </>
                        ) : (
                          <>
                            Creates a new invite link and invalidates the old one. The new link is
                            copied to your clipboard. You can regenerate up to {MAX_REGENERATIONS}{" "}
                            times per invite.
                          </>
                        )}
                      </p>
                    </div>
                  );
                })()}
                {onRegenerateRsvpCode && (() => {
                  const used = invite.rsvpCodeRegenerateCount ?? 0;
                  const remaining = Math.max(0, MAX_REGENERATIONS - used);
                  const limitReached = remaining <= 0;
                  const label = regeneratingCode
                    ? "Regenerating code…"
                    : limitReached
                      ? "Code limit reached"
                      : `Regenerate RSVP code (${remaining} left)`;
                  return (
                    <div className="space-y-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerateRsvpCodeClick}
                        disabled={regeneratingCode || limitReached}
                      >
                        {label}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {limitReached ? (
                          <>
                            This invite&apos;s RSVP code has been regenerated{" "}
                            {MAX_REGENERATIONS} times. Revoke and re-create the invite if the
                            guest still needs a working code.
                          </>
                        ) : (
                          <>
                            Issues a new public-portal code and invalidates the old one. The new
                            code appears once above — copy it before closing the panel.
                          </>
                        )}
                      </p>
                    </div>
                  );
                })()}
                {onRevoke && invite.status !== "REVOKED" && (
                  <div className="space-y-1.5">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRevokeClick}
                      disabled={revoking}
                    >
                      {revoking ? "Revoking…" : "Revoke invite"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Permanently revokes access. The guest will no longer be able to open their
                      invitation page or submit an RSVP. Any existing RSVP data is preserved for
                      your records.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </dialog>
  );
}

function SaveFailedRetry({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status !== "error") return null;
  return (
    <button
      type="button"
      onClick={onRetry}
      className="mt-1 text-xs text-red-600 underline hover:no-underline"
    >
      Save failed — retry
    </button>
  );
}
