"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventPageConfigV1, Section } from "@/schemas/event-page";

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

export default function PageEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getIdToken } = useAuthContext();
  const [pageData, setPageData] = useState<PageConfigResponse | null>(null);
  const [config, setConfig] = useState<EventPageConfigV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    async function fetchPageConfig() {
      try {
        const token = await getIdToken();
        if (!token) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/events/${params.id}/page-config`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch page configuration");
        }

        const data = await response.json();
        setPageData(data.data);
        setConfig(data.data.config);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load page config");
      } finally {
        setLoading(false);
      }
    }

    fetchPageConfig();
  }, [params.id, getIdToken]);

  const updateConfig = useCallback((updates: Partial<EventPageConfigV1>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
    setHasChanges(true);
  }, []);

  const updateTheme = useCallback((updates: Partial<EventPageConfigV1["theme"]>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, theme: { ...prev.theme, ...updates } };
    });
    setHasChanges(true);
  }, []);

  const updateHero = useCallback((updates: Partial<EventPageConfigV1["hero"]>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, hero: { ...prev.hero, ...updates } };
    });
    setHasChanges(true);
  }, []);

  const updateSection = useCallback((index: number, updates: Partial<Section>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const newSections = [...prev.sections];
      newSections[index] = { ...newSections[index], ...updates } as Section;
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!config || saving) return;

    setSaving(true);
    setError(null);

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/events/${params.id}/page-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          config,
          templateId: pageData?.templateId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save configuration");
      }

      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="space-y-4">
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10">
          <p className="text-sm text-destructive">{error}</p>
        </div>
        <Link href={`/dashboard/events/${params.id}`}>
          <Button variant="outline">Back to Event</Button>
        </Link>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/events/${params.id}`}>
            <Button variant="ghost" size="sm">
              ← Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Page Editor</h1>
          {hasChanges && (
            <span className="text-sm text-muted-foreground">(unsaved changes)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/events/${params.id}/page-preview`}>
            <Button variant="outline">Preview</Button>
          </Link>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Theme Section */}
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={config.theme.primaryColor}
                  onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                  className="h-10 w-16 cursor-pointer"
                />
                <Input
                  value={config.theme.primaryColor}
                  onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                  placeholder="#000000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="font">Font Pair</Label>
              <select
                id="font"
                value={config.theme.fontPair}
                onChange={(e) => updateTheme({ fontPair: e.target.value as "serif_sans" | "modern" | "classic" })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="modern">Modern</option>
                <option value="classic">Classic</option>
                <option value="serif_sans">Serif + Sans</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="heroTitle">Title</Label>
            <Input
              id="heroTitle"
              value={config.hero.title}
              onChange={(e) => updateHero({ title: e.target.value })}
              placeholder="Event title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroSubtitle">Subtitle</Label>
            <Input
              id="heroSubtitle"
              value={config.hero.subtitle || ""}
              onChange={(e) => updateHero({ subtitle: e.target.value || undefined })}
              placeholder="Optional subtitle"
            />
          </div>
          {pageData?.assets && pageData.assets.length > 0 && (
            <div className="space-y-2">
              <Label>Hero Image</Label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => updateHero({ heroImageAssetId: undefined })}
                  className={`aspect-video rounded border-2 p-2 text-xs ${
                    !config.hero.heroImageAssetId
                      ? "border-primary bg-primary/10"
                      : "border-muted"
                  }`}
                >
                  None
                </button>
                {pageData.assets
                  .filter((a) => a.kind === "HERO")
                  .map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => updateHero({ heroImageAssetId: asset.id })}
                      className={`aspect-video overflow-hidden rounded border-2 ${
                        config.hero.heroImageAssetId === asset.id
                          ? "border-primary"
                          : "border-muted"
                      }`}
                    >
                      {asset.publicUrl && (
                        <img
                          src={asset.publicUrl}
                          alt={asset.alt}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sections */}
      {config.sections.map((section, index) => (
        <Card key={`${section.type}-${index}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="capitalize">{section.type} Section</CardTitle>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={section.enabled}
                  onChange={(e) => updateSection(index, { enabled: e.target.checked })}
                  className="rounded"
                />
                Enabled
              </label>
            </div>
          </CardHeader>
          <CardContent>
            {section.type === "details" && section.enabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Date Text</Label>
                  <Input
                    value={section.data.dateText}
                    onChange={(e) =>
                      updateSection(index, {
                        data: { ...section.data, dateText: e.target.value },
                      })
                    }
                    placeholder="e.g., December 15, 2024 at 4:00 PM"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location Text</Label>
                  <Input
                    value={section.data.locationText}
                    onChange={(e) =>
                      updateSection(index, {
                        data: { ...section.data, locationText: e.target.value },
                      })
                    }
                    placeholder="e.g., Grand Ballroom, City Hotel"
                  />
                </div>
              </div>
            )}
            {section.type === "schedule" && section.enabled && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Schedule items: {section.data.items.length} items
                </p>
                <p className="text-xs text-muted-foreground">
                  (Advanced editing coming soon)
                </p>
              </div>
            )}
            {section.type === "faq" && section.enabled && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  FAQ items: {section.data.items.length} items
                </p>
                <p className="text-xs text-muted-foreground">
                  (Advanced editing coming soon)
                </p>
              </div>
            )}
            {section.type === "gallery" && section.enabled && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Gallery images: {section.data.assetIds.length} images
                </p>
                <p className="text-xs text-muted-foreground">
                  (Image selection coming soon)
                </p>
              </div>
            )}
            {!section.enabled && (
              <p className="text-sm text-muted-foreground">
                This section is disabled. Enable it to edit.
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Bottom actions */}
      <div className="flex justify-between pt-4">
        <Link href={`/dashboard/events/${params.id}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
