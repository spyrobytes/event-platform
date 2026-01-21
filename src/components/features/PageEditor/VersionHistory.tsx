"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Version = {
  id: string;
  configVersion: number;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

type VersionHistoryProps = {
  eventId: string;
  currentVersionId?: string;
  onRollback: (config: unknown) => void;
  onPreview: (config: unknown) => void;
  onCancelPreview: () => void;
  isPreviewMode: boolean;
};

/**
 * Version history panel for page config
 * Shows version list and allows preview/rollback
 */
export function VersionHistory({
  eventId,
  onRollback,
  onPreview,
  onCancelPreview,
  isPreviewMode,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${eventId}/page-config/versions`);
      if (!response.ok) {
        throw new Error("Failed to fetch versions");
      }
      const data = await response.json();
      setVersions(data.data.versions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load versions");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    fetchVersions();
  }, [fetchVersions]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSelectedVersion(null);
    if (isPreviewMode) {
      onCancelPreview();
    }
  }, [isPreviewMode, onCancelPreview]);

  const handlePreview = useCallback(
    async (versionId: string) => {
      try {
        const response = await fetch(
          `/api/events/${eventId}/page-config/versions/${versionId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch version");
        }
        const data = await response.json();
        setSelectedVersion(versionId);
        onPreview(data.data.config);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to preview version");
      }
    },
    [eventId, onPreview]
  );

  const handleRollback = useCallback(async () => {
    if (!selectedVersion) return;

    setIsRollingBack(true);
    try {
      const response = await fetch(
        `/api/events/${eventId}/page-config/versions/${selectedVersion}`,
        { method: "POST" }
      );
      if (!response.ok) {
        throw new Error("Failed to rollback");
      }
      const data = await response.json();
      onRollback(data.data.config);
      setSelectedVersion(null);
      setIsOpen(false);
      // Refresh versions after rollback
      fetchVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rollback");
    } finally {
      setIsRollingBack(false);
    }
  }, [eventId, selectedVersion, onRollback, fetchVersions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="gap-2"
      >
        <span className="text-base">↺</span>
        Version History
      </Button>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-medium">Version History</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-8 w-8 p-0"
        >
          ×
        </Button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={fetchVersions}
              className="mt-2"
            >
              Try again
            </Button>
          </div>
        ) : versions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No version history yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Versions are saved automatically when you update the page.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className={cn(
                  "flex items-center justify-between px-4 py-3 transition-colors",
                  selectedVersion === version.id && "bg-primary/5",
                  index === 0 && "bg-muted/50"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatRelativeTime(version.createdAt)}
                    </span>
                    {index === 0 && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {version.createdBy.name || version.createdBy.email || "Unknown user"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {index !== 0 && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(version.id)}
                        disabled={selectedVersion === version.id && isPreviewMode}
                        className="h-8 px-2 text-xs"
                      >
                        {selectedVersion === version.id && isPreviewMode
                          ? "Previewing"
                          : "Preview"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rollback action bar */}
      {selectedVersion && isPreviewMode && (
        <div className="flex items-center justify-between border-t bg-muted/50 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Previewing older version
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedVersion(null);
                onCancelPreview();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleRollback}
              disabled={isRollingBack}
            >
              {isRollingBack ? "Restoring..." : "Restore this version"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
