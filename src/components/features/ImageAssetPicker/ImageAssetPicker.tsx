"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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

type ImageAssetPickerProps = {
  eventId: string;
  getIdToken: () => Promise<string | null>;
  /** Current image URL (asset URL or external URL) */
  value: string;
  /** Called with the selected image URL (or "" to clear) */
  onChange: (url: string) => void;
  /** Label shown above the picker */
  label?: string;
  /** Help text shown below the picker */
  description?: string;
  /** Filter assets by kind (default: "HERO") */
  assetKind?: "HERO" | "GALLERY";
};

// Single source of truth in the schema — sized to what the upload route can
// actually receive (Vercel's 4.5MB function-body cap), see PAGE_CONFIG_LIMITS.
const MAX_FILE_SIZE = PAGE_CONFIG_LIMITS.maxFileSizeBytes;
const MAX_FILE_SIZE_MB = MAX_FILE_SIZE / 1024 / 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ImageAssetPicker({
  eventId,
  getIdToken,
  value,
  onChange,
  label = "Image",
  description,
  assetKind = "HERO",
}: ImageAssetPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [altText, setAltText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState("");

  // Determine if the current value matches an asset URL
  const selectedAssetId = assets.find((a) => a.publicUrl === value)?.id ?? null;
  // If value is set but doesn't match any asset, it's an external URL
  const isExternalUrl = value && !selectedAssetId;

  // Fetch existing assets for this event
  useEffect(() => {
    let cancelled = false;

    async function fetchAssets() {
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;

        const response = await fetch(`/api/events/${eventId}/media`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok || cancelled) return;

        const data = await response.json();
        if (!cancelled) {
          setAssets(data.data?.assets ?? []);
        }
      } catch {
        // Silently fail — assets just won't be available for picking
      } finally {
        if (!cancelled) setLoadingAssets(false);
      }
    }

    fetchAssets();
    return () => { cancelled = true; };
  }, [eventId, getIdToken]);

  // Sync manualUrl when switching to URL mode
  useEffect(() => {
    if (showUrlInput && isExternalUrl) {
      setManualUrl(value);
    }
  }, [showUrlInput, isExternalUrl, value]);

  const filteredAssets = assets.filter((a) => a.kind === assetKind);

  const handleUpload = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Please select a file.");
      return;
    }
    if (!altText.trim()) {
      setError("Please provide alt text for accessibility.");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("File type not supported. Please upload JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
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
      formData.append("file", file);
      formData.append("kind", assetKind);
      formData.append("alt", altText.trim());

      const response = await fetch(`/api/events/${eventId}/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      // Safe parse: a platform-level rejection (e.g. Vercel's 4.5MB body cap
      // → plain-text 413) is not JSON and must surface a readable message.
      const data = await parseApiResponse<{
        data: { id: string; kind: string; publicUrl: string | null; width: number | null; height: number | null };
      }>(response);

      const newAsset: Asset = {
        id: data.data.id,
        kind: data.data.kind,
        publicUrl: data.data.publicUrl,
        width: data.data.width,
        height: data.data.height,
        alt: altText.trim(),
      };

      // Add to assets list and auto-select
      setAssets((prev) => [newAsset, ...prev]);
      if (newAsset.publicUrl) {
        onChange(newAsset.publicUrl);
      }

      // Reset upload form
      setAltText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [altText, assetKind, eventId, getIdToken, onChange]);

  const handleSelectAsset = useCallback(
    (asset: Asset) => {
      onChange(asset.publicUrl || "");
      setShowUrlInput(false);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange("");
    setManualUrl("");
    setShowUrlInput(false);
  }, [onChange]);

  const handleManualUrlApply = useCallback(() => {
    const trimmed = manualUrl.trim();
    if (trimmed) {
      onChange(trimmed);
    }
  }, [manualUrl, onChange]);

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Current image preview */}
      {value && (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Selected"
            className="h-24 w-auto max-w-[200px] rounded-md border object-cover"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
            aria-label="Remove image"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Asset picker grid */}
      {loadingAssets ? (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <p className="text-xs text-muted-foreground">Loading images...</p>
        </div>
      ) : filteredAssets.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Select from uploaded images
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => handleSelectAsset(asset)}
                className={cn(
                  "group relative aspect-video overflow-hidden rounded border-2 transition-all",
                  selectedAssetId === asset.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-muted hover:border-muted-foreground"
                )}
                title={asset.alt || "Select this image"}
              >
                {asset.publicUrl && (
                  <img
                    src={asset.publicUrl}
                    alt={asset.alt}
                    className="h-full w-full object-cover"
                  />
                )}
                {selectedAssetId === asset.id && (
                  <div className="absolute bottom-1 right-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Upload new image */}
      <div className="rounded-lg border border-dashed p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          {filteredAssets.length > 0 ? "Or upload a new image" : "Upload an image"}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor={`picker-alt-${label}`} className="text-xs">
              Alt text <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`picker-alt-${label}`}
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe this image"
              disabled={uploading}
              className="h-8 text-sm"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            disabled={uploading}
            className="text-xs file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleUpload}
            disabled={uploading}
            className="h-8"
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          JPEG, PNG, or WebP. Max {MAX_FILE_SIZE_MB}MB. Min 200x200px, max 4000x4000px.
        </p>
      </div>

      {/* Manual URL fallback */}
      {!showUrlInput ? (
        <button
          type="button"
          onClick={() => setShowUrlInput(true)}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Or enter image URL manually
        </button>
      ) : (
        <div className="flex gap-2">
          <Input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="h-8 text-sm"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleManualUrlApply}
            disabled={!manualUrl.trim()}
            className="h-8"
          >
            Apply
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowUrlInput(false)}
            className="h-8"
          >
            Cancel
          </Button>
        </div>
      )}

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
