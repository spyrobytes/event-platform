"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function UnsubscribeByIdInner() {
  const params = useSearchParams();
  const inviteId = params.get("inviteId");
  const eventId = params.get("eventId");
  const sig = params.get("sig");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function unsubscribe() {
      if (!inviteId || !eventId || !sig) {
        setStatus("error");
        setMessage("This unsubscribe link is missing required information.");
        return;
      }
      try {
        const response = await fetch("/api/invites/unsubscribe-by-id", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteId, eventId, sig }),
        });
        const data = await response.json();
        if (response.ok) {
          setStatus("success");
          setMessage(data.data?.message || "You have been unsubscribed.");
        } else {
          setStatus("error");
          setMessage(data.error || "This unsubscribe link is invalid.");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again later.");
      }
    }
    unsubscribe();
  }, [inviteId, eventId, sig]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        {status === "loading" && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Processing your request...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="mb-2 text-xl font-semibold">Unsubscribed</h1>
            <p className="text-muted-foreground">{message}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              You will no longer receive emails about this event.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="mb-2 text-xl font-semibold">Something Went Wrong</h1>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribeByIdPage() {
  // useSearchParams must be wrapped in Suspense for streaming SSR.
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background" />
      }
    >
      <UnsubscribeByIdInner />
    </Suspense>
  );
}
