"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SharePhoneInvite } from "./SharePhoneInvite";

type InviteStatus = "PENDING" | "DRAFTED" | "SENT" | "OPENED" | "RESPONDED" | "BOUNCED" | "EXPIRED" | "REVOKED";
type RsvpResponse = "YES" | "NO" | "MAYBE";
type EmailOutboxStatus =
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "OPENED"
  | "FAILED"
  | "BOUNCED";

type Invite = {
  id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  status: InviteStatus;
  plusOnesAllowed: number;
  seatAssignment: string | null;
  plannerNotes: string | null;
  tokenRegenerateCount?: number;
  sentAt?: string | null;
  openedAt?: string | null;
  createdAt: string;
  token?: string;
  passId: string;
  rsvp?: {
    id: string;
    response: RsvpResponse;
    guestName: string;
    guestCount: number;
    additionalGuestNames?: string[];
    respondedAt: string;
  } | null;
  emails?: {
    id: string;
    status: EmailOutboxStatus;
    error: string | null;
    createdAt: string;
  }[];
};

type InviteTableProps = {
  invites: Invite[];
  onResend?: (invite: Invite) => void | Promise<void>;
  onCopyLink?: (invite: Invite) => void | Promise<void>;
  onCopyPassLink?: (invite: Invite) => void | Promise<void>;
  onRowClick?: (invite: Invite) => void;
  copiedInviteId?: string | null;
  tokenCache?: Map<string, string>;
  /** Builds the shareable RSVP link for an invite (returns null when no raw
   *  token is available client-side, e.g. after a reload). Used by the
   *  phone-only WhatsApp/SMS deep links. */
  getShareLink?: (invite: Invite) => string | null;
  /** Event title, woven into the prefilled WhatsApp/SMS message. */
  eventTitle?: string;
  /** Marks a phone-only invite as shared when the organizer taps a channel. */
  onMarkShared?: (invite: Invite) => void;
  /** Invite IDs whose Resend POST is currently in flight. Used to disable
   *  the Resend button so a fast double-click can't create two outbox rows. */
  resendingInviteIds?: Set<string>;
};

const STATUS_CONFIG: Record<InviteStatus, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-surface-3 text-foreground" },
  DRAFTED: { label: "Drafted", className: "bg-violet-500/20 text-violet-600 dark:text-violet-400" },
  SENT: { label: "Sent", className: "bg-blue-500/20 text-blue-600 dark:text-blue-400" },
  OPENED: { label: "Opened", className: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" },
  RESPONDED: { label: "Responded", className: "bg-green-500/20 text-green-600 dark:text-green-400" },
  BOUNCED: { label: "Bounced", className: "bg-red-500/20 text-red-600 dark:text-red-400" },
  EXPIRED: { label: "Expired", className: "bg-surface-3 text-foreground" },
  REVOKED: { label: "Revoked", className: "bg-red-500/20 text-red-600 dark:text-red-400" },
};

const RESPONSE_CONFIG: Record<RsvpResponse, { label: string; className: string }> = {
  YES: { label: "Going", className: "text-green-600 dark:text-green-400" },
  NO: { label: "Not Going", className: "text-red-600 dark:text-red-400" },
  MAYBE: { label: "Maybe", className: "text-yellow-600 dark:text-yellow-400" },
};

