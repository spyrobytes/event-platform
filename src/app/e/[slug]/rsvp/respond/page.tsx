"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { readInvitePreview, type InvitePreview } from "@/lib/public-rsvp-portal";
import { RespondForm } from "./respond-form";

// We read InvitePreview from sessionStorage. Using useSyncExternalStore keeps
// the read aligned with React's hydration model and avoids the synchronous
// setState-in-effect pattern that the linter flags.
const subscribe = () => () => {};
const getSnapshot = (): InvitePreview | null => readInvitePreview();
// Server snapshot returns null — the page renders a loading shell on the
// server, then hydrates with the real value on the client.
const getServerSnapshot = (): InvitePreview | null => null;

/**
 * Client page because we need to read sessionStorage (set by code-form after
 * a successful verify-code). If the preview is missing — direct navigation,
 * tab refresh, or a different tab — redirect back to the code-entry page.
 */
export default function RespondPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const preview = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Distinguish "not yet hydrated" (preview is null AND we're SSR) from "no
  // preview after hydration." On the client after hydration, getSnapshot
  // returns the actual sessionStorage state — null then triggers redirect.
  const isHydrated = typeof window !== "undefined";

  useEffect(() => {
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
