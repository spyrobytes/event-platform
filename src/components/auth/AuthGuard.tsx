"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";

type AuthGuardProps = {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  requireVerified?: boolean;
  /** Check that the user has a claimed launch invite (invitational phase) */
  requireInvite?: boolean;
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
  requireInvite = true,
}: AuthGuardProps) {
  const { loading, isAuthenticated, getIdToken } = useAuthContext();
  const router = useRouter();
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [checkingVerification, setCheckingVerification] = useState(true);
  const [hasInvite, setHasInvite] = useState<boolean | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(redirectTo);
      return;
    }

    if (!loading && isAuthenticated && requireVerified) {
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

  // Check invite status after email verification passes
  useEffect(() => {
    if (
      !loading &&
      isAuthenticated &&
      requireInvite &&
      (!requireVerified || emailVerified === true)
    ) {
      const checkInviteStatus = async () => {
        try {
          const token = await getIdToken();
          if (!token) {
            setHasInvite(false);
            setCheckingInvite(false);
            return;
          }

          const response = await fetch("/api/launch-invites/invite-status", {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            const { data } = await response.json();
            setHasInvite(data.hasInvite);
          } else {
            setHasInvite(false);
          }
        } catch {
          setHasInvite(false);
        } finally {
          setCheckingInvite(false);
        }
      };

      checkInviteStatus();
    } else if (!requireInvite) {
      setCheckingInvite(false);
    }
  }, [loading, isAuthenticated, requireInvite, requireVerified, emailVerified, getIdToken]);

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

  // Redirect users without invite
  useEffect(() => {
    if (
      !loading &&
      isAuthenticated &&
      requireInvite &&
      !checkingInvite &&
      hasInvite === false
    ) {
      router.replace("/join");
    }
  }, [loading, isAuthenticated, requireInvite, checkingInvite, hasInvite, router]);

  const defaultFallback = (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );

  // Show loading state
  if (
    loading ||
    (requireVerified && checkingVerification) ||
    (requireInvite && !checkingVerification && emailVerified !== false && checkingInvite)
  ) {
    return fallback ?? defaultFallback;
  }

  // Not authenticated, will redirect
  if (!isAuthenticated) {
    return fallback ?? defaultFallback;
  }

  // Authenticated but email not verified
  if (requireVerified && emailVerified === false) {
    return fallback ?? defaultFallback;
  }

  // Authenticated + verified but no invite
  if (requireInvite && hasInvite === false) {
    return fallback ?? defaultFallback;
  }

  return <>{children}</>;
}
