"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";

type InviteStatus = "PENDING" | "SENT" | "OPENED" | "RESPONDED" | "BOUNCED" | "EXPIRED";
type RsvpResponse = "YES" | "NO" | "MAYBE";

type Invite = {
  id: string;
  email: string;
  name?: string | null;
  status: InviteStatus;
  plusOnesAllowed: number;
  sentAt?: string | null;
  openedAt?: string | null;
  createdAt: string;
  rsvp?: {
    id: string;
    response: RsvpResponse;
    guestName: string;
    guestCount: number;
    respondedAt: string;
  } | null;
};

type InviteTableProps = {
  invites: Invite[];
  onResend?: (invite: Invite) => void;
  onCopyLink?: (invite: Invite) => void;
};

const STATUS_CONFIG: Record<InviteStatus, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-surface-3 text-foreground" },
  SENT: { label: "Sent", className: "bg-blue-500/20 text-blue-600 dark:text-blue-400" },
  OPENED: { label: "Opened", className: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" },
  RESPONDED: { label: "Responded", className: "bg-green-500/20 text-green-600 dark:text-green-400" },
  BOUNCED: { label: "Bounced", className: "bg-red-500/20 text-red-600 dark:text-red-400" },
  EXPIRED: { label: "Expired", className: "bg-surface-3 text-foreground" },
};

const RESPONSE_CONFIG: Record<RsvpResponse, { label: string; className: string }> = {
  YES: { label: "Going", className: "text-green-600 dark:text-green-400" },
  NO: { label: "Not Going", className: "text-red-600 dark:text-red-400" },
  MAYBE: { label: "Maybe", className: "text-yellow-600 dark:text-yellow-400" },
};

export function InviteTable({ invites, onResend, onCopyLink }: InviteTableProps) {
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
                      {invite.name || invite.email.split("@")[0]}
                    </p>
                    <p className="text-xs text-muted-foreground">{invite.email}</p>
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
                    <span>{invite.rsvp.guestCount}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {format(new Date(invite.createdAt), "MMM d, yyyy")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {onCopyLink && (
                      <button
                        onClick={() => onCopyLink(invite)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Copy Link
                      </button>
                    )}
                    {onResend && invite.status !== "RESPONDED" && (
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
    </div>
  );
}
