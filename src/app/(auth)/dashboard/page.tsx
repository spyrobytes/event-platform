"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardStats = {
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
  totalInvites: number;
  totalRsvps: number;
  yesRsvps: number;
  responseRate: number;
};

export default function DashboardPage() {
  const { user, getIdToken } = useAuthContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch("/api/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setStats(result.data);
      }
    } catch {
      // Fail silently - stats are not critical
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back{user?.displayName ? `, ${user.displayName}` : ""}!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>My Events</CardTitle>
            <CardDescription>Manage your created events</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/events">
              <Button variant="outline" className="w-full">
                View Events
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Event</CardTitle>
            <CardDescription>Start planning a new event</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/events/new">
              <Button className="w-full">Create Event</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Your event statistics</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              </div>
            ) : stats && stats.totalEvents > 0 ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Events</span>
                  <span className="font-medium">{stats.totalEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Published</span>
                  <span className="font-medium">{stats.publishedEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Invites</span>
                  <span className="font-medium">{stats.totalInvites}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmed RSVPs</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {stats.yesRsvps}
                  </span>
                </div>
                {stats.totalInvites > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Response Rate</span>
                    <span className="font-medium">{stats.responseRate}%</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Event statistics will appear here once you create events.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
