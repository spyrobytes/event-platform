"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScheduleEditorPanel } from "@/components/features/Schedule";

/**
 * Canonical schedule editor page — the one place an event day's typed
 * timing is edited (canonical-schedule plan §5, PR 4). The invitation
 * panel and page editor link here.
 */
export default function EventSchedulePage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Event Schedule</h1>
        <Link href={`/dashboard/events/${params.id}`}>
          <Button variant="outline">Back to Event</Button>
        </Link>
      </div>
      <ScheduleEditorPanel eventId={params.id} />
    </div>
  );
}
