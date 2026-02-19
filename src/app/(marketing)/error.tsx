"use client";

import Link from "next/link";

export default function MarketingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/events"
            className="inline-flex items-center justify-center rounded-md border border-input px-6 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Browse Events
          </Link>
        </div>
      </div>
    </div>
  );
}
