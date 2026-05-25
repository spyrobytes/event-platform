"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  GalleryExternalLinkForm,
  GalleryItemsManager,
  GalleryPublishDialog,
  GoogleDriveGallerySection,
} from "@/components/features/PostEventGallery";
import type {
  GalleryStatus,
  OrganizerGalleryItem,
} from "@/schemas/gallery";

type GalleryRow = {
  id: string;
  title: string | null;
  description: string | null;
  sourceType: string;
  sourceRef: unknown;
  status: GalleryStatus;
  publishedAt: string | null;
  updatedAt: string;
  coverGalleryItemId: string | null;
  coverMediaAssetId: string | null;
  items: OrganizerGalleryItem[];
};

type EventBasic = { id: string; title: string; slug: string };

// Record<GalleryStatus, …> means adding a new status to the union forces a
// label to land here — TypeScript will fail the build otherwise.
const STATUS_LABEL: Record<GalleryStatus, { label: string; tone: string }> = {
  DRAFT: { label: "Draft", tone: "bg-muted text-muted-foreground" },
  PUBLISHED: { label: "Published", tone: "bg-success/15 text-success" },
  HIDDEN: { label: "Hidden", tone: "bg-amber-500/15 text-amber-600" },
  SYNCING: { label: "Importing", tone: "bg-muted text-muted-foreground" },
  READY: { label: "Ready", tone: "bg-muted text-muted-foreground" },
  ERROR: { label: "Error", tone: "bg-destructive/15 text-destructive" },
};

