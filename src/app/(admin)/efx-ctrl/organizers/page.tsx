"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OrganizerStatus = "ACTIVE" | "UNDER_REVIEW" | "SUSPENDED" | "BANNED";

type Organizer = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  status: OrganizerStatus;
  emailVerified: boolean;
  eventCount: number;
  inviteCode: string | null;
  createdAt: string;
};

const STATUS_COLORS: Record<OrganizerStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  UNDER_REVIEW: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  SUSPENDED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  BANNED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const STATUS_LABELS: Record<OrganizerStatus, string> = {
  ACTIVE: "Active",
  UNDER_REVIEW: "Under Review",
  SUSPENDED: "Suspended",
  BANNED: "Banned",
};

const STATUS_ACTIONS: { label: string; status: OrganizerStatus; confirm: string; needsReason: boolean }[] = [
  { label: "Review", status: "UNDER_REVIEW", confirm: "Place this organizer under review?", needsReason: false },
  { label: "Suspend", status: "SUSPENDED", confirm: "Suspend this organizer? They will lose write access.", needsReason: true },
  { label: "Ban", status: "BANNED", confirm: "Ban this organizer? Their Firebase account will be disabled.", needsReason: true },
  { label: "Restore", status: "ACTIVE", confirm: "Restore this organizer to active status?", needsReason: false },
];

export default function AdminOrganizersPage() {
  const { getIdToken } = useAuthContext();
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizers = useCallback(async () => {
    try {
      setError(null);
      const token = await getIdToken();
      const res = await fetch("/api/admin/organizers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        setOrganizers(data.organizers);
      } else {
        setError("Failed to load organizers");
      }
    } catch {
      setError("Failed to load organizers");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => { fetchOrganizers(); }, [fetchOrganizers]);

  const handleStatusChange = async (orgId: string, newStatus: OrganizerStatus, confirmMsg: string, needsReason: boolean) => {
    if (!confirm(confirmMsg)) return;

    let reason: string | undefined;
    if (needsReason) {
      const input = prompt("Reason (optional):");
      if (input) reason = input;
    }

    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/admin/organizers/${orgId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      if (res.ok) {
        await fetchOrganizers();
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error || "Failed to update status");
      }
    } catch {
      setError("Failed to update status");
    }
  };

  const getAvailableActions = (org: Organizer) => {
    if (org.isAdmin) return [];
    return STATUS_ACTIONS.filter((a) => a.status !== org.status);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organizers</h1>
        <p className="text-sm text-muted-foreground">
          {organizers.length} registered user{organizers.length !== 1 ? "s" : ""}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : organizers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium">Email</th>
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Verified</th>
                    <th className="pb-2 pr-4 font-medium">Events</th>
                    <th className="pb-2 pr-4 font-medium">Invite Code</th>
                    <th className="pb-2 pr-4 font-medium">Joined</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organizers.map((org) => (
                    <tr key={org.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          {org.email}
                          {org.isAdmin && (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-400">
                              Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {org.name || "\u2014"}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[org.status] || ""}`}>
                          {STATUS_LABELS[org.status] || org.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {org.emailVerified ? (
                          <span className="text-emerald-600">Yes</span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">{org.eventCount}</td>
                      <td className="py-3 pr-4">
                        {org.inviteCode ? (
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                            {org.inviteCode}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">{"\u2014"}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {getAvailableActions(org).map((action) => (
                            <Button
                              key={action.status}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(org.id, action.status, action.confirm, action.needsReason)}
                              className={`h-7 text-xs ${
                                action.status === "BANNED" || action.status === "SUSPENDED"
                                  ? "text-destructive hover:text-destructive"
                                  : ""
                              }`}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