export function InviteTable({ invites, onResend, onCopyLink, onCopyPassLink, onRowClick, copiedInviteId, tokenCache, getShareLink, eventTitle, onMarkShared, resendingInviteIds }: InviteTableProps) {
  if (invites.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">No invites yet</p>
      </div>
    );
  }

  return (
    <>
      {onRowClick && (
        <p className="mb-2 text-xs text-muted-foreground">
          Tip: click any row to manage seating, notes, and link actions.
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Guest</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">RSVP</th>
            <th className="px-4 py-3 text-left font-medium">Guests</th>
            <th className="px-4 py-3 text-left font-medium">Created</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {invites.map((invite) => {
            const statusConfig = STATUS_CONFIG[invite.status];
            const responseConfig = invite.rsvp
              ? RESPONSE_CONFIG[invite.rsvp.response]
              : null;

            const handleRowActivate = () => {
              if (onRowClick) onRowClick(invite);
            };
            const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
              if (!onRowClick) return;
              // Only act when the row itself is focused. Without this, an
              // Enter/Space keydown originating from a focusable child (the
              // WhatsApp/SMS/Copy controls) bubbles here and preventDefault()
              // cancels the child's own activation — so keyboard users would
              // open the panel instead of triggering the control.
              if (e.target !== e.currentTarget) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onRowClick(invite);
              }
            };
            const stopBubble = (e: React.SyntheticEvent) => e.stopPropagation();

            return (
              <tr
                key={invite.id}
                className={cn(
                  "hover:bg-muted/30",
                  onRowClick && "cursor-pointer focus:bg-muted/50 focus:outline-none"
                )}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "button" : undefined}
                aria-label={
                  onRowClick
                    ? `Open details for ${invite.name || invite.email || invite.phone || "invite"}`
                    : undefined
                }
                onClick={onRowClick ? handleRowActivate : undefined}
                onKeyDown={onRowClick ? handleRowKeyDown : undefined}
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">
                      {invite.name || (invite.email ? invite.email.split("@")[0] : invite.phone)}
                    </p>
                    {invite.email && (
                      <p className="text-xs text-muted-foreground">{invite.email}</p>
                    )}
                    {invite.phone && (
                      <p className="text-xs text-muted-foreground">{invite.phone}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                      statusConfig.className
                    )}
                    title={
                      invite.status === "DRAFTED"
                        ? "Invite link composed and shared from your device. We can't confirm it was sent or delivered — \"Opened\" appears once the guest visits the link."
                        : undefined
                    }
                  >
                    {statusConfig.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {responseConfig ? (
                    <span className={cn("font-medium", responseConfig.className)}>
                      {responseConfig.label}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {invite.rsvp ? (
                    <div>
                      <span>{invite.rsvp.guestCount}</span>
                      {invite.rsvp.additionalGuestNames && invite.rsvp.additionalGuestNames.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {invite.rsvp.additionalGuestNames.join(", ")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {format(new Date(invite.createdAt), "MMM d, yyyy")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {copiedInviteId === invite.id ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </span>
                    ) : (() => {
                      const hasToken = !!(invite.token || tokenCache?.get(invite.id));
                      if (!hasToken || !onCopyLink) return null;
                      const isPhoneOnly = !invite.email;

                      // Phone-only: hand the organizer pre-addressed WhatsApp /
                      // SMS drafts (plus a copy fallback) instead of just the
                      // link. Needs the number + a resolvable share link.
                      const shareLink =
                        isPhoneOnly && getShareLink ? getShareLink(invite) : null;
                      if (isPhoneOnly && invite.phone && shareLink) {
                        return (
                          <SharePhoneInvite
                            phone={invite.phone}
                            link={shareLink}
                            guestName={invite.name ?? invite.rsvp?.guestName ?? null}
                            eventTitle={eventTitle}
                            onCopy={() => onCopyLink(invite)}
                            onShared={() => onMarkShared?.(invite)}
                          />
                        );
                      }

                      // Email invite (or phone-only fallback) → single copy button
                      return (
                        <button
                          onClick={(e) => {
                            stopBubble(e);
                            onCopyLink(invite);
                          }}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                            isPhoneOnly
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                              : "bg-foreground/10 text-foreground hover:bg-foreground/20"
                          )}
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.28" />
                          </svg>
                          {isPhoneOnly ? "Copy & Share Link" : "Copy Link"}
                        </button>
                      );
                    })()}
                    {(() => {
                      // "Copy pass link" is the recovery affordance for a
                      // YES-RSVP'd guest who lost / didn't receive their
                      // confirmation email. Hidden on non-YES rows because
                      // the pass URL would render "pending" or "declined" —
                      // not useful to share via SMS/AirDrop.
                      const isYes = invite.rsvp?.response === "YES";
                      if (!isYes || !onCopyPassLink) return null;
                      return (
                        <button
                          onClick={(e) => {
                            stopBubble(e);
                            onCopyPassLink(invite);
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-foreground/10 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-foreground/20"
                          title="Copy the venue access pass URL — share with the guest if they lost the confirmation email."
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                          </svg>
                          Copy pass link
                        </button>
                      );
                    })()}
                    {(() => {
                      // Resend is gated to FAILED/BOUNCED outbox rows. The
                      // resend API only accepts those states; gating in the
                      // UI prevents a click that the API would reject.
                      const lastEmail = invite.emails?.[0];
                      const canResend =
                        !!onResend &&
                        !!invite.email &&
                        invite.status !== "REVOKED" &&
                        (lastEmail?.status === "FAILED" || lastEmail?.status === "BOUNCED");
                      if (!canResend) return null;
                      const isResending = resendingInviteIds?.has(invite.id) ?? false;
                      return (
                        <button
                          onClick={(e) => {
                            stopBubble(e);
                            if (isResending) return;
                            onResend!(invite);
                          }}
                          disabled={isResending}
                          aria-busy={isResending}
                          className="text-xs text-foreground hover:underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                          title={lastEmail?.error || undefined}
                        >
                          {isResending ? "Resending…" : "Resend"}
                        </button>
                      );
                    })()}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
