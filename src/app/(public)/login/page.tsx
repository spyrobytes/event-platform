"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Map raw Firebase error codes to user-friendly messages
function friendlyAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("auth/user-not-found") || message.includes("auth/invalid-credential")) {
    return "No account found with that email. Do you have an invite code?";
  }
  if (message.includes("auth/wrong-password")) {
    return "Incorrect password. Please try again.";
  }
  if (message.includes("auth/too-many-requests")) {
    return "Too many failed attempts. Please try again later.";
  }
  if (message.includes("auth/invalid-email")) {
    return "Please enter a valid email address.";
  }
  return message || "Failed to sign in";
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isAuthenticated, loading: authLoading } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Track whether we're in the middle of a submit — prevents the
  // auto-redirect effect from racing with the invite check.
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !submitting) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, submitting, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setSubmitting(true);

    try {
      const firebaseUser = await signIn(email, password);
      const token = await firebaseUser.getIdToken();

      // Check invite status before allowing access
      const inviteRes = await fetch("/api/launch-invites/invite-status", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (inviteRes.status === 429) {
        const { getFirebaseAuth } = await import("@/lib/firebase");
        const { signOut: firebaseSignOut } = await import("firebase/auth");
        await firebaseSignOut(getFirebaseAuth());
        setError("Too many login attempts. Please try again later.");
        setIsLoading(false);
        setSubmitting(false);
        return;
      }

      if (inviteRes.ok) {
        const { data } = await inviteRes.json();
        if (!data.hasInvite) {
          // Sign out the uninvited user — don't leave a live session
          const { getFirebaseAuth } = await import("@/lib/firebase");
          const { signOut: firebaseSignOut } = await import("firebase/auth");
          await firebaseSignOut(getFirebaseAuth());
          setError(
            "Your account doesn't have an active invite. Please enter an invite code to get started."
          );
          setIsLoading(false);
          setSubmitting(false);
          return;
        }
      }

      router.push("/dashboard");
    } catch (err) {
      setError(friendlyAuthError(err));
      setIsLoading(false);
      setSubmitting(false);
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
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to manage your events</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-accent hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Have an invite code?{" "}
              <Link href="/join" className="text-accent hover:underline">
                Get started
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
