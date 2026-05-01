"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MessageStatus = "PENDING" | "APPROVED" | "HIDDEN";
type FilterKey = MessageStatus | "ALL";

type WishMessage = {
  id: string;
  guestName: string;
  messageToHost: string;
  messageStatus: MessageStatus;
  messageApprovedAt: string | null;
  respondedAt: string;
  updatedAt: string;
};

type Counts = { pending: number; approved: number; hidden: number };

type EventBasic = { id: string; title: string };

const FILTER_TABS: { key: FilterKey; label: string; countKey?: keyof Counts }[] = [
  { key: "PENDING", label: "Pending", countKey: "pending" },
  { key: "APPROVED", label: "Approved", countKey: "approved" },
  { key: "HIDDEN", label: "Hidden", countKey: "hidden" },
  { key: "ALL", label: "All" },
];

const STATUS_BADGE: Record<MessageStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-foreground/10 text-foreground",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-success/15 text-success",
  },
  HIDDEN: {
    label: "Hidden",
    className: "bg-destructive/15 text-destructive",
  },
};

export default function WishesModerationPage() {
  const params = useParams<{ id: string }>();
  const { getIdToken } = useAuthContext();

  const [event, setEvent] = useState<EventBasic | null>(null);
  const [messages, setMessages] = useState<WishMessage[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, hidden: 0 });
  const [filter, setFilter] = useState<FilterKey>("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(
    async (currentFilter: FilterKey) => {
      setError(null);
      try {
        const token = await getIdToken();
        if (!token) {
          setError("Not authenticated");
          return;
        }
        const [eventRes, wishesRes] = await Promise.all([
          fetch(`/api/events/${params.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/events/${params.id}/wishes?status=${currentFilter}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (!eventRes.ok) throw new Error("Event not found");
        if (!wishesRes.ok) throw new Error("Failed to load messages");
        const eventData = await eventRes.json();
        const wishesData = await wishesRes.json();
        setEvent({ id: eventData.data.id, title: eventData.data.title });
        setMessages(wishesData.data.messages as WishMessage[]);
        setCounts(wishesData.data.counts as Counts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [params.id, getIdToken]
  );

  useEffect(() => {
    load(filter);
  }, [load, filter]);

  const updateStatus = useCallback(
    async (rsvpId: string, next: MessageStatus) => {
      setPendingId(rsvpId);
      setError(null);
      // Optimistic: drop the row from the current list when its new status
      // doesn't match the active filter (so an approved row vanishes from
      // the Pending tab). Counts are bumped optimistically too — server
      // reload corrects on error.
      const prevMessages = messages;
      const prevCounts = counts;
      const target = messages.find((m) => m.id === rsvpId);
      if (target) {
        const fromKey = statusToCountKey(target.messageStatus);
        const toKey = statusToCountKey(next);
        setCounts((c) => ({
          ...c,
          [fromKey]: Math.max(0, c[fromKey] - 1),
          [toKey]: c[toKey] + 1,
        }));
        setMessages((prev) =>
          filter === "ALL" || filter === next
            ? prev.map((m) =>
                m.id === rsvpId
                  ? {
                      ...m,
                      messageStatus: next,
                      messageApprovedAt:
                        next === "APPROVED" ? new Date().toISOString() : null,
                    }
                  : m
              )
            : prev.filter((m) => m.id !== rsvpId)
        );
      }
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Not authenticated");
        const res = await fetch(
          `/api/events/${params.id}/wishes/${rsvpId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: next }),
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to update");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update");
        // Revert optimistic state and reload from server
        setMessages(prevMessages);
        setCounts(prevCounts);
        load(filter);
      } finally {
        setPendingId(null);
      }
    },
    [params.id, getIdToken, load, filter, messages, counts]
  );

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
          <h1 className="text-3xl font-bold tracking-tight">Wedding Wishes</h1>
          <p className="text-muted-foreground">
            Moderate guest messages for {event.title}
          </p>
        </div>
        <Link href={`/dashboard/events/${event.id}`}>
          <Button variant="outline">Back to Event</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border bg-surface-2 p-1">
        {FILTER_TABS.map((tab) => {
          const active = filter === tab.key;
          const count = tab.countKey ? counts[tab.countKey] : undefined;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {typeof count === "number" && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold",
                    active
                      ? "bg-foreground/10 text-foreground"
                      : "bg-foreground/5 text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">{emptyCopy(filter)}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <MessageCard
              key={m.id}
              message={m}
              busy={pendingId === m.id}
              onUpdate={(next) => updateStatus(m.id, next)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageCard({
  message,
  busy,
  onUpdate,
}: {
  message: WishMessage;
  busy: boolean;
  onUpdate: (next: MessageStatus) => void;
}) {
  const badge = STATUS_BADGE[message.messageStatus];
  return (
    <div
      className={cn(
        "rounded-lg border bg-surface-1 p-4 transition-opacity",
        busy && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{message.guestName}</span>
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                badge.className
              )}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Submitted {format(new Date(message.respondedAt), "MMM d, yyyy 'at' h:mm a")}
            {message.respondedAt !== message.updatedAt && (
              <>
                {" · edited "}
                {format(new Date(message.updatedAt), "MMM d, yyyy")}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          {message.messageStatus !== "APPROVED" && (
            <Button
              size="sm"
              onClick={() => onUpdate("APPROVED")}
              disabled={busy}
            >
              Approve
            </Button>
          )}
          {message.messageStatus !== "HIDDEN" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdate("HIDDEN")}
              disabled={busy}
            >
              Hide
            </Button>
          )}
          {message.messageStatus !== "PENDING" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate("PENDING")}
              disabled={busy}
            >
              Reset
            </Button>
          )}
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
        {message.messageToHost}
      </p>
    </div>
  );
}

function statusToCountKey(status: MessageStatus): keyof Counts {
  if (status === "PENDING") return "pending";
  if (status === "APPROVED") return "approved";
  return "hidden";
}

function emptyCopy(filter: FilterKey): string {
  switch (filter) {
    case "PENDING":
      return "No pending messages. New guest wishes will appear here for moderation.";
    case "APPROVED":
      return "No approved messages yet. Approve pending wishes to publish them on the event page.";
    case "HIDDEN":
      return "No hidden messages.";
    default:
      return "No messages yet. Guests can leave wishes when they RSVP.";
  }
}
