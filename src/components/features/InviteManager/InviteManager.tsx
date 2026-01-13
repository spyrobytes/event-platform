"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { InviteForm } from "./InviteForm";
import { InviteTable } from "./InviteTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CreateInviteInput } from "@/schemas/invite";

type EmailStats = {
  total: number;
  queued: number;
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
  bounced: number;
};

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
  token?: string;
  rsvp?: {
    id: string;
    response: RsvpResponse;
    guestName: string;
    guestCount: number;
    respondedAt: string;
  } | null;
};

type InviteManagerProps = {
  eventId: string;
};

export function InviteManager({ eventId }: InviteManagerProps) {
  const { getIdToken } = useAuthContext();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [sendEmails, setSendEmails] = useState(true);

  const fetchInvites = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch(`/api/events/${eventId}/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch invites");
      }

      const data = await response.json();
      setInvites(data.data.invites);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invites");
    } finally {
      setLoading(false);
    }
  }, [eventId, getIdToken]);

  const fetchEmailStats = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch(`/api/events/${eventId}/emails`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setEmailStats(data.data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch email stats:", err);
    }
  }, [eventId, getIdToken]);

  useEffect(() => {
    fetchInvites();
    fetchEmailStats();
  }, [fetchInvites, fetchEmailStats]);

  const handleCreateInvites = async (
    data: CreateInviteInput | CreateInviteInput[]
  ) => {
    setSubmitting(true);
    setError(null);

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const body = Array.isArray(data)
        ? { invites: data, sendImmediately: sendEmails }
        : { ...data, sendImmediately: sendEmails };

      const response = await fetch(`/api/events/${eventId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create invite(s)");
      }

      const result = await response.json();

      // Add new invites to the list
      if (Array.isArray(data)) {
        setInvites((prev) => [...result.data.invites, ...prev]);
      } else {
        setInvites((prev) => [result.data, ...prev]);
      }

      // Refresh email stats if emails were sent
      if (sendEmails) {
        fetchEmailStats();
      }
    } catch (err) {
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async (invite: Invite) => {
    // For invites that were just created, we have the token
    // For existing invites, we need to regenerate or store the link differently
    // For now, we'll show a message
    if (invite.token) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      const link = `${baseUrl}/rsvp/${invite.token}`;
      await navigator.clipboard.writeText(link);
      alert("Link copied to clipboard!");
    } else {
      alert("Link not available. The invite link was only shown when created.");
    }
  };

  // Calculate stats
  const stats = {
    total: invites.length,
    pending: invites.filter((i) => i.status === "PENDING").length,
    sent: invites.filter((i) => i.status === "SENT").length,
    opened: invites.filter((i) => i.status === "OPENED").length,
    responded: invites.filter((i) => i.status === "RESPONDED").length,
    attending: invites.filter((i) => i.rsvp?.response === "YES").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Opened
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.opened}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Responded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.responded}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.attending}</p>
          </CardContent>
        </Card>
      </div>

      {/* Email Stats */}
      {emailStats && emailStats.total > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Email Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-xl font-bold text-green-600">{emailStats.delivered}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opened</p>
                <p className="text-xl font-bold text-blue-600">{emailStats.opened}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-xl font-bold text-red-600">{emailStats.failed}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bounced</p>
                <p className="text-xl font-bold text-orange-600">{emailStats.bounced}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Form */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="sendEmails"
            checked={sendEmails}
            onChange={(e) => setSendEmails(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <label htmlFor="sendEmails" className="text-sm font-medium">
            Send invitation emails immediately
          </label>
        </div>
        <InviteForm onSubmit={handleCreateInvites} isLoading={submitting} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Invite List */}
      <Card>
        <CardHeader>
          <CardTitle>Invites</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <InviteTable
              invites={invites}
              onCopyLink={handleCopyLink}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