export default function PostEventGalleryDashboardPage() {
  const params = useParams<{ id: string }>();
  const { getIdToken } = useAuthContext();

  const [event, setEvent] = useState<EventBasic | null>(null);
  const [gallery, setGallery] = useState<GalleryRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishToast, setPublishToast] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<
    "publish" | "unpublish" | "delete" | null
  >(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }
      const [eventRes, galleryRes] = await Promise.all([
        fetch(`/api/events/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/events/${params.id}/gallery`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (!eventRes.ok) throw new Error("Event not found");
      if (galleryRes.status === 404) {
        // Feature flag off — surface a clear message rather than a generic error
        throw new Error("Post-event gallery is not enabled for this environment");
      }
      if (!galleryRes.ok) throw new Error("Failed to load gallery");
      const eventData = await eventRes.json();
      const galleryData = await galleryRes.json();
      setEvent({
        id: eventData.data.id,
        title: eventData.data.title,
        slug: eventData.data.slug,
      });
      setGallery(galleryData.data.gallery ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params.id, getIdToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const callGalleryAction = useCallback(
    async (
      action: "publish" | "unpublish" | "delete",
      galleryId: string,
    ): Promise<boolean> => {
      setActionPending(action);
      setError(null);
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Not authenticated");
        const path =
          action === "delete"
            ? `/api/events/${params.id}/gallery/${galleryId}`
            : `/api/events/${params.id}/gallery/${galleryId}/${action}`;
        const res = await fetch(path, {
          method: action === "delete" ? "DELETE" : "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Failed to ${action} gallery`);
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to ${action}`);
        return false;
      } finally {
        setActionPending(null);
      }
    },
    [params.id, getIdToken],
  );

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading…</div>;
  }

  if (error && !event) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!event) return null;

  const statusBadge = gallery ? STATUS_LABEL[gallery.status] : null;
  const publicGalleryHref = `/e/${event.slug}/gallery`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/events/${event.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {event.title}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Post-Event Gallery
          </h1>
          <p className="text-sm text-muted-foreground">
            Share photos with guests after the event — link out to an external
            album or import from Google Drive.
          </p>
        </div>
        {gallery && statusBadge && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge.tone}`}
          >
            {statusBadge.label}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {!gallery && (
        <>
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-medium">Add an album link</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste a link to your photographer&apos;s gallery (Pixieset,
              SmugMug, a Drive folder, etc). Guests will see a polished landing
              page that links out to your album.
            </p>
            <div className="mt-6">
              <GalleryExternalLinkForm
                eventId={event.id}
                existing={null}
                getIdToken={getIdToken}
                onSaved={() => void load()}
              />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-medium">Or import from Google Drive</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect Drive, pick photos from a folder, and we&apos;ll host a
              polished gallery on your event page. Up to 50 photos per event;
              JPEG, PNG, or WebP under 10&nbsp;MB each.
            </p>
            <div className="mt-6">
              <GoogleDriveGallerySection
                eventId={event.id}
                returnPath={`/dashboard/events/${event.id}/gallery`}
                getIdToken={getIdToken}
                onGalleryChanged={() => void load()}
              />
            </div>
          </div>
        </>
      )}

      {gallery && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium">
                {gallery.sourceType === "EXTERNAL_LINK"
                  ? "External album link"
                  : gallery.sourceType === "GOOGLE_DRIVE"
                    ? "Google Drive import"
                    : gallery.sourceType}
              </h2>
              {gallery.status === "PUBLISHED" && (
                <Link
                  href={publicGalleryHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  View public page ↗
                </Link>
              )}
            </div>
            {gallery.sourceType === "EXTERNAL_LINK" ? (
              <GalleryExternalLinkForm
                eventId={event.id}
                existing={gallery}
                getIdToken={getIdToken}
                onSaved={() => void load()}
              />
            ) : (
              <GoogleDriveGallerySection
                eventId={event.id}
                returnPath={`/dashboard/events/${event.id}/gallery`}
                getIdToken={getIdToken}
                onGalleryChanged={() => void load()}
              />
            )}
          </div>

          {gallery.sourceType !== "EXTERNAL_LINK" && gallery.items.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-base font-medium">Photos</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Reorder, hide, set a cover, or delete imported photos. Only
                READY photos appear publicly.
              </p>
              <div className="mt-4">
                <GalleryItemsManager
                  eventId={event.id}
                  galleryId={gallery.id}
                  items={gallery.items}
                  coverGalleryItemId={gallery.coverGalleryItemId}
                  getIdToken={getIdToken}
                  onChanged={() => void load()}
                />
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-base font-medium">Actions</h3>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {gallery.status === "PUBLISHED" ? (
                <>
                  <Button
                    variant="outline"
                    disabled={actionPending !== null}
                    onClick={async () => {
                      const ok = await callGalleryAction("unpublish", gallery.id);
                      if (ok) await load();
                    }}
                  >
                    {actionPending === "unpublish"
                      ? "Unpublishing…"
                      : "Unpublish"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={actionPending !== null}
                    onClick={() => setShowPublishDialog(true)}
                  >
                    Re-notify guests
                  </Button>
                </>
              ) : (
                <Button
                  disabled={actionPending !== null}
                  onClick={() => setShowPublishDialog(true)}
                >
                  Publish
                </Button>
              )}
              <Button
                variant="destructive"
                disabled={actionPending !== null}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Unpublishing hides the gallery from the public event page. Delete
              removes it entirely — you can always add it back later.
            </p>
          </div>
        </div>
      )}

      {publishToast && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          {publishToast}
        </div>
      )}

      {gallery && (
        <GalleryPublishDialog
          open={showPublishDialog}
          eventId={event.id}
          galleryId={gallery.id}
          alreadyPublished={gallery.status === "PUBLISHED"}
          getIdToken={getIdToken}
          onCancel={() => setShowPublishDialog(false)}
          onPublished={({ emailsQueued }) => {
            setShowPublishDialog(false);
            setPublishToast(
              emailsQueued > 0
                ? `Gallery published. Queued ${emailsQueued} guest ${emailsQueued === 1 ? "email" : "emails"} — they'll send on the next mail tick (~5 min).`
                : "Gallery published.",
            );
            void load();
            // Auto-dismiss after 8s so the toast doesn't sit forever.
            window.setTimeout(() => setPublishToast(null), 8000);
          }}
        />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          if (!gallery) return;
          const ok = await callGalleryAction("delete", gallery.id);
          if (ok) await load();
        }}
        title="Delete gallery"
        description="Remove this gallery from the event? Guests will no longer see the photo CTA on the public page. You can add a new gallery anytime."
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
