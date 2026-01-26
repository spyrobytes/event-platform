"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";

type AuthGuardProps = {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  requireVerified?: boolean;
};

/**
 * AuthGuard component that protects routes requiring authentication.
 * Redirects to login page if user is not authenticated.
 * Redirects to verify-email page if email is not verified (when requireVerified is true).
 */
export function AuthGuard({
  children,
  fallback,
  redirectTo = "/login",
  requireVerified = true,
}: AuthGuardProps) {
  const { loading, isAuthenticated, getIdToken } = useAuthContext();
  const router = useRouter();
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [checkingVerification, setCheckingVerification] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(redirectTo);
      return;
    }

    if (!loading && isAuthenticated && requireVerified) {
      // Check email verification status
      const checkVerification = async () => {
        try {
          const token = await getIdToken();
          if (!token) {
            setEmailVerified(false);
            setCheckingVerification(false);
            return;
          }

          const response = await fetch("/api/auth/verification-status", {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            const { data } = await response.json();
            setEmailVerified(data.emailVerified);
          } else {
            setEmailVerified(false);
          }
        } catch {
          setEmailVerified(false);
        } finally {
          setCheckingVerification(false);
        }
      };

      checkVerification();
    } else if (!requireVerified) {
      setCheckingVerification(false);
    }
  }, [loading, isAuthenticated, requireVerified, router, redirectTo, getIdToken]);

  // Redirect unverified users
  useEffect(() => {
    if (
      !loading &&
      isAuthenticated &&
      requireVerified &&
      !checkingVerification &&
      emailVerified === false
    ) {
      router.replace("/verify-email");
    }
  }, [loading, isAuthenticated, requireVerified, checkingVerification, emailVerified, router]);

  // Show loading state
  if (loading || (requireVerified && checkingVerification)) {
    return (
      fallback ?? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Not authenticated, will redirect
  if (!isAuthenticated) {
    return (
      fallback ?? (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      )
    );
  }

  // Authenticated but email not verified
  if (requireVerified && emailVerified === false) {
    return (
      fallback ?? (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Redirecting to verification...
          </p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
