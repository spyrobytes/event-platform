"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TemplateSelector,
  getTemplateInfo,
  WeddingVariantPicker,
  ScheduleEditor,
  FAQEditor,
  GalleryEditor,
  RSVPEditor,
  SpeakersEditor,
  SponsorsEditor,
  MapEditor,
  VersionHistory,
  PreviewShareCard,
  MediaUploadCard,
  StoryEditor,
  TravelStayEditor,
  WeddingPartyEditor,
  AttireEditor,
  ThingsToDoEditor,
} from "@/components/features";
import type {
  EventPageConfigV1,
  Section,
  ScheduleSection,
  FAQSection,
  GallerySection,
  RSVPSection,
  SpeakersSection,
  SponsorsSection,
  MapSection,
  StorySection,
  TravelStaySection,
  WeddingPartySection,
  AttireSection,
  ThingsToDoSection,
} from "@/schemas/event-page";

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
  const { getIdToken } = useAuthContext();
  const [pageData, setPageData] = useState<PageConfigResponse | null>(null);
  const [config, setConfig] = useState<EventPageConfigV1 | null>(null);
  const [templateId, setTemplateId] = useState<string>("wedding_v1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isPreviewingVersion, setIsPreviewingVersion] = useState(false);
  const [savedConfig, setSavedConfig] = useState<EventPageConfigV1 | null>(null);

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
        setTemplateId(data.data.templateId || "wedding_v1");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load page config");
      } finally {
        setLoading(false);
      }
    }

    fetchPageConfig();
  }, [params.id, getIdToken]);

  const handleTemplateChange = useCallback((newTemplateId: string) => {
    setTemplateId(newTemplateId);
    setHasChanges(true);
  }, []);

  const handleVariantChange = useCallback((newVariantId: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, variantId: newVariantId };
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

  const updateScheduleItems = useCallback(
    (index: number, items: ScheduleSection["data"]["items"]) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const newSections = [...prev.sections];
        const section = newSections[index] as ScheduleSection;
        newSections[index] = { ...section, data: { items } };
        return { ...prev, sections: newSections };
      });
      setHasChanges(true);
    },
    []
  );

  const updateFAQItems = useCallback(
    (index: number, items: FAQSection["data"]["items"]) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const newSections = [...prev.sections];
        const section = newSections[index] as FAQSection;
        newSections[index] = { ...section, data: { items } };
        return { ...prev, sections: newSections };
      });
      setHasChanges(true);
    },
    []
  );

  const updateGalleryData = useCallback(
    (index: number, data: GallerySection["data"]) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const newSections = [...prev.sections];
        const section = newSections[index] as GallerySection;
        newSections[index] = { ...section, data };
        return { ...prev, sections: newSections };
      });
      setHasChanges(true);
    },
    []
  );

  const updateRSVPData = useCallback(
    (index: number, data: RSVPSection["data"]) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const newSections = [...prev.sections];
        const section = newSections[index] as RSVPSection;
        newSections[index] = { ...section, data };
        return { ...prev, sections: newSections };
      });
      setHasChanges(true);
    },
    []
  );

  const updateSpeakersData = useCallback(
    (index: number, data: SpeakersSection["data"]) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const newSections = [...prev.sections];
        const section = newSections[index] as SpeakersSection;
        newSections[index] = { ...section, data };
        return { ...prev, sections: newSections };
      });
      setHasChanges(true);
    },
    []
  );

  const updateSponsorsData = useCallback(
    (index: number, data: SponsorsSection["data"]) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const newSections = [...prev.sections];
        const section = newSections[index] as SponsorsSection;
        newSections[index] = { ...section, data };
        return { ...prev, sections: newSections };
      });
      setHasChanges(true);
    },
    []
  );

  const updateMapData = useCallback(
    (index: number, data: MapSection["data"]) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const newSections = [...prev.sections];
        const section = newSections[index] as MapSection;
        newSections[index] = { ...section, data };
        return { ...prev, sections: newSections };
      });
      setHasChanges(true);
    },
    []
  );

  // Wedding-specific section update callbacks
  const updateStoryData = useCallback(
    (index: number, data: StorySection["data"]) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const newSections = [...prev.sections];
        const section = newSections[index] as StorySection;
        newSections[index] = { ...section, data };
        return { ...prev, sections: newSections };
      });
      setHasChanges(true);
    },
    []
  );

  const updateTravelStayData = useCallback(
    (index: number, data: TravelStaySection["data"]) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const newSections = [...prev.sections];
        const section = newSections[index] as TravelStaySection;
        newSections[index] = { ...section, data };
        return { ...prev, sections: newSections };
      });
      setHasChanges(true);
    },
    []
  );

  const updateWeddingPartyData = useCallback(
    (index: number, data: WeddingPartySection["data"]) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const newSections = [...prev.sections];
        const section = newSections[index] as WeddingPartySection;
        newSections[index] = { ...section, data };
        return { ...prev, sections: newSections };
      });
      setHasChanges(true);
    },
    []
  );

  const updateAttireData = useCallback(
    (index: number, data: AttireSection["data"]) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const newSections = [...prev.sections];
        const section = newSections[index] as AttireSection;
        newSections[index] = { ...section, data };
        return { ...prev, sections: newSections };
      });
      setHasChanges(true);
    },
    []
  );

  const updateThingsToDoData = useCallback(
    (index: number, data: ThingsToDoSection["data"]) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const newSections = [...prev.sections];
        const section = newSections[index] as ThingsToDoSection;
        newSections[index] = { ...section, data };
        return { ...prev, sections: newSections };
      });
      setHasChanges(true);
    },
    []
  );

  const addSection = useCallback(
    (type: Section["type"]) => {
      setConfig((prev) => {
        if (!prev) return prev;
        // Check if section already exists
        if (prev.sections.some((s) => s.type === type)) return prev;

        let newSection: Section;
        switch (type) {
          case "details":
            newSection = {
              type: "details",
              enabled: true,
              data: { dateText: "", locationText: "" },
            };
            break;
          case "schedule":
            newSection = {
              type: "schedule",
              enabled: true,
              data: { items: [] },
            };
            break;
          case "faq":
            newSection = {
              type: "faq",
              enabled: true,
              data: { items: [] },
            };
            break;
          case "gallery":
            newSection = {
              type: "gallery",
              enabled: true,
              data: { assetIds: [] },
            };
            break;
          case "rsvp":
            newSection = {
              type: "rsvp",
              enabled: true,
              data: {
                heading: "RSVP",
                showMaybeOption: true,
                allowPlusOnes: false,
                maxPlusOnes: 0,
              },
            };
            break;
          case "speakers":
            newSection = {
              type: "speakers",
              enabled: true,
              data: {
                heading: "Speakers",
                items: [],
              },
            };
            break;
          case "sponsors":
            newSection = {
              type: "sponsors",
              enabled: true,
              data: {
                heading: "Our Sponsors",
                showTiers: false,
                items: [],
              },
            };
            break;
          case "map":
            newSection = {
              type: "map",
              enabled: true,
              data: {
                heading: "Location",
                address: "",
                latitude: 0,
                longitude: 0,
                zoom: 15,
                showDirectionsLink: true,
              },
            };
            break;
          // Wedding-specific sections
          case "story":
            newSection = {
              type: "story",
              enabled: true,
              data: {
                heading: "Our Story",
                content: "",
                layout: "full",
              },
            };
            break;
          case "travelStay":
            newSection = {
              type: "travelStay",
              enabled: true,
              data: {
                heading: "Travel & Accommodations",
                hotels: [],
              },
            };
            break;
          case "weddingParty":
            newSection = {
              type: "weddingParty",
              enabled: true,
              data: {
                heading: "The Wedding Party",
                members: [],
              },
            };
            break;
          case "attire":
            newSection = {
              type: "attire",
              enabled: true,
              data: {
                heading: "Dress Code",
                dressCode: "",
              },
            };
            break;
          case "thingsToDo":
            newSection = {
              type: "thingsToDo",
              enabled: true,
              data: {
                heading: "Things To Do",
                items: [],
              },
            };
            break;
          default:
            return prev;
        }

        return { ...prev, sections: [...prev.sections, newSection] };
      });
      setHasChanges(true);
    },
    []
  );

  const removeSection = useCallback((index: number) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, sections: prev.sections.filter((_, i) => i !== index) };
    });
    setHasChanges(true);
  }, []);

  const handleVersionPreview = useCallback(
    (versionConfig: unknown) => {
      // Save current config if not already previewing
      if (!isPreviewingVersion && config) {
        setSavedConfig(config);
      }
      setConfig(versionConfig as EventPageConfigV1);
      setIsPreviewingVersion(true);
    },
    [config, isPreviewingVersion]
  );

  const handleCancelVersionPreview = useCallback(() => {
    if (savedConfig) {
      setConfig(savedConfig);
      setSavedConfig(null);
    }
    setIsPreviewingVersion(false);
  }, [savedConfig]);

  const handleVersionRollback = useCallback((versionConfig: unknown) => {
    setConfig(versionConfig as EventPageConfigV1);
    setSavedConfig(null);
    setIsPreviewingVersion(false);
    setHasChanges(true);
  }, []);

  const handleAssetUploaded = useCallback(
    (newAsset: {
      id: string;
      kind: string;
      publicUrl: string | null;
      width: number | null;
      height: number | null;
      alt: string;
    }) => {
      setPageData((prev) =>
        prev
          ? {
              ...prev,
              assets: [...prev.assets, newAsset],
            }
          : null
      );
    },
    []
  );

  const handleAssetDeleted = useCallback(
    (assetId: string) => {
      setPageData((prev) =>
        prev
          ? {
              ...prev,
              assets: prev.assets.filter((a) => a.id !== assetId),
            }
          : null
      );

      // Clean up config references
      setConfig((prev) => {
        if (!prev) return prev;
        const updatedHero =
          prev.hero.heroImageAssetId === assetId
            ? { ...prev.hero, heroImageAssetId: undefined }
            : prev.hero;
        const updatedSections = prev.sections.map((section) => {
          if (section.type === "gallery") {
            const newAssetIds = (section.data.assetIds || []).filter((id) => id !== assetId);
            const newItems = (section.data.items || []).filter((item) => item.assetId !== assetId);
            return {
              ...section,
              data: {
                ...section.data,
                assetIds: newAssetIds,
                items: newItems,
              },
            };
          }
          return section;
        });
        return { ...prev, hero: updatedHero, sections: updatedSections };
      });
      setHasChanges(true);
    },
    []
  );

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
          templateId,
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
          {isPreviewingVersion && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
              Previewing old version
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/events/${params.id}/page-preview`}>
            <Button variant="outline">Preview</Button>
          </Link>
          <Button onClick={handleSave} disabled={saving || !hasChanges || isPreviewingVersion}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Version History */}
      <VersionHistory
        eventId={params.id}
        onPreview={handleVersionPreview}
        onCancelPreview={handleCancelVersionPreview}
        onRollback={handleVersionRollback}
        isPreviewMode={isPreviewingVersion}
      />

      {/* Preview Sharing */}
      <PreviewShareCard eventId={params.id} getIdToken={getIdToken} />

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Template</CardTitle>
          <CardDescription>
            Choose a visual style for your event page. Current: {getTemplateInfo(templateId)?.name || templateId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateSelector
            value={templateId}
            onChange={handleTemplateChange}
            disabled={saving}
            size="normal"
          />
        </CardContent>
      </Card>

      {/* Wedding Variant Selection - Only show for wedding templates */}
      {templateId === "wedding_v1" && config && (
        <Card>
          <CardHeader>
            <CardTitle>Wedding Style</CardTitle>
            <CardDescription>
              Choose a design variant that matches your celebration style
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WeddingVariantPicker
              value={config.variantId || "classic"}
              onChange={handleVariantChange}
              disabled={saving}
              size="normal"
            />
          </CardContent>
        </Card>
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
          {/* Hero Image Selection */}
          <div className="space-y-2">
            <Label>Hero Image</Label>
            <p className="text-xs text-muted-foreground">
              {pageData?.assets?.filter((a) => a.kind === "HERO").length
                ? "Click an image to select it as your hero background"
                : "Upload a hero image in the Media Library below to use it here"}
            </p>
            {pageData?.assets?.filter((a) => a.kind === "HERO").length ? (
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => updateHero({ heroImageAssetId: undefined })}
                  className={`aspect-video rounded border-2 p-2 transition-all ${
                    !config.hero.heroImageAssetId
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-muted hover:border-muted-foreground"
                  }`}
                  title={config.hero.heroImageAssetId ? "Clear selection" : "No image selected"}
                >
                  <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px]">{config.hero.heroImageAssetId ? "Clear" : "No Image"}</span>
                  </div>
                </button>
                {pageData.assets
                  .filter((a) => a.kind === "HERO")
                  .map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => updateHero({ heroImageAssetId: asset.id })}
                      className={`group relative aspect-video overflow-hidden rounded border-2 transition-all ${
                        config.hero.heroImageAssetId === asset.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-muted hover:border-muted-foreground"
                      }`}
                      title={asset.alt || "Select this hero image"}
                    >
                      {asset.publicUrl && (
                        <img
                          src={asset.publicUrl}
                          alt={asset.alt}
                          className="h-full w-full object-cover"
                        />
                      )}
                      {/* Selected indicator */}
                      {config.hero.heroImageAssetId === asset.id && (
                        <div className="absolute bottom-1 right-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No hero images uploaded yet
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Media Library */}
      <MediaUploadCard
        eventId={params.id}
        assets={pageData?.assets || []}
        onAssetUploaded={handleAssetUploaded}
        onAssetDeleted={handleAssetDeleted}
        getIdToken={getIdToken}
      />

      {/* Sections */}
      {config.sections.map((section, index) => (
        <Card key={`${section.type}-${index}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="capitalize">{section.type} Section</CardTitle>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={(e) => updateSection(index, { enabled: e.target.checked })}
                    className="rounded"
                  />
                  Enabled
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSection(index)}
                  className="text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
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
              <ScheduleEditor
                items={section.data.items}
                onChange={(items) => updateScheduleItems(index, items)}
              />
            )}
            {section.type === "faq" && section.enabled && (
              <FAQEditor
                items={section.data.items}
                onChange={(items) => updateFAQItems(index, items)}
              />
            )}
            {section.type === "gallery" && section.enabled && (
              <GalleryEditor
                data={section.data}
                assets={pageData?.assets || []}
                onChange={(data) => updateGalleryData(index, data)}
              />
            )}
            {section.type === "rsvp" && section.enabled && (
              <RSVPEditor
                data={section.data}
                onChange={(data) => updateRSVPData(index, data)}
              />
            )}
            {section.type === "speakers" && section.enabled && (
              <SpeakersEditor
                data={section.data}
                assets={pageData?.assets || []}
                onChange={(data) => updateSpeakersData(index, data)}
              />
            )}
            {section.type === "sponsors" && section.enabled && (
              <SponsorsEditor
                data={section.data}
                assets={pageData?.assets || []}
                onChange={(data) => updateSponsorsData(index, data)}
              />
            )}
            {section.type === "map" && section.enabled && (
              <MapEditor
                data={section.data}
                onChange={(data) => updateMapData(index, data)}
              />
            )}
            {/* Wedding-specific section editors */}
            {section.type === "story" && section.enabled && (
              <StoryEditor
                data={section.data}
                assets={pageData?.assets || []}
                onChange={(data) => updateStoryData(index, data)}
              />
            )}
            {section.type === "travelStay" && section.enabled && (
              <TravelStayEditor
                data={section.data}
                onChange={(data) => updateTravelStayData(index, data)}
              />
            )}
            {section.type === "weddingParty" && section.enabled && (
              <WeddingPartyEditor
                data={section.data}
                assets={pageData?.assets || []}
                onChange={(data) => updateWeddingPartyData(index, data)}
              />
            )}
            {section.type === "attire" && section.enabled && (
              <AttireEditor
                data={section.data}
                onChange={(data) => updateAttireData(index, data)}
              />
            )}
            {section.type === "thingsToDo" && section.enabled && (
              <ThingsToDoEditor
                data={section.data}
                onChange={(data) => updateThingsToDoData(index, data)}
              />
            )}
            {!section.enabled && (
              <p className="text-sm text-muted-foreground">
                This section is disabled. Enable it to edit.
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Add Section */}
      <Card>
        <CardHeader>
          <CardTitle>Add Section</CardTitle>
          <CardDescription>
            Add additional sections to your event page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {!config.sections.some((s) => s.type === "details") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("details")}
              >
                + Details
              </Button>
            )}
            {!config.sections.some((s) => s.type === "schedule") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("schedule")}
              >
                + Schedule
              </Button>
            )}
            {!config.sections.some((s) => s.type === "faq") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("faq")}
              >
                + FAQ
              </Button>
            )}
            {!config.sections.some((s) => s.type === "gallery") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("gallery")}
              >
                + Gallery
              </Button>
            )}
            {!config.sections.some((s) => s.type === "rsvp") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("rsvp")}
              >
                + RSVP
              </Button>
            )}
            {!config.sections.some((s) => s.type === "speakers") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("speakers")}
              >
                + Speakers
              </Button>
            )}
            {!config.sections.some((s) => s.type === "sponsors") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("sponsors")}
              >
                + Sponsors
              </Button>
            )}
            {!config.sections.some((s) => s.type === "map") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("map")}
              >
                + Map
              </Button>
            )}
            {/* Wedding-specific sections - only show for wedding template */}
            {templateId === "wedding_v1" && (
              <>
                {!config.sections.some((s) => s.type === "story") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection("story")}
                  >
                    + Our Story
                  </Button>
                )}
                {!config.sections.some((s) => s.type === "travelStay") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection("travelStay")}
                  >
                    + Travel & Stay
                  </Button>
                )}
                {!config.sections.some((s) => s.type === "weddingParty") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection("weddingParty")}
                  >
                    + Wedding Party
                  </Button>
                )}
                {!config.sections.some((s) => s.type === "attire") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection("attire")}
                  >
                    + Dress Code
                  </Button>
                )}
                {!config.sections.some((s) => s.type === "thingsToDo") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection("thingsToDo")}
                  >
                    + Things To Do
                  </Button>
                )}
              </>
            )}
            {config.sections.length >= 12 && (
              <p className="text-sm text-muted-foreground">
                All section types have been added.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

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
