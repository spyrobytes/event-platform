import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "About EventFXr — create, discover, and manage events with invitations, RSVPs, and a beautiful public page for every event.",
  // Thin placeholder — keep out of search until real content lands.
  robots: { index: false, follow: true },
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        About EventFXr
      </h1>
      <p className="mt-4 text-muted-foreground">
        EventFXr helps you create, discover, and manage events — with
        invitations, RSVPs, and a beautiful public page for every event.
      </p>
      <p className="mt-4 text-muted-foreground">
        A fuller story about who we are is on the way.
      </p>
      <Link
        href="/events"
        className="mt-8 inline-block text-sm text-foreground underline"
      >
        Browse events →
      </Link>
    </div>
  );
}
