"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseApiResponse } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type MessageStatus = "PENDING" | "APPROVED" | "HIDDEN";
type FilterKey = MessageStatus | "ALL" | "MANUAL";

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

// Organizer-entered wish collected outside the invite/RSVP pipeline
// (Google Doc, paper cards, ...). Distinct entity from RSVP-backed
// WishMessage: no moderation status, actions are edit/delete.
type ManualWish = {
  id: string;
  authorName: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};

type ManualListData = {
  total: number;
  wishes: ManualWish[];
  nextCursor: string | null;
};

const FILTER_TABS: { key: FilterKey; label: string; countKey?: keyof Counts }[] = [
  { key: "PENDING", label: "Pending", countKey: "pending" },
  { key: "APPROVED", label: "Approved", countKey: "approved" },
  { key: "HIDDEN", label: "Hidden", countKey: "hidden" },
  { key: "ALL", label: "All" },
  { key: "MANUAL", label: "Added by you" },
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
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("PENDING");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Manually added wishes live in their own list — different entity,
  // different endpoint, different actions (edit/delete vs moderate).
  const [manualWishes, setManualWishes] = useState<ManualWish[]>([]);
  const [manualTotal, setManualTotal] = useState(0);
  const [manualNextCursor, setManualNextCursor] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingWish, setSavingWish] = useState(false);

  // Event metadata is fetched once on mount; the wishes list is fetched on
  // filter change and on "Load more". Splitting the two avoids a redundant
  // event refetch every time the moderator clicks a tab.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) {
          if (!cancelled) setError("Not authenticated");
          return;
        }
        const res = await fetch(`/api/events/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Event not found");
        const data = await res.json();
        if (!cancelled) {
          setEvent({ id: data.data.id, title: data.data.title });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load event");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, getIdToken]);

  // `cursor` of null fetches a fresh first page (resets the list); a non-null
  // cursor appends. Counts are always replaced — they're authoritative from
  // the server's groupBy.
  const loadMessages = useCallback(
    async (currentFilter: FilterKey, cursor: string | null) => {
      setError(null);
      if (cursor) setLoadingMore(true);
      try {
        const token = await getIdToken();
        if (!token) {
          setError("Not authenticated");
          return;
        }
        const url = new URL(
          `/api/events/${params.id}/wishes`,
          window.location.origin
        );
        url.searchParams.set("status", currentFilter);
        if (cursor) url.searchParams.set("cursor", cursor);
        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load messages");
        const { data } = await res.json();
        const newMessages = data.messages as WishMessage[];
        setCounts(data.counts as Counts);
        setNextCursor(data.nextCursor as string | null);
        setMessages((prev) => (cursor ? [...prev, ...newMessages] : newMessages));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [params.id, getIdToken]
  );

  // `cursor` semantics mirror loadMessages: null resets, non-null appends.
  // `total` is authoritative from the server on every call so the tab badge
  // stays correct after adds/deletes.
  const loadManualWishes = useCallback(
    async (cursor: string | null) => {
      setError(null);
      if (cursor) setLoadingMore(true);
      try {
        const token = await getIdToken();
        if (!token) {
          setError("Not authenticated");
          return;
        }
        const url = new URL(
          `/api/events/${params.id}/wishes/manual`,
          window.location.origin
        );
        if (cursor) url.searchParams.set("cursor", cursor);
        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data } = await parseApiResponse<{ data: ManualListData }>(res);
        setManualTotal(data.total);
        setManualNextCursor(data.nextCursor);
        setManualWishes((prev) =>
          cursor ? [...prev, ...data.wishes] : data.wishes
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [params.id, getIdToken]
  );

  // Reset and refetch whenever the active filter changes.
  useEffect(() => {
    if (filter === "MANUAL") {
      loadManualWishes(null);
    } else {
      loadMessages(filter, null);
    }
  }, [loadMessages, loadManualWishes, filter]);

  // One-time fetch so the "Added by you" tab badge is populated without
  // visiting the tab (the moderation GET doesn't know about manual wishes).
  useEffect(() => {
    loadManualWishes(null);
  }, [loadManualWishes]);

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
        loadMessages(filter, null);
      } finally {
        setPendingId(null);
      }
    },
    [params.id, getIdToken, loadMessages, filter, messages, counts]
  );

  const authedJsonRequest = useCallback(
    async (path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(path, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body !== undefined && { "Content-Type": "application/json" }),
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      });
      return parseApiResponse<{ data: unknown }>(res);
    },
    [getIdToken]
  );

  const createWish = useCallback(
    async (authorName: string, message: string) => {
      setSavingWish(true);
      setError(null);
      try {
        await authedJsonRequest(
          `/api/events/${params.id}/wishes/manual`,
          "POST",
          { authorName, message }
        );
        setShowAddForm(false);
        // Server reload instead of optimistic prepend: keeps ordering and
        // `total` authoritative, and the list is small.
        await loadManualWishes(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add wish");
      } finally {
        setSavingWish(false);
      }
    },
    [params.id, authedJsonRequest, loadManualWishes]
  );

  const saveManualWish = useCallback(
    async (wishId: string, authorName: string, message: string) => {
      setPendingId(wishId);
      setError(null);
      try {
        await authedJsonRequest(
          `/api/events/${params.id}/wishes/manual/${wishId}`,
          "PATCH",
          { authorName, message }
        );
        setManualWishes((prev) =>
          prev.map((w) =>
            w.id === wishId
              ? { ...w, authorName, message, updatedAt: new Date().toISOString() }
              : w
          )
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save wish");
        return false;
      } finally {
        setPendingId(null);
      }
    },
    [params.id, authedJsonRequest]
  );

  const deleteManualWish = useCallback(
    async (wishId: string) => {
      const confirmed = window.confirm(
        "Delete this wish? It will be removed from the event page."
      );
      if (!confirmed) return;
      setPendingId(wishId);
      setError(null);
      try {
        await authedJsonRequest(
          `/api/events/${params.id}/wishes/manual/${wishId}`,
          "DELETE"
        );
        setManualWishes((prev) => prev.filter((w) => w.id !== wishId));
        setManualTotal((t) => Math.max(0, t - 1));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete wish");
      } finally {
        setPendingId(null);
      }
    },
    [params.id, authedJsonRequest]
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
        <div className="flex flex-shrink-0 gap-2">
          <Button onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? "Close" : "Add wish"}
          </Button>
          <Link href={`/dashboard/events/${event.id}`}>
            <Button variant="outline">Back to Event</Button>
          </Link>
        </div>
      </div>

      {showAddForm && (
        <AddWishForm
          busy={savingWish}
          onSubmit={createWish}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="flex flex-wrap gap-1 rounded-lg border bg-surface-2 p-1">
        {FILTER_TABS.map((tab) => {
          const active = filter === tab.key;
          const count =
            tab.key === "MANUAL"
              ? manualTotal
              : tab.countKey
                ? counts[tab.countKey]
                : undefined;
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

      {filter === "MANUAL" ? (
        manualWishes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">{emptyCopy(filter)}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {manualWishes.map((w) => (
              <ManualWishCard
                key={w.id}
                wish={w}
                busy={pendingId === w.id}
                onSave={(authorName, message) =>
                  saveManualWish(w.id, authorName, message)
                }
                onDelete={() => deleteManualWish(w.id)}
              />
            ))}
            {manualNextCursor && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => loadManualWishes(manualNextCursor)}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </div>
        )
      ) : messages.length === 0 ? (
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
          {nextCursor && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => loadMessages(filter, nextCursor)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
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

/**
 * Inline panel for entering a wish collected outside the RSVP form.
 * Selected-panel styling follows the ThemePicker border-accent/bg-accent
 * pattern used across dashboard toggles.
 */
function AddWishForm({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  onSubmit: (authorName: string, message: string) => void;
  onCancel: () => void;
}) {
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const canSubmit = authorName.trim().length > 0 && message.trim().length > 0;

  return (
    <form
      className="space-y-4 rounded-lg border-2 border-accent bg-accent/5 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit && !busy) onSubmit(authorName.trim(), message.trim());
      }}
    >
      <div className="space-y-1">
        <p className="font-medium">Add a wish</p>
        <p className="text-sm text-muted-foreground">
          For wishes collected outside the RSVP form (a shared doc, paper
          cards, ...). It appears on the event page right away — no approval
          step.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="manual-wish-author">Guest name</Label>
        <Input
          id="manual-wish-author"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Aunt May"
          maxLength={200}
          disabled={busy}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="manual-wish-message">Wish</Label>
        <Textarea
          id="manual-wish-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Wishing you both a lifetime of love and laughter."
          rows={3}
          maxLength={1000}
          disabled={busy}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={!canSubmit || busy}>
          {busy ? "Adding..." : "Add wish"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ManualWishCard({
  wish,
  busy,
  onSave,
  onDelete,
}: {
  wish: ManualWish;
  busy: boolean;
  onSave: (authorName: string, message: string) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [authorName, setAuthorName] = useState(wish.authorName);
  const [message, setMessage] = useState(wish.message);
  const canSave = authorName.trim().length > 0 && message.trim().length > 0;

  const startEdit = () => {
    // Re-seed from the wish on every open so a cancelled edit doesn't
    // leak stale drafts into the next one.
    setAuthorName(wish.authorName);
    setMessage(wish.message);
    setEditing(true);
  };

  const save = async () => {
    if (!canSave || busy) return;
    const ok = await onSave(authorName.trim(), message.trim());
    if (ok) setEditing(false);
  };

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
            <span className="font-medium">{wish.authorName}</span>
            <span className="inline-flex rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground">
              Added by you
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Added {format(new Date(wish.createdAt), "MMM d, yyyy 'at' h:mm a")}
            {wish.createdAt !== wish.updatedAt && (
              <>
                {" · edited "}
                {format(new Date(wish.updatedAt), "MMM d, yyyy")}
              </>
            )}
          </p>
        </div>
        {!editing && (
          <div className="flex flex-shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={startEdit} disabled={busy}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete} disabled={busy}>
              Delete
            </Button>
          </div>
        )}
      </div>
      {editing ? (
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`edit-author-${wish.id}`}>Guest name</Label>
            <Input
              id={`edit-author-${wish.id}`}
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              maxLength={200}
              disabled={busy}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-message-${wish.id}`}>Wish</Label>
            <Textarea
              id={`edit-message-${wish.id}`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={1000}
              disabled={busy}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={!canSave || busy}>
              {busy ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
          {wish.message}
        </p>
      )}
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
    case "MANUAL":
      return "No manually added wishes yet. Use “Add wish” to enter wishes collected outside the RSVP form.";
    default:
      return "No messages yet. Guests can leave wishes when they RSVP.";
  }
}
