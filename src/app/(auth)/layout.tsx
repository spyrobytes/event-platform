"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { useAuthContext } from "@/components/providers/AuthProvider";
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
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user?.email}
          </span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="container py-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
