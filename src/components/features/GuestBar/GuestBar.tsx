"use client";

import { cn } from "@/lib/utils";

type GuestBarProps = {
  guestName: string;
  className?: string;
};

/**
 * A subtle welcome bar shown at the top of the event page for authenticated guests.
 * Indicates that the viewer has guest-level access and can see private sections.
 */
export function GuestBar({ guestName, className }: GuestBarProps) {
  return (
    <div
      className={cn(
        "w-full bg-primary/5 border-b border-primary/10 px-4 py-2 text-center text-sm text-primary/80",
        className
      )}
    >
      Welcome, <span className="font-medium">{guestName}</span> — you have
      access to exclusive event details
    </div>
  );
}
