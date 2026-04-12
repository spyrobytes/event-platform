"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ViewState = "choose" | "invite" | "waitlist";

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuthContext();

  const codeFromUrl = searchParams.get("code") || "";
  const [view, setView] = useState<ViewState>(codeFromUrl ? "invite" : "choose");
  const [inviteCode, setInviteCode] = useState(codeFromUrl);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Authenticated users with a code should go claim it
  useEffect(() => {
    if (!authLoading && isAuthenticated && codeFromUrl) {
      router.replace(`/signup?invite=${encodeURIComponent(codeFromUrl)}`);
    }
  }, [authLoading, isAuthenticated, codeFromUrl, router]);

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/launch-invites/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid invite code");
        setIsLoading(false);
        return;
      }

      // Code is valid — redirect to signup with the code
      router.push(`/signup?invite=${encodeURIComponent(data.data.code)}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail, source: "join_page" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not join waitlist");
        setIsLoading(false);
        return;
      }

      setSuccess("You're on the list! We'll notify you when we open to everyone.");
      setWaitlistEmail("");
      setIsLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {view === "waitlist" ? "Join the Waitlist" : "Welcome to Events Fixer"}
          </CardTitle>
          <CardDescription>
            {view === "waitlist"
              ? "We'll let you know as soon as we open to everyone."
              : "We're currently in an invite-only preview. Enter your invite code to get started."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3">
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
            </div>
          )}

          {/* Invite code form */}
          {(view === "choose" || view === "invite") && (
            <form onSubmit={handleValidateCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-code">Invite Code</Label>
                <Input
                  id="invite-code"
                  type="text"
                  placeholder="EVF-XXXX-XXXX"
                  value={inviteCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setInviteCode(e.target.value);
                    setError(null);
                  }}
                  className="text-center font-mono text-lg tracking-widest"
                  required
                  autoFocus={view === "invite"}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !inviteCode.trim()}>
                {isLoading ? "Checking..." : "Continue with Invite"}
              </Button>
            </form>
          )}

          {/* Waitlist form */}
          {view === "waitlist" && (
            <form onSubmit={handleWaitlist} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="waitlist-email">Email Address</Label>
                <Input
                  id="waitlist-email"
                  type="email"
                  placeholder="you@example.com"
                  value={waitlistEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setWaitlistEmail(e.target.value);
                    setError(null);
                  }}
                  required
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !waitlistEmail.trim()}>
                {isLoading ? "Joining..." : "Join Waitlist"}
              </Button>
            </form>
          )}

          {/* Toggle between views */}
          <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
            {view !== "waitlist" ? (
              <p>
                Don&apos;t have an invite?{" "}
                <button
                  type="button"
                  onClick={() => { setView("waitlist"); setError(null); setSuccess(null); }}
                  className="text-foreground underline underline-offset-4 hover:text-foreground/80"
                >
                  Join the waitlist
                </button>
              </p>
            ) : (
              <p>
                Have an invite code?{" "}
                <button
                  type="button"
                  onClick={() => { setView("invite"); setError(null); setSuccess(null); }}
                  className="text-foreground underline underline-offset-4 hover:text-foreground/80"
                >
                  Enter it here
                </button>
              </p>
            )}

            <p>
              Already have an account?{" "}
              <Link href="/login" className="text-foreground underline underline-offset-4 hover:text-foreground/80">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
