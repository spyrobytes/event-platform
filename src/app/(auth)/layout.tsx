"use client";

import { type ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { useImpersonation } from "@/components/providers/ImpersonationProvider";
import { UserProfileProvider, useUserProfile } from "@/components/providers/UserProfileProvider";
import { AuthGuard } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";

type AuthLayoutProps = {
  children: ReactNode;
};

function DashboardNav() {
  const { user, signOut } = useAuthContext();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="inline-flex">
            <Logo variant="full" />
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/events"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              My Events
            </Link>
            <Link
              href="/dashboard/events/new"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Create Event
            </Link>
            <Link
              href="/dashboard/profile"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Profile
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/profile"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {user?.email}
          </Link>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}

function ActingAsBanner() {
  const { grant, exitActAs } = useImpersonation();
  const router = useRouter();
  // Tick once a second so the remaining-time display counts down live. `now`
  // only affects output while a grant is active (which is post-mount, client
  // only — the banner renders null during SSR/hydration), so seeding it from
  // Date.now() can't cause a hydration mismatch.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!grant) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [grant]);

  if (!grant) return null;

  const who = grant.target.name?.trim() || grant.target.email;
  const remainingSec = Math.max(
    0,
    Math.ceil((new Date(grant.expiresAt).getTime() - now) / 1000),
  );
  const mm = Math.floor(remainingSec / 60);
  const ss = String(remainingSec % 60).padStart(2, "0");

  const handleExit = async () => {
    await exitActAs();
    router.push("/efx-ctrl/events");
  };

  // Inverted bar so the impersonation mode is unmistakable on every theme.
  return (
    <div className="flex items-center justify-center gap-2 border-b bg-foreground px-4 py-2 text-center text-sm text-background">
      <span className="font-medium">Editing on behalf of {who}</span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums opacity-80">
        {mm}:{ss} left
      </span>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        onClick={handleExit}
        className="font-semibold underline underline-offset-2 hover:no-underline"
      >
        Exit
      </button>
    </div>
  );
}

function StatusBanner() {
  const { getIdToken, loading, isAuthenticated } = useAuthContext();
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const res = await fetch("/api/launch-invites/invite-status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) {
          const { data } = await res.json();
          setStatus(data.organizerStatus ?? null);
        }
      } catch {
        // Non-critical — banner just won't show
      }
    };
    fetchStatus();
    return () => { cancelled = true; };
  }, [loading, isAuthenticated, getIdToken]);

  if (status === "SUSPENDED") {
    return (
      <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
        Your account has been suspended. You have read-only access to your dashboard. Contact support for more information.
      </div>
    );
  }

  if (status === "UNDER_REVIEW") {
    return (
      <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-800 dark:text-amber-300">
        Your account is under review. You can continue creating events, but publishing is temporarily disabled.
      </div>
    );
  }

  return null;
}

function ProfileBanner() {
  const { profile, loading } = useUserProfile();

  if (loading || profile?.name?.trim()) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-800 dark:text-amber-300">
      Add your name in{" "}
      <Link href="/dashboard/profile" className="font-medium underline hover:no-underline">
        profile settings
      </Link>
      {" "}so guests see it on invitations and reminders.
    </div>
  );
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <AuthGuard>
      <UserProfileProvider>
        <div className="min-h-screen bg-background">
          <DashboardNav />
          <ActingAsBanner />
          <StatusBanner />
          <ProfileBanner />
          <main className="container py-6">{children}</main>
        </div>
      </UserProfileProvider>
    </AuthGuard>
  );
}
