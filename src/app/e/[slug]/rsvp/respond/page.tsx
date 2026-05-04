"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  SESSION_PREVIEW_KEY,
  readInvitePreview,
  type InvitePreview,
} from "@/lib/public-rsvp-portal";
import { RespondForm } from "./respond-form";

// We read InvitePreview from sessionStorage. Using useSyncExternalStore keeps
// the read aligned with React's hydration model and avoids the synchronous
// setState-in-effect pattern that the linter flags.
const subscribe = () => () => {};
// useSyncExternalStore requires a stable reference across reads — returning
// a freshly parsed object every call triggers "result of getSnapshot should
// be cached" and an infinite render loop. Cache against the raw string.
let cachedRaw: string | null = null;
let cachedPreview: InvitePreview | null = null;
const getSnapshot = (): InvitePreview | null => {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_PREVIEW_KEY);
  if (raw === cachedRaw) return cachedPreview;
  cachedRaw = raw;
  cachedPreview = readInvitePreview();
  return cachedPreview;
};
// Server snapshot returns null — the page renders a loading shell on the
// server, then hydrates with the real value on the client.
const getServerSnapshot = (): InvitePreview | null => null;

// Separate hook to track hydration state. Returns false on the server +
// during the initial client render that hydrates against the server's HTML,
// then true on subsequent renders. Using `typeof window` for this would
// disagree between server and client during hydration and trigger a
// hydration-mismatch warning; useSyncExternalStore handles the transition
// cleanly because React knows to re-read after hydration.
const subscribeHydrated = () => () => {};
const getHydratedSnapshot = () => true;
const getHydratedServerSnapshot = () => false;

/**
 * Client page because we need to read sessionStorage (set by code-form after
 * a successful verify-code). If the preview is missing — direct navigation,
 * tab refresh, or a different tab — redirect back to the code-entry page.
 */
export default function RespondPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const preview = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isHydrated = useSyncExternalStore(
    subscribeHydrated,
    getHydratedSnapshot,
    getHydratedServerSnapshot
  );

  useEffect(() => {
    // Only act after hydration. During the initial render the snapshot still
    // reflects the server (preview === null) — redirecting then would kick
    // valid users back even when sessionStorage has the right data.
    if (isHydrated && preview === null) {
      router.replace(`/e/${params.slug}/rsvp`);
    }
  }, [isHydrated, preview, params.slug, router]);

  if (!isHydrated || preview === null) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-6 py-20 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-6 py-12 sm:py-16">
        <header className="mb-8 text-center">
          <Link
            href={`/e/${params.slug}/rsvp`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Use a different code
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            {preview.name ? `Welcome, ${preview.name}` : "RSVP"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Please confirm your details below.
          </p>
        </header>

        <RespondForm eventSlug={params.slug} invitePreview={preview} />
      </div>
    </main>
  );
}
