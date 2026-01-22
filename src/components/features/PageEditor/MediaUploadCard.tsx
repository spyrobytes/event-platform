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
import { cn } from "@/lib/utils";

type Asset = {
  id: string;
  kind: string;
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
  getIdToken,
  maxAssets = 20,
}: MediaUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedKind, setSelectedKind] = useState<"HERO" | "GALLERY">("HERO");
  const [altText, setAltText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const heroAssets = assets.filter((a) => a.kind === "HERO");
  const galleryAssets = assets.filter((a) => a.kind === "GALLERY");
  const isAtMaxAssets = assets.length >= maxAssets;

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
      formData.append("kind", selectedKind);
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

      // API returns { data: { id, publicUrl, width, height, kind } }
      const newAsset: Asset = {
        id: data.data.id,
        kind: data.data.kind,
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
  }, [selectedFile, altText, selectedKind, eventId, getIdToken, onAssetUploaded]);

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

          {/* Image type selection */}
          <div className="space-y-2">
            <Label htmlFor="imageKind">Image Type</Label>
            <select
              id="imageKind"
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value as "HERO" | "GALLERY")}
              disabled={uploading || isAtMaxAssets}
              className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="HERO">Hero Image (background for hero section)</option>
              <option value="GALLERY">Gallery Image (for photo gallery)</option>
            </select>
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
                <div
                  key={asset.id}
                  className="group relative aspect-video overflow-hidden rounded-lg border bg-muted"
                >
                  {asset.publicUrl && (
                    <img
                      src={asset.publicUrl}
                      alt={asset.alt || "Hero image"}
                      className="h-full w-full object-cover"
                    />
                  )}
                  {/* Delete button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                    <button
                      type="button"
                      onClick={() => handleDelete(asset.id)}
                      disabled={deleting === asset.id}
                      className={cn(
                        "rounded-full bg-red-500 p-2 text-white opacity-0 transition-all hover:bg-red-600 group-hover:opacity-100",
                        deleting === asset.id && "cursor-wait opacity-100"
                      )}
                      aria-label={`Delete ${asset.alt || "hero image"}`}
                    >
                      {deleting === asset.id ? (
                        <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <span className="text-lg leading-none">&times;</span>
                      )}
                    </button>
                  </div>
                </div>
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
                <div
                  key={asset.id}
                  className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                >
                  {asset.publicUrl && (
                    <img
                      src={asset.publicUrl}
                      alt={asset.alt || "Gallery image"}
                      className="h-full w-full object-cover"
                    />
                  )}
                  {/* Delete button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                    <button
                      type="button"
                      onClick={() => handleDelete(asset.id)}
                      disabled={deleting === asset.id}
                      className={cn(
                        "rounded-full bg-red-500 p-2 text-white opacity-0 transition-all hover:bg-red-600 group-hover:opacity-100",
                        deleting === asset.id && "cursor-wait opacity-100"
                      )}
                      aria-label={`Delete ${asset.alt || "gallery image"}`}
                    >
                      {deleting === asset.id ? (
                        <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <span className="text-lg leading-none">&times;</span>
                      )}
                    </button>
                  </div>
                </div>
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
    </Card>
  );
}
