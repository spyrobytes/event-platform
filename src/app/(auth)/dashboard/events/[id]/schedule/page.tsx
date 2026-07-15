"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ScheduleEditorPanel } from "@/components/features/Schedule";
import { useUnsavedChangesGuard } from "@/hooks";

/**
 * Canonical schedule editor page — the one place an event day's typed
 * timing is edited (canonical-schedule plan §5, PR 4). The invitation
 * panel and page editor link here.
 */
export default function EventSchedulePage() {
  const params = useParams<{ id: string }>();

  // The panel owns the dirty state and reports transitions; the page owns
  // the navigation chrome, so the guard (Back button + beforeunload) lives
  // here — same pattern as the invitation and page editors.
  const [isDirty, setIsDirty] = useState(false);
  const { requestLeave, discardDialogProps } = useUnsavedChangesGuard({
    isDirty,
    redirectTo: `/dashboard/events/${params.id}`,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Event Schedule</h1>
        <Button variant="outline" onClick={requestLeave}>
          Back to Event
        </Button>
      </div>
      <ScheduleEditorPanel eventId={params.id} onDirtyChange={setIsDirty} />
      <ConfirmDialog {...discardDialogProps} />
    </div>
  );
}
