"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import {
  MEDIA_TAGS,
  MEDIA_TAG_LABELS,
  MEDIA_TAG_HINTS,
  type MediaTag,
} from "@/lib/media-tags";

type Asset = {
  id: string;
  kind: string;
  tags: string[];
  publicUrl: string | null;
  width: number | null;
  height: number | null;
  alt: string;
};

type MediaUploadCardProps = {
  eventId: string;
  assets: Asset[];
  onAssetUploaded: (newAsset: Asset) => void;
  onAssetDeleted: (assetId: string) => void;
  onAssetUpdated?: (updatedAsset: Asset) => void;
  getIdToken: () => Promise<string | null>;
  maxAssets?: number;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function MediaUploadCard({
  eventId,
  assets,
  onAssetUploaded,
  onAssetDeleted,
  onAssetUpdated,
  getIdToken,
  maxAssets = 30,
}: MediaUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTags, setSelectedTags] = useState<MediaTag[]>(["gallery"]);
  const [altText, setAltText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState<MediaTag[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

  // Grid grouping uses tags, not kind. Hero = tagged "hero"; gallery = everything else.
  const heroAssets = assets.filter((a) => a.tags.includes("hero"));
  const galleryAssets = assets.filter((a) => !a.tags.includes("hero"));
  const isAtMaxAssets = assets.length >= maxAssets;

  const toggleSelectedTag = useCallback((tag: MediaTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const toggleEditingTag = useCallback((tag: MediaTag) => {
    setEditingTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const startEditingAsset = useCallback((asset: Asset) => {
    setEditingAssetId(asset.id);
    // Pre-select tags that are valid MediaTag values. Unknown tags (shouldn't happen) are dropped.
    setEditingTags(asset.tags.filter((t): t is MediaTag => (MEDIA_TAGS as readonly string[]).includes(t)));
  }, []);

  const cancelEditingAsset = useCallback(() => {
    setEditingAssetId(null);
    setEditingTags([]);
  }, []);

  const handleSaveTags = useCallback(async () => {
    if (!editingAssetId || editingTags.length === 0) {
      setError("Select at least one tag.");
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`/api/events/${eventId}/media`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assetId: editingAssetId, tags: editingTags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update tags");

      onAssetUpdated?.({
        id: data.data.id,
        kind: data.data.kind,
        tags: data.data.tags,
        publicUrl: data.data.publicUrl,
        width: data.data.width,
        height: data.data.height,
        alt: data.data.alt,
      });
      setEditingAssetId(null);
      setEditingTags([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tags");
    } finally {
      setSavingEdit(false);
    }
  }, [editingAssetId, editingTags, eventId, getIdToken, onAssetUpdated]);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "File type not supported. Please upload JPEG, PNG, or WebP.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const file = e.target.files?.[0];
      if (!file) {
        setSelectedFile(null);
        return;
      }

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      setSelectedFile(file);
    },
    [validateFile]
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !altText.trim()) {
      setError("Please provide alt text for accessibility.");
      return;
    }
    if (selectedTags.length === 0) {
      setError("Select at least one tag so the image can be used somewhere.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const token = await getIdToken();
      if (!token) {
        setError("Not authenticated. Please log in again.");
        return;
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("tags", JSON.stringify(selectedTags));
      formData.append("alt", altText.trim());

      const response = await fetch(`/api/events/${eventId}/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      // API returns { data: { id, publicUrl, width, height, kind, tags } }
      const newAsset: Asset = {
        id: data.data.id,
        kind: data.data.kind,
        tags: data.data.tags ?? [],
        publicUrl: data.data.publicUrl,
        width: data.data.width,
        height: data.data.height,
        alt: altText.trim(),
      };

      onAssetUploaded(newAsset);

      // Reset form
      setSelectedFile(null);
      setAltText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [selectedFile, altText, selectedTags, eventId, getIdToken, onAssetUploaded]);

  const handleDelete = useCallback(
    async (assetId: string) => {
      setDeleting(assetId);
      setError(null);

      try {
        const token = await getIdToken();
        if (!token) {
          setError("Not authenticated. Please log in again.");
          return;
        }

        const response = await fetch(`/api/events/${eventId}/media`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ assetId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to delete image");
        }

        onAssetDeleted(assetId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setDeleting(null);
      }
    },
    [eventId, getIdToken, onAssetDeleted]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media Library</CardTitle>
        <CardDescription>
          Upload images for your event page ({assets.length}/{maxAssets})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Workflow tip */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>How it works:</strong> Upload images here, then select them in the Hero Section above or Gallery Section below.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Upload form */}
        <div className="space-y-4 rounded-lg border p-4">
          <h4 className="text-sm font-medium">Upload New Image</h4>

          {/* Tag selection — one image can carry multiple roles */}
          <div className="space-y-2">
            <Label>
              Tags <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Choose where this image can be used. You can select more than one.
            </p>
            <div className="flex flex-wrap gap-2">
              {MEDIA_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleSelectedTag(tag)}
                    disabled={uploading || isAtMaxAssets}
                    aria-pressed={active}
                    title={MEDIA_TAG_HINTS[tag]}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      active
                        ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/30 shadow-sm"
                        : "border-input bg-background text-muted-foreground hover:border-muted-foreground hover:bg-muted hover:text-foreground",
                      (uploading || isAtMaxAssets) && "cursor-not-allowed opacity-50"
                    )}
                  >
                    {active && (
                      <svg
                        aria-hidden="true"
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {MEDIA_TAG_LABELS[tag]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alt text */}
          <div className="space-y-2">
            <Label htmlFor="altText">
              Alt Text <span className="text-destructive">*</span>
            </Label>
            <Input
              id="altText"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe this image for accessibility"
              disabled={uploading || isAtMaxAssets}
            />
          </div>

          {/* File picker */}
          <div className="space-y-2">
            <Label htmlFor="fileInput">File</Label>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                id="fileInput"
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                onChange={handleFileSelect}
                disabled={uploading || isAtMaxAssets}
                className="text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Max 5MB, JPEG/PNG/WebP
              </p>
            </div>
          </div>

          {/* Upload button */}
          <Button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !altText.trim() || isAtMaxAssets}
            className="w-full sm:w-auto"
          >
            {uploading ? "Uploading..." : "Upload Image"}
          </Button>

          {isAtMaxAssets && (
            <p className="text-sm text-amber-600">
              Maximum {maxAssets} images reached. Delete some images to upload more.
            </p>
          )}
        </div>

        {/* Hero Images */}
        {heroAssets.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Hero Images ({heroAssets.length})</h4>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {heroAssets.map((asset) => (
                <AssetThumbnail
                  key={asset.id}
                  asset={asset}
                  aspect="video"
                  deleting={deleting === asset.id}
                  editingOpen={editingAssetId === asset.id}
                  editingTags={editingTags}
                  savingEdit={savingEdit}
                  onDelete={() => setDeleteTarget(asset)}
                  onStartEdit={() => startEditingAsset(asset)}
                  onCancelEdit={cancelEditingAsset}
                  onToggleTag={toggleEditingTag}
                  onSaveTags={handleSaveTags}
                />
              ))}
            </div>
          </div>
        )}

        {/* Gallery Images */}
        {galleryAssets.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Gallery Images ({galleryAssets.length})</h4>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {galleryAssets.map((asset) => (
                <AssetThumbnail
                  key={asset.id}
                  asset={asset}
                  aspect="square"
                  deleting={deleting === asset.id}
                  editingOpen={editingAssetId === asset.id}
                  editingTags={editingTags}
                  savingEdit={savingEdit}
                  onDelete={() => setDeleteTarget(asset)}
                  onStartEdit={() => startEditingAsset(asset)}
                  onCancelEdit={cancelEditingAsset}
                  onToggleTag={toggleEditingTag}
                  onSaveTags={handleSaveTags}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {assets.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No images uploaded yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload images above to use them in your event page.
            </p>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) handleDelete(target.id);
        }}
        title="Delete image?"
        description={
          deleteTarget
            ? `This will permanently remove "${deleteTarget.alt || "this image"}" from your Media Library. Any section that currently uses it will lose the reference. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
      />
    </Card>
  );
}

type AssetThumbnailProps = {
  asset: Asset;
  aspect: "video" | "square";
  deleting: boolean;
  editingOpen: boolean;
  editingTags: MediaTag[];
  savingEdit: boolean;
  onDelete: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onToggleTag: (tag: MediaTag) => void;
  onSaveTags: () => void;
};

function AssetThumbnail({
  asset,
  aspect,
  deleting,
  editingOpen,
  editingTags,
  savingEdit,
  onDelete,
  onStartEdit,
  onCancelEdit,
  onToggleTag,
  onSaveTags,
}: AssetThumbnailProps) {
  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "group relative overflow-hidden rounded-lg border bg-muted",
          aspect === "video" ? "aspect-video" : "aspect-square"
        )}
      >
        {asset.publicUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={asset.publicUrl}
            alt={asset.alt || "Media asset"}
            className="h-full w-full object-cover"
          />
        )}

        {/* Hover action bar */}
        <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onStartEdit}
            className="rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-black shadow-sm hover:bg-white"
            aria-label={`Edit tags for ${asset.alt || "image"}`}
          >
            Edit tags
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className={cn(
              "rounded-full bg-red-500 p-1.5 text-white transition-colors hover:bg-red-600",
              deleting && "cursor-wait"
            )}
            aria-label={`Delete ${asset.alt || "image"}`}
          >
            {deleting ? (
              <span className="block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <span className="block h-3 w-3 text-sm leading-none">&times;</span>
            )}
          </button>
        </div>
      </div>

      {/* Tag badges */}
      {!editingOpen && asset.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {asset.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-foreground/20 bg-foreground/10 px-2 py-0.5 text-[10px] font-medium text-foreground"
            >
              {(MEDIA_TAG_LABELS as Record<string, string>)[tag] ?? tag}
            </span>
          ))}
        </div>
      )}

      {/* Inline tag editor */}
      {editingOpen && (
        <div className="space-y-2 rounded-md border bg-card p-2">
          <div className="flex flex-wrap gap-1">
            {MEDIA_TAGS.map((tag) => {
              const active = editingTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggleTag(tag)}
                  disabled={savingEdit}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all",
                    active
                      ? "border-primary bg-primary text-primary-foreground ring-1 ring-primary/30 shadow-sm"
                      : "border-input bg-background text-muted-foreground hover:border-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {active && (
                    <svg
                      aria-hidden="true"
                      className="h-2.5 w-2.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {MEDIA_TAG_LABELS[tag]}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={savingEdit}
              className="rounded-md border border-input bg-background px-2 py-0.5 text-[11px] hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveTags}
              disabled={savingEdit || editingTags.length === 0}
              className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {savingEdit ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
