"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function VerifyEmailPendingPage() {
  const { user, loading, getIdToken, signOut } = useAuthContext();
  const router = useRouter();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check if email is already verified on mount
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const checkVerificationStatus = async () => {
      try {
        const token = await getIdToken();
        if (!token) {
          setCheckingStatus(false);
          return;
        }

        const response = await fetch("/api/auth/verification-status", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const { data } = await response.json();
          if (data.emailVerified) {
            router.replace("/dashboard");
            return;
          }
        }
      } catch {
        // Ignore errors, just show the verification page
      } finally {
        setCheckingStatus(false);
      }
    };

    checkVerificationStatus();
  }, [user, loading, getIdToken, router]);

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    setResendMessage(null);

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to resend");
      }

      if (result.data?.alreadyVerified) {
        router.replace("/dashboard");
        return;
      }

      setResendMessage("Verification email sent! Check your inbox.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to resend verification email"
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  if (loading || checkingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <svg
              className="h-8 w-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We sent a verification link to{" "}
            <strong className="text-foreground">{user?.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the link in your email to verify your account and access all
            features.
          </p>

          {resendMessage && (
            <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3">
              <p className="text-sm text-green-500">{resendMessage}</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            onClick={handleResend}
            disabled={isResending}
            variant="outline"
            className="w-full"
          >
            {isResending ? "Sending..." : "Resend Verification Email"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Wrong email?{" "}
            <button
              onClick={handleSignOut}
              className="text-accent hover:underline"
            >
              Sign out
            </button>{" "}
            and create a new account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
