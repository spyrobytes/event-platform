"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Invite = {
  id: string;
  code: string;
  email: string | null;
  status: string;
  usesRemaining: number;
  expiresAt: string | null;
  sentAt: string | null;
  claimedAt: string | null;
  createdAt: string;
  claimedBy: { id: string; email: string; name: string | null } | null;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  CLAIMED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  REVOKED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  EXPIRED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function AdminInvitesPage() {
  const { getIdToken } = useAuthContext();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genCount, setGenCount] = useState(1);
  const [genEmail, setGenEmail] = useState("");
  const [genExpiry, setGenExpiry] = useState(30);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    try {
      const token = await getIdToken();
      const res = await fetch("/api/admin/invites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        setInvites(data.invites);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          count: genCount,
          email: genEmail || undefined,
          expiresInDays: genExpiry,
        }),
      });

      if (res.ok) {
        setGenEmail("");
        await fetchInvites();
      }
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const token = await getIdToken();
      await fetch(`/api/admin/invites/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "REVOKED" }),
      });
      await fetchInvites();
    } catch {
      // silent
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyInviteLink = async (code: string) => {
    const url = `${window.location.origin}/join?code=${code}`;
    await navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const stats = {
    total: invites.length,
    pending: invites.filter((i) => i.status === "PENDING" || i.status === "SENT").length,
    claimed: invites.filter((i) => i.status === "CLAIMED").length,
    revoked: invites.filter((i) => i.status === "REVOKED").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Launch Invites</h1>
        <p className="text-sm text-muted-foreground">
          Generate and manage invite codes for the invitational launch.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total },
          { label: "Available", value: stats.pending },
          { label: "Claimed", value: stats.claimed },
          { label: "Revoked", value: stats.revoked },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generate */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Invite Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="gen-count">Count</Label>
              <Input
                id="gen-count"
                type="number"
                min={1}
                max={50}
                value={genCount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenCount(Number(e.target.value))}
                className="w-20"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gen-email">Email (optional)</Label>
              <Input
                id="gen-email"
                type="email"
                placeholder="organizer@example.com"
                value={genEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenEmail(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gen-expiry">Expires in (days)</Label>
              <Input
                id="gen-expiry"
                type="number"
                min={1}
                max={365}
                value={genExpiry}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenExpiry(Number(e.target.value))}
                className="w-20"
              />
            </div>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invites</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invites yet. Generate some above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium">Code</th>
                    <th className="pb-2 pr-4 font-medium">Email</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Claimed By</th>
                    <th className="pb-2 pr-4 font-medium">Expires</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => (
                    <tr key={invite.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                          {invite.code}
                        </code>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {invite.email || "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[invite.status] || ""}`}>
                          {invite.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {invite.claimedBy?.email || "—"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {invite.expiresAt
                          ? new Date(invite.expiresAt).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCode(invite.code)}
                            className="h-7 text-xs"
                          >
                            {copied === invite.code ? "Copied!" : "Copy"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInviteLink(invite.code)}
                            className="h-7 text-xs"
                          >
                            Link
                          </Button>
                          {(invite.status === "PENDING" || invite.status === "SENT") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevoke(invite.id)}
                              className="h-7 text-xs text-destructive hover:text-destructive"
                            >
                              Revoke
                            </Button>
                          )}
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
