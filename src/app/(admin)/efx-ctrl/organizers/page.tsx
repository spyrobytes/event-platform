"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Organizer = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  emailVerified: boolean;
  eventCount: number;
  inviteCode: string | null;
  createdAt: string;
};

export default function AdminOrganizersPage() {
  const { getIdToken } = useAuthContext();
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrganizers = useCallback(async () => {
    try {
      const token = await getIdToken();
      const res = await fetch("/api/admin/organizers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        setOrganizers(data.organizers);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => { fetchOrganizers(); }, [fetchOrganizers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organizers</h1>
        <p className="text-sm text-muted-foreground">
          {organizers.length} registered user{organizers.length !== 1 ? "s" : ""}
        </p>
      </div>

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
                    <th className="pb-2 pr-4 font-medium">Verified</th>
                    <th className="pb-2 pr-4 font-medium">Events</th>
                    <th className="pb-2 pr-4 font-medium">Invite Code</th>
                    <th className="pb-2 font-medium">Joined</th>
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
                        {org.name || "—"}
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
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(org.createdAt).toLocaleDateString()}
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
