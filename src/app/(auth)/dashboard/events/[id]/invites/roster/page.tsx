"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import styles from "./roster.module.css";

type RosterRow = {
  id: string;
  name: string | null;
  seatAssignment: string | null;
  plannerNotes: string | null;
  rsvp: {
    guestName: string;
    guestCount: number;
    additionalGuestNames: string[];
  } | null;
};

type RosterData = {
  event: { title: string; startAt: string } | null;
  invites: RosterRow[];
};

function formatGuestCell(row: RosterRow): { primary: string; additional: string | null } {
  const primary = row.rsvp?.guestName || row.name || "Guest";
  const extras = row.rsvp?.additionalGuestNames ?? [];
  const partySize = row.rsvp?.guestCount ?? 1;
  if (partySize > 1) {
    const extrasText = extras.filter(Boolean).join(", ");
    const addlCount = partySize - 1;
    const label = extrasText
      ? `+${addlCount} (${extrasText})`
      : `+${addlCount}`;
    return { primary, additional: label };
  }
  return { primary, additional: null };
}

export default function RosterPage() {
  const params = useParams<{ id: string }>();
  const { getIdToken } = useAuthContext();
  const [data, setData] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = await getIdToken();
        if (!token) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }
        const response = await fetch(
          `/api/events/${params.id}/invites/roster`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) {
          if (response.status === 404) throw new Error("Event not found");
          throw new Error("Failed to load roster");
        }
        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load roster");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, getIdToken]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10">
          <p className="text-sm text-destructive">{error || "Roster unavailable"}</p>
        </div>
        <Link href={`/dashboard/events/${params.id}/invites`}>
          <Button variant="outline">Back to Invites</Button>
        </Link>
      </div>
    );
  }

  const eventTitle = data.event?.title ?? "Event";
  const eventStart = data.event
    ? new Date(data.event.startAt).toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  const invites = data.invites;

  return (
    <div className={styles.printRoot}>
      <div className={`${styles.printChromeHide} flex flex-wrap items-center justify-between gap-3`}>
        <Link href={`/dashboard/events/${params.id}/invites`}>
          <Button variant="outline" size="sm">Back to Invites</Button>
        </Link>
        <Button size="sm" onClick={() => window.print()}>
          Print roster
        </Button>
      </div>

      <header className="mt-6 mb-4">
        <h1 className="text-2xl font-bold">Attendee roster</h1>
        <p className="text-sm text-muted-foreground">
          {eventTitle}
          {eventStart ? ` · ${eventStart}` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Showing {invites.length} {invites.length === 1 ? "guest" : "guests"} with a confirmed
          &ldquo;Going&rdquo; RSVP.
        </p>
      </header>

      {invites.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No guests have confirmed yet. The roster will populate as RSVPs come in.
        </div>
      ) : (
        <table className={styles.rosterTable}>
          <thead>
            <tr>
              <th scope="col">Guest</th>
              <th scope="col">Seat</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((row) => {
              const { primary, additional } = formatGuestCell(row);
              return (
                <tr key={row.id}>
                  <td>
                    <span>{primary}</span>
                    {additional && (
                      <span className={styles.additionalNames}>{additional}</span>
                    )}
                  </td>
                  <td>{row.seatAssignment ?? ""}</td>
                  <td>{row.plannerNotes ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
