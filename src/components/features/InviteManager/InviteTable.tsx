"use client";

import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type InviteStatus = "PENDING" | "SENT" | "OPENED" | "RESPONDED" | "BOUNCED" | "EXPIRED" | "REVOKED";
type RsvpResponse = "YES" | "NO" | "MAYBE";

type Invite = {
  id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  status: InviteStatus;
  plusOnesAllowed: number;
  sentAt?: string | null;
  openedAt?: string | null;
  createdAt: string;
  token?: string;
  rsvp?: {
    id: string;
    response: RsvpResponse;
    guestName: string;
    guestCount: number;
    additionalGuestNames?: string[];
    respondedAt: string;
  } | null;
};

type InviteTableProps = {
  invites: Invite[];
  onResend?: (invite: Invite) => void;
  onCopyLink?: (invite: Invite) => void;
  onRegenerate?: (invite: Invite) => void;
  onRevoke?: (invite: Invite) => void;
  copiedInviteId?: string | null;
  tokenCache?: Map<string, string>;
  regeneratingId?: string | null;
};

const STATUS_CONFIG: Record<InviteStatus, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-surface-3 text-foreground" },
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

export function InviteTable({ invites, onResend, onCopyLink, onRegenerate, onRevoke, copiedInviteId, tokenCache, regeneratingId }: InviteTableProps) {
  const [revokeTarget, setRevokeTarget] = useState<Invite | null>(null);
  const [regenerateTarget, setRegenerateTarget] = useState<Invite | null>(null);

  if (invites.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">No invites yet</p>
      </div>
    );
  }

  return (
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

            return (
              <tr key={invite.id} className="hover:bg-muted/30">
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
                    {(() => {
                      const hasToken = !!(invite.token || tokenCache?.get(invite.id));
                      const isActive = invite.status !== "REVOKED" && invite.status !== "EXPIRED";

                      if (copiedInviteId === invite.id) {
                        return (
                          <span className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </span>
                        );
                      }

                      if (hasToken && onCopyLink) {
                        return (
                          <button
                            onClick={() => onCopyLink(invite)}
                            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.28" />
                            </svg>
                            Copy Link
                          </button>
                        );
                      }

                      if (!hasToken && isActive && onRegenerate) {
                        return regeneratingId === invite.id ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground">
                            <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Generating...
                          </span>
                        ) : (
                          <button
                            onClick={() => setRegenerateTarget(invite)}
                            className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-3/80 transition-colors"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                            </svg>
                            New Link
                          </button>
                        );
                      }

                      return null;
                    })()}
                    {onRevoke && invite.status !== "REVOKED" && invite.status !== "EXPIRED" && (
                      <button
                        onClick={() => setRevokeTarget(invite)}
                        className="text-xs text-destructive hover:underline"
                      >
                        Revoke
                      </button>
                    )}
                    {onResend && invite.email && invite.status !== "RESPONDED" && invite.status !== "REVOKED" && (
                      <button
                        onClick={() => onResend(invite)}
                        className="text-xs text-primary hover:underline"
                      >
                        Resend
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {onRevoke && (
        <ConfirmDialog
          open={!!revokeTarget}
          onCancel={() => setRevokeTarget(null)}
          onConfirm={() => {
            if (revokeTarget) {
              onRevoke(revokeTarget);
              setRevokeTarget(null);
            }
          }}
          title="Revoke Invitation"
          description={
            revokeTarget
              ? `Are you sure you want to revoke the invite for ${revokeTarget.name || revokeTarget.email || revokeTarget.phone}? They will no longer be able to view or respond to the invitation.`
              : ""
          }
          confirmLabel="Revoke"
          variant="destructive"
        />
      )}

      {onRegenerate && (
        <ConfirmDialog
          open={!!regenerateTarget}
          onCancel={() => setRegenerateTarget(null)}
          onConfirm={() => {
            if (regenerateTarget) {
              onRegenerate(regenerateTarget);
              setRegenerateTarget(null);
            }
          }}
          title="Generate New Link"
          description={
            regenerateTarget
              ? `This will create a new invite link for ${regenerateTarget.name || regenerateTarget.email || regenerateTarget.phone} and invalidate their previous link. The new link will be copied to your clipboard.`
              : ""
          }
          confirmLabel="Generate & Copy"
        />
      )}
    </div>
  );
}
