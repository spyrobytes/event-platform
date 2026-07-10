"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { parseApiResponse } from "@/lib/api-client";
import { PAGE_CONFIG_LIMITS } from "@/schemas/event-page";

type Asset = {
  id: string;
  kind: string;
  publicUrl: string | null;
  width: number | null;
  height: number | null;
  alt: string;
};

type CoverImagePickerProps = {
  /** Event ID — required to enable upload and library features. Null/undefined in create mode. */
  eventId?: string | null;
  /** Current cover image URL (the form value). */
  value: string;
  /** Called with the new URL when the user picks, uploads, or types one. Pass "" to clear. */
  onChange: (url: string) => void;
  /** Firebase ID token getter — required to enable upload and library features. */
  getIdToken?: () => Promise<string | null>;
  disabled?: boolean;
};

// Single source of truth in the schema — sized to what the upload route can
// actually receive (Vercel's 4.5MB function-body cap), see PAGE_CONFIG_LIMITS.
const MAX_FILE_SIZE = PAGE_CONFIG_LIMITS.maxFileSizeBytes;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Cover image picker supporting three input modes:
 *   1. Pick an existing asset from the event's Media Library
 *   2. Upload a new image (stored as kind=HERO)
 *   3. Paste an external image URL
 *
 * In create mode (no eventId), only mode 3 is available.
 */
export function CoverImagePicker({
  eventId,
  value,
  onChange,
  getIdToken,
  disabled = false,
}: CoverImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  const canUseLibrary = Boolean(eventId && getIdToken);

  const fetchAssets = useCallback(async () => {
    if (!eventId || !getIdToken) return;
    setLoadingAssets(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }
      const res = await fetch(`/api/events/${eventId}/media`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load media library");
      setAssets(data.data?.assets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load media library");
    } finally {
      setLoadingAssets(false);
    }
  }, [eventId, getIdToken]);

  // Lazy-load assets the first time the library is opened
  useEffect(() => {
    if (showLibrary && assets === null && canUseLibrary) {
      fetchAssets();
    }
  }, [showLibrary, assets, canUseLibrary, fetchAssets]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !eventId || !getIdToken) return;

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("File type not supported. Use JPEG, PNG, or WebP.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setError(null);
      setUploading(true);

      try {
        const token = await getIdToken();
        if (!token) throw new Error("Not authenticated");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("kind", "HERO");
        formData.append("alt", "Cover image");

        const res = await fetch(`/api/events/${eventId}/media`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        // Safe parse: a platform-level rejection (e.g. Vercel's 4.5MB body
        // cap → plain-text 413) is not JSON and must surface readably.
        const data = await parseApiResponse<{
          data: { id: string; kind: string; publicUrl: string | null; width: number | null; height: number | null };
        }>(res);

        const newAsset: Asset = {
          id: data.data.id,
          kind: data.data.kind,
          publicUrl: data.data.publicUrl,
          width: data.data.width,
          height: data.data.height,
          alt: "Cover image",
        };

        setAssets((prev) => (prev ? [newAsset, ...prev] : [newAsset]));
        if (newAsset.publicUrl) {
          onChange(newAsset.publicUrl);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [eventId, getIdToken, onChange]
  );

  const handleClear = () => {
    onChange("");
    setError(null);
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      {value ? (
        <div className="relative overflow-hidden rounded-lg border">
          <div className="aspect-video w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Cover preview"
              className="h-full w-full object-contain"
              onError={() => setError("Image failed to load — check the URL")}
            />
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-black/80 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border bg-gradient-to-br from-primary/30 via-primary/10 to-accent/30">
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <svg
              className="h-8 w-8 text-foreground/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm font-medium text-foreground/80">
              {canUseLibrary ? "No cover image selected" : "A cover image brings your event to life"}
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Upload + Library actions (edit mode only) */}
      {canUseLibrary ? (
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            className="hidden"
            onChange={handleFileUpload}
            disabled={disabled || uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? "Uploading..." : "Upload Image"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowLibrary((s) => !s)}
            disabled={disabled}
          >
            {showLibrary ? "Hide Media Library" : "Choose from Media Library"}
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm text-foreground/80">
            <span className="font-medium">Add a cover image after creation.</span>{" "}
            Once your event is saved, you&apos;ll be able to upload images or pick
            from your Media Library on the Edit page.
          </p>
        </div>
      )}

      {/* Library grid */}
      {canUseLibrary && showLibrary && (
        <div className="rounded-lg border p-3">
          {loadingAssets ? (
            <p className="text-sm text-muted-foreground">Loading library…</p>
          ) : assets && assets.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {assets.map((asset) => {
                const isSelected = !!asset.publicUrl && value === asset.publicUrl;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => asset.publicUrl && onChange(asset.publicUrl)}
                    aria-pressed={isSelected}
                    title={asset.alt || "Select image"}
                    className={cn(
                      "relative aspect-video overflow-hidden rounded-lg border-2 transition-all",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-muted hover:border-muted-foreground"
                    )}
                  >
                    {asset.publicUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={asset.publicUrl}
                        alt={asset.alt || "Media asset"}
                        className="h-full w-full object-contain"
                      />
                    )}
                    {isSelected && (
                      <span
                        aria-hidden="true"
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                      >
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No images in your Media Library yet. Upload one above, or add images from the Page Editor.
            </p>
          )}
        </div>
      )}

      {/* URL input — only shown in edit mode as a third option for external images */}
      {canUseLibrary && (
        <div className="space-y-2">
          <Label htmlFor="coverImageUrl">Or paste an image URL</Label>
          <Input
            id="coverImageUrl"
            type="url"
            placeholder="https://example.com/image.jpg"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
