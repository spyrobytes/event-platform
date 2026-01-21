"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PreviewShareCardProps = {
  eventId: string;
  getIdToken: () => Promise<string | null>;
};

type PreviewTokenStatus = {
  hasToken: boolean;
  isExpired: boolean;
  expiresAt: string | null;
};

/**
 * Card component for managing preview sharing links
 * Allows generating, copying, and revoking preview tokens
 */
export function PreviewShareCard({ eventId, getIdToken }: PreviewShareCardProps) {
  const [status, setStatus] = useState<PreviewTokenStatus | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch(`/api/events/${eventId}/preview-token`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.data);
      }
    } catch {
      // Silently fail - status will show as no token
    } finally {
      setLoading(false);
    }
  }, [eventId, getIdToken]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const generateToken = async () => {
    setGenerating(true);
    setError(null);

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/events/${eventId}/preview-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to generate preview link");
      }

      const data = await response.json();
      setPreviewToken(data.data.token);
      setStatus({
        hasToken: true,
        isExpired: false,
        expiresAt: data.data.expiresAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate link");
    } finally {
      setGenerating(false);
    }
  };

  const revokeToken = async () => {
    setRevoking(true);
    setError(null);

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/events/${eventId}/preview-token`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to revoke preview link");
      }

      setPreviewToken(null);
      setStatus({
        hasToken: false,
        isExpired: false,
        expiresAt: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke link");
    } finally {
      setRevoking(false);
    }
  };

  const copyLink = async () => {
    if (!previewToken) return;

    const link = `${window.location.origin}/preview/${previewToken}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewUrl = previewToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/preview/${previewToken}`
    : null;

  const formatExpiry = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Share Preview</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share Preview</CardTitle>
        <CardDescription>
          Share a private preview link with others before publishing your event page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {previewToken ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={previewUrl || ""}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={copyLink}
                className="shrink-0"
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            {status?.expiresAt && (
              <p className="text-sm text-muted-foreground">
                This link expires on {formatExpiry(status.expiresAt)}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateToken}
                disabled={generating}
              >
                {generating ? "Generating..." : "Generate New Link"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={revokeToken}
                disabled={revoking}
                className="text-destructive hover:text-destructive"
              >
                {revoking ? "Revoking..." : "Revoke Link"}
              </Button>
            </div>
          </div>
        ) : status?.hasToken && !status.isExpired ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You have an active preview link.{" "}
              {status.expiresAt && <>Expires on {formatExpiry(status.expiresAt)}.</>}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={generateToken}
                disabled={generating}
              >
                {generating ? "Generating..." : "Generate New Link"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={revokeToken}
                disabled={revoking}
                className="text-destructive hover:text-destructive"
              >
                {revoking ? "Revoking..." : "Revoke Link"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Note: Generating a new link will invalidate the previous one.
            </p>
          </div>
        ) : status?.hasToken && status.isExpired ? (
          <div className="space-y-4">
            <p className="text-sm text-amber-600">
              Your previous preview link has expired.
            </p>
            <Button
              type="button"
              onClick={generateToken}
              disabled={generating}
            >
              {generating ? "Generating..." : "Generate New Link"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a shareable preview link that lets others see your event page before it&apos;s published.
              The link will be valid for 7 days.
            </p>
            <Button
              type="button"
              onClick={generateToken}
              disabled={generating}
            >
              {generating ? "Generating..." : "Generate Preview Link"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
