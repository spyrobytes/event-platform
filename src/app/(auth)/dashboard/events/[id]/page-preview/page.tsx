"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { getTemplate } from "@/components/templates";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

type PageConfigResponse = {
  config: EventPageConfigV1;
  templateId: string;
  isPublished: boolean;
  publishedAt: string | null;
  assets: Array<{
    id: string;
    kind: string;
    publicUrl: string | null;
    width: number | null;
    height: number | null;
    alt: string;
  }>;
};

export default function PagePreviewPage() {
  const params = useParams<{ id: string }>();
  const { getIdToken } = useAuthContext();
  const [pageData, setPageData] = useState<PageConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [eventSlug, setEventSlug] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPageConfig() {
      try {
        const token = await getIdToken();
        if (!token) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        // Fetch page config and event data in parallel
        const [configResponse, eventResponse] = await Promise.all([
          fetch(`/api/events/${params.id}/page-config`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/events/${params.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!configResponse.ok) {
          throw new Error("Failed to fetch page configuration");
        }

        if (!eventResponse.ok) {
          throw new Error("Failed to fetch event");
        }

        const configData = await configResponse.json();
        const eventData = await eventResponse.json();

        setPageData(configData.data);
        setEventSlug(eventData.data.slug);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load preview");
      } finally {
        setLoading(false);
      }
    }

    fetchPageConfig();
  }, [params.id, getIdToken]);

  const handlePublish = async () => {
    if (isPublishing) return;

    setIsPublishing(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/events/${params.id}/page-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "publish" }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to publish page");
      }

      const result = await response.json();
      setPageData((prev) =>
        prev ? { ...prev, isPublished: true, publishedAt: result.data.publishedAt } : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish page");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (isPublishing) return;

    setIsPublishing(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/events/${params.id}/page-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "unpublish" }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to unpublish page");
      }

      setPageData((prev) =>
        prev ? { ...prev, isPublished: false, publishedAt: null } : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unpublish page");
    } finally {
      setIsPublishing(false);
    }
  };

  // Transform assets for template
  const templateAssets = useMemo(() => {
    if (!pageData) return [];
    return pageData.assets.map((asset) => ({
      ...asset,
      eventId: params.id,
      ownerUserId: "",
      bucket: "",
      path: "",
      mimeType: "",
      sizeBytes: 0,
      createdAt: new Date(),
    })) as unknown as MediaAsset[];
  }, [pageData, params.id]);

  // Get template component
  const Template = useMemo(() => {
    if (!pageData) return null;
    return getTemplate(pageData.templateId) || getTemplate("wedding_v1");
  }, [pageData]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !pageData || !Template) {
    return (
      <div className="space-y-4">
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10">
          <p className="text-sm text-destructive">{error || "Failed to load preview"}</p>
        </div>
        <Link href={`/dashboard/events/${params.id}`}>
          <Button variant="outline">Back to Event</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview toolbar */}
      <div className="sticky top-0 z-50 flex items-center justify-between rounded-lg border bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/events/${params.id}`}>
            <Button variant="ghost" size="sm">
              ← Back
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Preview Mode</span>
            {pageData.isPublished ? (
              <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs font-medium text-success">
                Published
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Draft
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pageData.isPublished && eventSlug && (
            <Link href={`/e/${eventSlug}`} target="_blank">
              <Button variant="outline" size="sm">
                View Live
              </Button>
            </Link>
          )}
          <Link href={`/dashboard/events/${params.id}/page-editor`}>
            <Button variant="outline" size="sm">
              Edit Page
            </Button>
          </Link>
          {pageData.isPublished ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnpublish}
              disabled={isPublishing}
            >
              {isPublishing ? "..." : "Unpublish"}
            </Button>
          ) : (
            <Button size="sm" onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? "Publishing..." : "Publish Page"}
            </Button>
          )}
        </div>
      </div>

      {/* Preview frame */}
      <div className="overflow-hidden rounded-lg border shadow-lg">
        <Template config={pageData.config} assets={templateAssets} />
      </div>
    </div>
  );
}
