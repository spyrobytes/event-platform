"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClaimRow = {
  id: string;
  itemId: string;
  itemName: string;
  itemCategory: string | null;
  itemAmountLabel: string | null;
  itemQuantity: number;
  quantity: number;
  claimedAt: string;
  thankYouSentAt: string | null;
  guestName: string | null;
  guestEmail: string | null;
};

type EventBasic = { id: string; title: string };

export default function RegistryThanksPage() {
  const params = useParams<{ id: string }>();
  const { getIdToken } = useAuthContext();
  const [event, setEvent] = useState<EventBasic | null>(null);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }
      const [eventRes, claimsRes] = await Promise.all([
        fetch(`/api/events/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/events/${params.id}/registry/claims`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (!eventRes.ok) throw new Error("Event not found");
      if (!claimsRes.ok) throw new Error("Failed to load claims");
      const eventData = await eventRes.json();
      const claimsData = await claimsRes.json();
      setEvent({ id: eventData.data.id, title: eventData.data.title });
      setClaims(claimsData.data.claims as ClaimRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params.id, getIdToken]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleThankYou = useCallback(
    async (claimId: string, next: boolean) => {
      setPendingId(claimId);
      setError(null);
      // Optimistic update
      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimId
            ? { ...c, thankYouSentAt: next ? new Date().toISOString() : null }
            : c
        )
      );
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Not authenticated");
        const res = await fetch(
          `/api/events/${params.id}/registry/claims/${claimId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ thankYouSent: next }),
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to update");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update");
        // Revert — reload from server to stay consistent
        load();
      } finally {
        setPendingId(null);
      }
    },
    [params.id, getIdToken, load]
  );

  // Per-item rollup: for items with quantity > 1 the organizer needs to see
  // "X of Y claimed" at a glance. Group claims by itemId, preserving the
  // server's claimedAt-desc order so the most recent activity stays on top.
  const itemGroups = useMemo(() => {
    type Group = {
      itemId: string;
      itemName: string;
      itemCategory: string | null;
      itemAmountLabel: string | null;
      itemQuantity: number;
      claimedQuantity: number;
      claims: ClaimRow[];
    };
    const order: string[] = [];
    const groups = new Map<string, Group>();
    for (const c of claims) {
      let g = groups.get(c.itemId);
      if (!g) {
        g = {
          itemId: c.itemId,
          itemName: c.itemName,
          itemCategory: c.itemCategory,
          itemAmountLabel: c.itemAmountLabel,
          itemQuantity: c.itemQuantity,
          claimedQuantity: 0,
          claims: [],
        };
        groups.set(c.itemId, g);
        order.push(c.itemId);
      }
      g.claimedQuantity += c.quantity;
      g.claims.push(c);
    }
    return order.map((id) => groups.get(id)!);
  }, [claims]);

  const summary = useMemo(() => {
    const totalClaims = claims.length;
    const thankYousSent = claims.filter((c) => c.thankYouSentAt).length;
    const thankYousDue = totalClaims - thankYousSent;
    return { totalClaims, thankYousSent, thankYousDue };
  }, [claims]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10">
          <p className="text-sm text-destructive">{error || "Event not found"}</p>
        </div>
        <Link href="/dashboard/events">
          <Button variant="outline">Back to Events</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Registry Tracker</h1>
          <p className="text-muted-foreground">
            Thank-you notes for {event.title}
          </p>
        </div>
        <Link href={`/dashboard/events/${event.id}`}>
          <Button variant="outline">Back to Event</Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Claims received" value={summary.totalClaims} />
        <StatCard label="Thank-yous sent" value={summary.thankYousSent} />
        <StatCard
          label="Thank-yous due"
          value={summary.thankYousDue}
          emphasize={summary.thankYousDue > 0}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {claims.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No claims yet. When a guest claims a gift, it will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Item / Guest</th>
                <th className="px-4 py-3 font-medium">Claimed</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Thank-you</th>
              </tr>
            </thead>
            <tbody>
              {itemGroups.map((group) => {
                const remaining = Math.max(
                  0,
                  group.itemQuantity - group.claimedQuantity
                );
                const fullyClaimed = remaining === 0;
                return (
                  <FragmentRows key={group.itemId}>
                    <tr className="border-t bg-muted/30">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{group.itemName}</div>
                        <div className="text-xs text-muted-foreground">
                          {[group.itemCategory, group.itemAmountLabel]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-2.5" colSpan={3}>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                            fullyClaimed
                              ? "bg-accent/15 text-accent"
                              : "bg-foreground/10 text-foreground"
                          )}
                        >
                          {group.claimedQuantity} of {group.itemQuantity} claimed
                          {!fullyClaimed && (
                            <span className="font-normal text-foreground/70">
                              · {remaining} remaining
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                    {group.claims.map((c) => {
                      const sent = !!c.thankYouSentAt;
                      const busy = pendingId === c.id;
                      return (
                        <tr key={c.id} className="border-t">
                          <td className="px-4 py-3 pl-8">
                            <div>{c.guestName || "Guest"}</div>
                            {c.guestEmail && (
                              <a
                                href={`mailto:${c.guestEmail}`}
                                className="text-xs text-muted-foreground hover:underline"
                              >
                                {c.guestEmail}
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {format(new Date(c.claimedAt), "MMM d, yyyy")}
                          </td>
                          <td className="px-4 py-3">{c.quantity}</td>
                          <td className="px-4 py-3">
                            <label
                              className={cn(
                                "inline-flex cursor-pointer items-center gap-2",
                                busy && "opacity-60"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={sent}
                                disabled={busy}
                                onChange={(e) =>
                                  toggleThankYou(c.id, e.target.checked)
                                }
                                className="rounded"
                              />
                              <span className="text-xs">
                                {sent && c.thankYouSentAt
                                  ? `Sent ${format(new Date(c.thankYouSentAt), "MMM d")}`
                                  : "Mark sent"}
                              </span>
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </FragmentRows>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Lightweight wrapper so we can group <tr> rows under one logical key without
// introducing an extra DOM node (table rendering breaks on <div> children).
function FragmentRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function StatCard({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        emphasize && "border-accent/50 bg-accent/5"
      )}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
