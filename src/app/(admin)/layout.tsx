"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { AuthGuard } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";

function AdminNav() {
  const { user, signOut } = useAuthContext();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/efx-ctrl/invites" className="inline-flex items-center gap-2">
            <Logo variant="full" />
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Admin
            </span>
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            <Link
              href="/efx-ctrl/invites"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Invites
            </Link>
            <Link
              href="/efx-ctrl/organizers"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Organizers
            </Link>
            <Link
              href="/efx-ctrl/events"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Events
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">Dashboard</Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}

function AdminGate({ children }: { children: ReactNode }) {
  const { getIdToken, loading, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    const checkAdmin = async () => {
      try {
        const token = await getIdToken();
        if (!token) { setIsAdmin(false); return; }

        const res = await fetch("/api/launch-invites/invite-status", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const { data } = await res.json();
          setIsAdmin(data.isAdmin === true);
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [loading, isAuthenticated, getIdToken]);

  useEffect(() => {
    if (isAdmin === false) {
      router.replace("/dashboard");
    }
  }, [isAdmin, router]);

  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireInvite={false}>
      <AdminGate>
        <div className="min-h-screen bg-background">
          <AdminNav />
          <main className="container py-6">{children}</main>
        </div>
      </AdminGate>
    </AuthGuard>
  );
}
