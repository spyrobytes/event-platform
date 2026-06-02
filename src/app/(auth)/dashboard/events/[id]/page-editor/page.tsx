"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { useIntersectionObserver, useUnsavedChangesGuard } from "@/hooks";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TemplateSelector,
  getTemplateInfo,
  WeddingVariantPicker,
  V2VariantPicker,
  V2AccentSwatches,
  SectionThemePicker,
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
  PreludeEditor,
  StoryEditor,
  TravelStayEditor,
  WeddingPartyEditor,
  AttireEditor,
  ThingsToDoEditor,
  RegistryEditor,
  WishesEditor,
  LivestreamEditor,
  SocialLinksEditor,
  PageEditorNav,
  type PageEditorNavBadge,
  type PageEditorNavGroup,
} from "@/components/features";
import { getV2Variant } from "@/components/templates/wedding-v2/variants";
import { getV3Definition } from "@/components/templates/wedding-v3";
import { templateSupportsSocialLinks, templateSupportsPrelude } from "@/components/templates";
import { cn } from "@/lib/utils";
import { getDefaultVisibility, getEffectiveVisibility, getSectionLabel } from "@/lib/guest-access";
import { stripAssetRefsFromConfig } from "@/lib/media-asset-refs";
import {
  getTemplateFamily,
  DEFAULT_NAV_SHOW,
  resolveNavLabel,
} from "@/lib/section-nav-defaults";
import { isAccessibleColor, PAGE_CONFIG_LIMITS } from "@/schemas/event-page";
import type { SectionVisibility } from "@/schemas/event-page";
import { DEFAULT_PRELUDE } from "@/schemas/event-page";
import type {
  EventPageConfigV1,
  Section,
  ChromeConfig,
  SocialLink,
  Prelude,
} from "@/schemas/event-page";

const GENERIC_SECTIONS: Section["type"][] = [
  "details", "schedule", "faq", "gallery", "rsvp", "speakers", "sponsors", "map", "livestream",
];
const WEDDING_SECTIONS: Section["type"][] = [
  ...GENERIC_SECTIONS, "story", "travelStay", "weddingParty", "attire", "thingsToDo",
];

const V3_WEDDING_SECTIONS: Section["type"][] = [...WEDDING_SECTIONS, "registry", "wishes"];

const TEMPLATE_SUPPORTED_SECTIONS: Record<string, Set<Section["type"]>> = {
  wedding_v1: new Set(WEDDING_SECTIONS),
  wedding_v2: new Set([...WEDDING_SECTIONS, "registry", "wishes"]),
  wedding_editorial: new Set(V3_WEDDING_SECTIONS),
  wedding_intimate_note: new Set(V3_WEDDING_SECTIONS),
  wedding_fine_art: new Set(V3_WEDDING_SECTIONS),
  wedding_garden_house: new Set(V3_WEDDING_SECTIONS),
  wedding_grand_luxe: new Set(V3_WEDDING_SECTIONS),
  wedding_celebration: new Set(V3_WEDDING_SECTIONS),
  conference_v1: new Set(GENERIC_SECTIONS),
  party_v1: new Set(GENERIC_SECTIONS),
};

type PageConfigResponse = {
  config: EventPageConfigV1;
  templateId: string;
  isPublished: boolean;
  publishedAt: string | null;
  assets: Array<{
    id: string;
    kind: string;
    tags: string[];
    publicUrl: string | null;
    width: number | null;
    height: number | null;
    alt: string;
  }>;
  event?: EventPrefill;
};

type EventPrefill = {
  venueName: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  timezone: string;
};

// Builds the default map section, prefilling venueName + formattedAddress
// from the Event row on first add (D2: one-way, on first add). After
// creation the section is independent; publish does not write back to Event.
// TODO(phase-3): naive comma-join is fine for NA addresses; LocationIQ will
// return provider-formatted addresses with proper i18n.
function buildDefaultMapSection(event: EventPrefill | null): Section {
  const parts = [event?.address, event?.city, event?.country].filter(
    (p): p is string => Boolean(p?.trim())
  );
  return {
    type: "map",
    enabled: true,
    visibility: "public",
    data: {
      heading: "Location",
      venueName: event?.venueName ?? undefined,
      formattedAddress: parts.length > 0 ? parts.join(", ") : undefined,
      zoom: 15,
      showDirectionsLink: true,
    },
  };
}

// Amber tip line shown beneath asset selectors (hero image, couple photo).
// Renders nothing when `tip` is empty so callers can pass an optional
// definition field directly without their own truthiness check.
function EditorTip({ tip }: { tip: string | undefined }) {
  if (!tip) return null;
  return (
    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
      <svg
        className="h-3.5 w-3.5 mt-0.5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      <span>{tip}</span>
    </p>
  );
}

export default function PageEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
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
  const [viewAs, setViewAs] = useState<"organizer" | "public" | "guest">("organizer");
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [activeNavId, setActiveNavId] = useState<string | null>(null);

  const { requestLeave, discardDialogProps } = useUnsavedChangesGuard({
    isDirty: hasChanges,
    redirectTo: `/dashboard/events/${params.id}`,
  });

  // Hide the floating nav trigger while the editor header (with Back / Preview
  // / Save inline) is in view — at ≤880px the container fills the viewport and
  // the floating button collides with Save Changes. rootMargin -72px aligns the
  // "out of view" point with the button's own top position.
  const {
    ref: editorHeaderRef,
    isVisible: editorHeaderInView,
    hasBeenVisible: editorHeaderSeen,
  } = useIntersectionObserver({ rootMargin: "-72px 0px 0px 0px" });

  // Section card refs, keyed by current index — used to scroll a moved card into view.
  const sectionRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

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
    if (config) {
      const supported = TEMPLATE_SUPPORTED_SECTIONS[newTemplateId];
      if (supported) {
        const orphaned = config.sections.filter(
          (s) => s.enabled && !supported.has(s.type)
        );
        if (orphaned.length > 0) {
          const names = orphaned.map((s) => getSectionLabel(s.type)).join(", ");
          const confirmed = window.confirm(
            `The "${newTemplateId}" template does not render these sections: ${names}.\n\nSwitch anyway? (Sections will be preserved but won't appear on the published page.)`
          );
          if (!confirmed) return;
        }
      }
    }
    setTemplateId(newTemplateId);
    // A section theme is template-specific; drop a stale id when switching
    // templates so it can't linger in saved config (the new template won't
    // define it). Only touch config when there's something to clear.
    setConfig((prev) =>
      prev?.theme.sectionThemeId
        ? { ...prev, theme: { ...prev.theme, sectionThemeId: undefined } }
        : prev,
    );
    setHasChanges(true);
  }, [config]);

  const handleVariantChange = useCallback((newVariantId: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, variantId: newVariantId };
    });
    setHasChanges(true);
  }, []);

  const handleV2VariantChange = useCallback((newVariantId: string) => {
    const variant = getV2Variant(newVariantId);
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        variantId: newVariantId,
        theme: {
          ...prev.theme,
          fontPair: variant.fontPair,
          primaryColor: variant.accentSwatches[0]?.hex || prev.theme.primaryColor,
          // V2 variants have no section themes; clear any stale selection.
          sectionThemeId: undefined,
        },
        chrome: {
          topbar: variant.chromeDefaults.topbar,
          scrollProgress: variant.chromeDefaults.scrollProgress,
          mountainDividers: variant.chromeDefaults.mountainDividers,
          footerSkyline: variant.chromeDefaults.footerSkyline,
          botanicals: variant.chromeDefaults.botanicals,
        },
      };
    });
    setHasChanges(true);
  }, []);

  const handleV2VariantClear = useCallback(() => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        variantId: undefined,
        chrome: undefined,
      };
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

  const updatePrelude = useCallback((updates: Partial<Prelude>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const current = prev.prelude ?? DEFAULT_PRELUDE;
      return { ...prev, prelude: { ...current, ...updates } };
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

  const updateSectionData = useCallback(
    (index: number, data: Section["data"]) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const newSections = [...prev.sections];
        newSections[index] = { ...newSections[index], data } as Section;
        return { ...prev, sections: newSections };
      });
      setHasChanges(true);
    },
    []
  );

  const updateChrome = useCallback((updates: Partial<ChromeConfig>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, chrome: { ...prev.chrome, ...updates } };
    });
    setHasChanges(true);
  }, []);

  const updateSocialLinks = useCallback((socialLinks: SocialLink[] | undefined) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, socialLinks };
    });
    setHasChanges(true);
  }, []);

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
              visibility: "public",
              data: { dateText: "", locationText: "" },
            };
            break;
          case "schedule":
            newSection = {
              type: "schedule",
              enabled: true,
              visibility: "public",
              data: { items: [] },
            };
            break;
          case "faq":
            newSection = {
              type: "faq",
              enabled: true,
              visibility: "public",
              data: { items: [] },
            };
            break;
          case "gallery":
            newSection = {
              type: "gallery",
              enabled: true,
              visibility: "public",
              data: { items: [] },
            };
            break;
          case "rsvp":
            newSection = {
              type: "rsvp",
              enabled: true,
              visibility: "public",
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
              visibility: "public",
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
              visibility: "public",
              data: {
                heading: "Our Sponsors",
                showTiers: false,
                items: [],
              },
            };
            break;
          case "map":
            newSection = buildDefaultMapSection(pageData?.event ?? null);
            break;
          // Wedding-specific sections
          case "story":
            newSection = {
              type: "story",
              enabled: true,
              visibility: "public",
              data: {
                heading: "Our Story",
                content: "Share your story here... Tell your guests about your journey together.",
                layout: "full",
              },
            };
            break;
          case "travelStay":
            newSection = {
              type: "travelStay",
              enabled: true,
              visibility: "public",
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
              visibility: "public",
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
              visibility: "public",
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
              visibility: "public",
              data: {
                heading: "Things To Do",
                items: [],
              },
            };
            break;
          case "registry":
            newSection = {
              type: "registry",
              enabled: true,
              visibility: "public",
              data: {
                heading: "Gift Registry",
                items: [],
              },
            };
            break;
          case "wishes":
            newSection = {
              type: "wishes",
              enabled: true,
              visibility: "guests",
              data: {
                heading: "Wedding Wishes",
                previewCount: 3,
                enableSubmissions: true,
              },
            };
            break;
          case "livestream":
            newSection = {
              type: "livestream",
              enabled: true,
              visibility: "guests",
              data: {
                heading: "Live Stream",
                ctaLabel: "Watch live",
                showCountdown: true,
                useNocookie: true,
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
    // `pageData?.event` is the object ref — it churns on refetch, but addSection
    // is only invoked from onClick handlers, so the identity change is harmless.
    [pageData?.event]
  );

  const removeSection = useCallback((index: number) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, sections: prev.sections.filter((_, i) => i !== index) };
    });
    setHasChanges(true);
  }, []);

  const moveSection = useCallback((index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    setConfig((prev) => {
      if (!prev) return prev;
      if (newIndex < 0 || newIndex >= prev.sections.length) return prev;
      const next = [...prev.sections];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return { ...prev, sections: next };
    });
    setHasChanges(true);
    // After React commits, scroll the moved card into view (it now lives at newIndex).
    // Out-of-bounds is harmless: the ref lookup returns undefined and ?. no-ops.
    requestAnimationFrame(() => {
      sectionRefs.current.get(newIndex)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
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
      tags: string[];
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

  const handleAssetUpdated = useCallback(
    (updatedAsset: {
      id: string;
      kind: string;
      tags: string[];
      publicUrl: string | null;
      width: number | null;
      height: number | null;
      alt: string;
    }) => {
      setPageData((prev) =>
        prev
          ? {
              ...prev,
              assets: prev.assets.map((a) =>
                a.id === updatedAsset.id ? updatedAsset : a
              ),
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

      // Clean up every reference to this asset across the config. The server
      // does the same cleanup transactionally in DELETE /api/events/[id]/media,
      // so this is purely for instant visual feedback — after the next fetch
      // the two states are guaranteed to agree.
      setConfig((prev) => (prev ? stripAssetRefsFromConfig(prev, assetId) : prev));
      setHasChanges(true);
    },
    []
  );

  const handleSave = async (): Promise<boolean> => {
    if (!config || saving) return false;

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
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Preview navigation gates on dirty state — same pattern as the invitation
  // editor (see invitation/page.tsx). The preview page reads pageConfig from
  // the DB, so navigating away with unsaved edits silently drops them from
  // view (and from in-memory state on remount).
  const openPreview = useCallback(() => {
    router.push(`/dashboard/events/${params.id}/page-preview`);
  }, [router, params.id]);

  // Nav drawer: build groups dynamically from the current template + sections.
  // Badges reflect per-section state (disabled / hidden-for-viewAs / orphaned),
  // so the drawer doubles as a quick status overview.
  const navGroups = useMemo<PageEditorNavGroup[]>(() => {
    if (!config) return [];

    const setupItems: PageEditorNavGroup["items"] = [
      { id: "pe-template", label: "Template" },
    ];
    if (templateId === "wedding_v1") {
      setupItems.push({ id: "pe-wedding-style", label: "Wedding Style" });
    }
    if (templateId === "wedding_v2") {
      setupItems.push({ id: "pe-color-mode", label: "Color Mode" });
      setupItems.push({ id: "pe-chrome", label: "Cinematic Chrome" });
    }
    const v3 = getV3Definition(templateId);
    if (v3 && v3.accentSwatches.length > 0) {
      setupItems.push({ id: "pe-accent", label: "Accent Color" });
    }
    if (templateSupportsSocialLinks(templateId)) {
      setupItems.push({ id: "pe-social-links", label: "Social Links" });
    }
    if (!(templateId === "wedding_v2" && config.variantId)) {
      setupItems.push({ id: "pe-theme", label: "Theme" });
    }
    setupItems.push({ id: "pe-hero", label: "Hero Section" });
    if (templateSupportsPrelude(templateId)) {
      setupItems.push({ id: "pe-prelude", label: "Prelude" });
    }
    setupItems.push({ id: "pe-media", label: "Media Library" });

    const supportedSet = TEMPLATE_SUPPORTED_SECTIONS[templateId];
    const sectionItems = config.sections.map((s) => {
      const badges: PageEditorNavBadge[] = [];
      if (!s.enabled) badges.push("disabled");
      if (supportedSet && !supportedSet.has(s.type)) badges.push("orphaned");
      if (viewAs !== "organizer" && s.enabled) {
        const effectiveVis = getEffectiveVisibility(s);
        const hiddenForView =
          effectiveVis === "hidden" ||
          (effectiveVis === "guests" && viewAs === "public");
        if (hiddenForView) badges.push("hidden");
      }
      return {
        id: `pe-section-${s.type}`,
        label: getSectionLabel(s.type),
        badges: badges.length > 0 ? badges : undefined,
      };
    });

    return [
      { label: "Setup", items: setupItems },
      { label: "Sections", items: sectionItems },
      { label: "Add", items: [{ id: "pe-add-section", label: "Add Section" }] },
    ];
  }, [config, templateId, viewAs]);

  // Key derived from anchor structure (not badges/content). The observer only
  // needs to re-attach when the *set* of anchor ids changes — typing in a
  // field churns `config` identity but not this key.
  const navAnchorsKey = useMemo(() => {
    if (!config) return "";
    const v2VariantPicked =
      templateId === "wedding_v2" && config.variantId ? "1" : "0";
    return `${templateId}|${v2VariantPicked}|${config.sections.map((s) => s.type).join(",")}`;
  }, [config, templateId]);

  useEffect(() => {
    if (!navAnchorsKey) return;
    const ids: string[] = [];
    navGroups.forEach((g) => g.items.forEach((it) => ids.push(it.id)));
    if (ids.length === 0) return;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const intersecting = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) intersecting.add(entry.target.id);
          else intersecting.delete(entry.target.id);
        });
        // Active = first id in document order that's intersecting
        const active = ids.find((id) => intersecting.has(id)) ?? null;
        setActiveNavId(active);
      },
      // Top inset accounts for the 56px sticky auth header; bottom inset keeps
      // the active card the one in the upper half of the viewport.
      { rootMargin: "-72px 0px -55% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // navGroups is referenced only to enumerate ids; navAnchorsKey gates re-runs
    // on structural changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navAnchorsKey]);

  const handlePreview = () => {
    if (hasChanges) {
      setShowPreviewDialog(true);
    } else {
      openPreview();
    }
  };

  const handleSaveAndPreview = async () => {
    setShowPreviewDialog(false);
    const saved = await handleSave();
    if (saved) {
      openPreview();
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

  // Which section types the current template supports (drives "Add Section" buttons)
  const supported = TEMPLATE_SUPPORTED_SECTIONS[templateId] ?? new Set(GENERIC_SECTIONS);

  return (
    <div>
      {/* Page content — marked inert while the section-nav drawer is open so
          keyboard users can't shift-tab out of the drawer into the cards
          behind the backdrop. The floating trigger and the drawer itself
          sit as siblings outside this wrapper. */}
      <div className="space-y-6" inert={isNavOpen || undefined}>
        {/* Header */}
        <div ref={editorHeaderRef} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={requestLeave}>
            ← Back
          </Button>
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
          {/* View As toggle */}
          <div className="flex items-center rounded-lg border border-input bg-background p-0.5 text-xs">
            {(["organizer", "public", "guest"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewAs(mode)}
                className={`rounded-md px-3 py-1.5 font-medium capitalize transition-colors ${
                  viewAs === mode
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === "organizer" ? "All" : mode === "public" ? "Public" : "Guest"}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={handlePreview}>
            Preview
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges || isPreviewingVersion}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* View As info banner */}
      {viewAs !== "organizer" && (
        <div className="rounded-lg border border-info/50 bg-info/10 px-4 py-2 text-sm text-info">
          Viewing as <strong>{viewAs === "public" ? "public visitor" : "invited guest"}</strong>
          {" — "}
          {viewAs === "public"
            ? "sections marked \"guests only\" or \"hidden\" are dimmed."
            : "only \"hidden\" sections are dimmed."}
        </div>
      )}

      {/* Version History */}
      <VersionHistory
        eventId={params.id}
        getIdToken={getIdToken}
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
      <Card id="pe-template" className="scroll-mt-20">
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
        <Card id="pe-wedding-style" className="scroll-mt-20">
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

      {/* V2 Design Variant Selection - Only show for wedding_v2 */}
      {templateId === "wedding_v2" && config && (
        <Card id="pe-color-mode" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Color Mode</CardTitle>
            <CardDescription>
              Choose a dark skin for a dramatic evening aesthetic, or keep the original light mode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <V2VariantPicker
              value={config.variantId}
              onChange={handleV2VariantChange}
              onClear={handleV2VariantClear}
              disabled={saving}
              accentColor={config.theme.primaryColor}
              onAccentChange={(hex) => updateTheme({ primaryColor: hex })}
            />
          </CardContent>
        </Card>
      )}

      {/* V2 Chrome Toggles - Only show for wedding_v2 */}
      {templateId === "wedding_v2" && config && (
        <Card id="pe-chrome" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Cinematic Chrome</CardTitle>
            <CardDescription>
              Toggle the premium visual elements unique to the cinematic template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { key: "topbar" as const, label: "Fixed Topbar", desc: "Shows monogram and couple names" },
                { key: "scrollProgress" as const, label: "Scroll Progress Bar", desc: "Thin accent bar at the top" },
                { key: "mountainDividers" as const, label: "Mountain Dividers", desc: "SVG mountain range between sections" },
                { key: "footerSkyline" as const, label: "Footer Skyline", desc: "Mountain skyline above the footer" },
                { key: "botanicals" as const, label: "Botanical Accents", desc: "Decorative leaf flourishes on sections" },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={config.chrome?.[key] ?? true}
                    onChange={(e) => updateChrome({ [key]: e.target.checked })}
                    className="mt-1 rounded"
                  />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* V3 Accent Swatches — show for V3 wedding templates */}
      {config && (() => {
        const v3Def = getV3Definition(templateId);
        if (!v3Def || v3Def.accentSwatches.length === 0) return null;
        return (
          <Card id="pe-accent" className="scroll-mt-20">
            <CardHeader>
              <CardTitle>Accent Color</CardTitle>
              <CardDescription>
                Choose a curated accent color for your {v3Def.displayName} template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <V2AccentSwatches
                swatches={v3Def.accentSwatches}
                value={config.theme.primaryColor}
                onChange={(hex) => updateTheme({ primaryColor: hex })}
                disabled={saving}
              />
            </CardContent>
          </Card>
        );
      })()}

      {/* V3 Section Theme — show for V3 templates that define section themes */}
      {config && (() => {
        const v3Def = getV3Definition(templateId);
        if (!v3Def?.sectionThemes?.length) return null;
        return (
          <Card id="pe-section-theme" className="scroll-mt-20">
            <CardHeader>
              <CardTitle>Section Theme</CardTitle>
              <CardDescription>
                Recolor the nav, hero cards, countdown, RSVP, schedule, and
                footer of your {v3Def.displayName} page as a set. The default
                keeps the template&apos;s signature look.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SectionThemePicker
                themes={v3Def.sectionThemes}
                // The unthemed/default option (e.g. "Light"), described by the
                // definition. Its swatch shows the default's signature surface;
                // the picker's checkmark adapts its contrast.
                classicLabel={v3Def.defaultSectionTheme?.label ?? "Default"}
                classicSwatch={v3Def.defaultSectionTheme?.swatch ?? "#ffffff"}
                value={config.theme.sectionThemeId}
                onChange={(id) => updateTheme({ sectionThemeId: id })}
                disabled={saving}
              />
            </CardContent>
          </Card>
        );
      })()}

      {/* Social Links — only for templates that opt in (Premium feature) */}
      {config && templateSupportsSocialLinks(templateId) && (
        <Card id="pe-social-links" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Social Links</CardTitle>
            <CardDescription>
              Show icon links to your social profiles in the footer of your
              wedding page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SocialLinksEditor
              value={config.socialLinks}
              onChange={updateSocialLinks}
            />
          </CardContent>
        </Card>
      )}

      {/* Theme Section — hidden when a V2 variant is selected (variant controls theme) */}
      {!(templateId === "wedding_v2" && config.variantId) && (
        <Card id="pe-theme" className="scroll-mt-20">
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
                {config.theme.primaryColor && /^#[0-9A-Fa-f]{6}$/.test(config.theme.primaryColor) && !isAccessibleColor(config.theme.primaryColor) && (
                  <p className="text-xs text-amber-600">
                    This color may have poor contrast against white backgrounds (WCAG 4.5:1 required)
                  </p>
                )}
              </div>
              {/* Font Pair — hidden for V3 templates (font is part of curated design) */}
              {!templateId.startsWith("wedding_") || ["wedding_v1", "wedding_v2"].includes(templateId) ? (
                <div className="space-y-2">
                  <Label htmlFor="font">Font Pair</Label>
                  <Select
                    id="font"
                    value={config.theme.fontPair}
                    onChange={(e) => updateTheme({ fontPair: e.target.value as "serif_sans" | "modern" | "classic" })}
                  >
                    <option value="modern">Modern (DM Sans)</option>
                    <option value="classic">Classic (Playfair Display + Source Serif)</option>
                    <option value="serif_sans">Serif + Sans (Cormorant Garamond + DM Sans)</option>
                  </Select>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hero Section */}
      <Card id="pe-hero" className="scroll-mt-20">
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
          {/* V2 Cinematic Hero Fields */}
          {templateId === "wedding_v2" && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium">Cinematic Hero Options</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="coupleNames">Couple Names</Label>
                  <Input
                    id="coupleNames"
                    value={config.hero.coupleNames || ""}
                    onChange={(e) => updateHero({ coupleNames: e.target.value || undefined })}
                    placeholder="e.g., Sarah & Michael"
                    maxLength={60}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monogram">Monogram</Label>
                  <Input
                    id="monogram"
                    value={config.hero.monogram || ""}
                    onChange={(e) => updateHero({ monogram: e.target.value || undefined })}
                    placeholder="e.g., S&M"
                    maxLength={5}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Hero Style</Label>
                  <Select
                    value={config.hero.style || "standard"}
                    onChange={(e) => updateHero({ style: e.target.value as "standard" | "cinematic" })}
                  >
                    <option value="standard">Standard</option>
                    <option value="cinematic">Cinematic (Full Viewport)</option>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.hero.showCountdown || false}
                    onChange={(e) => updateHero({ showCountdown: e.target.checked })}
                    className="rounded"
                  />
                  Show Countdown
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.hero.showScheduleCards || false}
                    onChange={(e) => updateHero({ showScheduleCards: e.target.checked })}
                    className="rounded"
                  />
                  Show Schedule Cards
                </label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rsvpDeadline">RSVP Deadline (shown on countdown card)</Label>
                <Input
                  id="rsvpDeadline"
                  value={config.hero.rsvpDeadline || ""}
                  onChange={(e) => updateHero({ rsvpDeadline: e.target.value || undefined })}
                  placeholder="e.g., August 10, 2026"
                  maxLength={60}
                />
              </div>
            </div>
          )}

          {/* Hero Image Selection */}
          <div className="space-y-2">
            <Label>Hero Image</Label>
            <p className="text-xs text-muted-foreground">
              {pageData?.assets?.filter((a) => a.tags?.includes("hero")).length
                ? "Click an image to select it as your hero background"
                : "Upload a hero image in the Media Library below to use it here"}
            </p>
            <EditorTip
              tip={
                getV3Definition(templateId)?.heroImageTip ??
                (templateId === "wedding_v2" && config?.variantId
                  ? getV2Variant(config.variantId)?.heroImageTip
                  : undefined)
              }
            />
            {pageData?.assets?.filter((a) => a.tags?.includes("hero")).length ? (
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
                  .filter((a) => a.tags?.includes("hero"))
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

          {/* Couple Photo Selection — cinematic + grand luxe templates */}
          {(templateId === "wedding_v2" || templateId === "wedding_grand_luxe" || templateId === "wedding_celebration") && (
            <div className="space-y-2 pt-4 border-t">
              <Label>Couple Photo <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
              <p className="text-xs text-muted-foreground">
                A portrait photo that floats over the hero background. Works best with a close-up of the couple.
              </p>
              <EditorTip tip={getV3Definition(templateId)?.couplePhotoTip} />
              {pageData?.assets?.filter((a) => a.tags?.includes("hero")).length ? (
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => updateHero({ couplePhotoAssetId: undefined })}
                    className={`h-16 w-16 rounded-full border-2 p-1 transition-all ${
                      !config.hero.couplePhotoAssetId
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-muted hover:border-muted-foreground"
                    }`}
                    title={config.hero.couplePhotoAssetId ? "Clear couple photo" : "No couple photo"}
                  >
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <span className="text-[9px]">None</span>
                    </div>
                  </button>
                  {pageData.assets.filter((a) => a.tags?.includes("couple")).map((asset) => {
                    const isSelected = config.hero.couplePhotoAssetId === asset.id;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => updateHero({ couplePhotoAssetId: asset.id })}
                        aria-pressed={isSelected}
                        className={`group relative h-16 w-16 overflow-hidden rounded-full border-2 transition-all ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-muted hover:border-muted-foreground"
                        }`}
                        title={asset.alt || "Select as couple photo"}
                      >
                        {asset.publicUrl && (
                          <img
                            src={asset.publicUrl}
                            alt={asset.alt || ""}
                            className="h-full w-full object-cover"
                          />
                        )}
                        {isSelected && (
                          <span
                            aria-hidden="true"
                            className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Upload hero images first to select a couple photo</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prelude (Welcome Note) — only on templates that render it */}
      {templateSupportsPrelude(templateId) && (
        <Card id="pe-prelude" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Prelude</CardTitle>
            <CardDescription>
              A short cursive welcome note rendered between the Hero and the
              rest of your page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PreludeEditor
              prelude={config.prelude}
              onChange={updatePrelude}
            />
          </CardContent>
        </Card>
      )}

      {/* Media Library */}
      <div id="pe-media" className="scroll-mt-20">
        <MediaUploadCard
          eventId={params.id}
          assets={pageData?.assets || []}
          onAssetUploaded={handleAssetUploaded}
          onAssetDeleted={handleAssetDeleted}
          onAssetUpdated={handleAssetUpdated}
          getIdToken={getIdToken}
        />
      </div>

      {/* Sections */}
      {config.sections.map((section, index) => {
        // Determine if this section would be hidden for the current viewAs level
        const effectiveVis = getEffectiveVisibility(section);
        const hiddenForView =
          viewAs !== "organizer" &&
          (!section.enabled ||
            effectiveVis === "hidden" ||
            (effectiveVis === "guests" && viewAs === "public"));
        const supported = TEMPLATE_SUPPORTED_SECTIONS[templateId];
        const isOrphaned = supported ? !supported.has(section.type) : false;

        return (
        <Card
          key={`${section.type}-${index}`}
          id={`pe-section-${section.type}`}
          ref={(el) => {
            if (el) sectionRefs.current.set(index, el);
            else sectionRefs.current.delete(index);
          }}
          className={cn(
            "scroll-mt-20",
            hiddenForView && "opacity-40 pointer-events-none"
          )}
        >
          {hiddenForView && (
            <div className="px-6 pt-4 pb-0">
              <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Hidden for {viewAs === "public" ? "public visitors" : "guests"}
              </span>
            </div>
          )}
          {isOrphaned && (
            <div className="mx-6 mt-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-xs font-medium text-amber-700">
                Not rendered by the current template ({templateId}). This section&apos;s data is preserved but won&apos;t appear on the published page.
              </p>
            </div>
          )}
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{getSectionLabel(section.type)} Section</CardTitle>
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
                <Select
                  value={section.visibility || ""}
                  onChange={(e) =>
                    updateSection(index, {
                      visibility: (e.target.value || undefined) as SectionVisibility | undefined,
                    })
                  }
                  className="h-8 text-xs"
                  title="Who can see this section"
                >
                  <option value="">Default ({getDefaultVisibility(section.type)})</option>
                  <option value="public">Public (everyone)</option>
                  <option value="guests">Guests only</option>
                  <option value="hidden">Hidden</option>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => moveSection(index, "up")}
                  disabled={index === 0}
                  className="h-8 w-8 p-0"
                  aria-label="Move section up"
                  title="Move section up"
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => moveSection(index, "down")}
                  disabled={index === config.sections.length - 1}
                  className="h-8 w-8 p-0"
                  aria-label="Move section down"
                  title="Move section down"
                >
                  ↓
                </Button>
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
            {(() => {
              const family = getTemplateFamily(templateId);
              const defaultShown = DEFAULT_NAV_SHOW[family].includes(section.type);
              const explicit = section.nav?.show;
              const effectiveShow = explicit ?? defaultShown;
              const placeholderLabel = resolveNavLabel(
                { ...section, nav: { ...(section.nav ?? {}), label: undefined } } as Section,
                family,
              );
              return (
                <div className="mt-3 flex flex-wrap items-center gap-4 border-t pt-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={effectiveShow}
                      onChange={(e) =>
                        updateSection(index, {
                          nav: { ...(section.nav ?? {}), show: e.target.checked },
                        } as Partial<Section>)
                      }
                      className="rounded"
                    />
                    Show in event navigation
                    {explicit === undefined && (
                      <span className="text-xs text-muted-foreground">
                        (default: {defaultShown ? "visible" : "hidden"})
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-2 text-sm">
                    <Label htmlFor={`nav-label-${index}`} className="text-sm">
                      Nav label
                    </Label>
                    <Input
                      id={`nav-label-${index}`}
                      type="text"
                      value={section.nav?.label ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const next = { ...(section.nav ?? {}) };
                        if (value.trim()) {
                          next.label = value;
                        } else {
                          delete next.label;
                        }
                        updateSection(index, {
                          nav: Object.keys(next).length ? next : undefined,
                        } as Partial<Section>);
                      }}
                      placeholder={placeholderLabel}
                      maxLength={PAGE_CONFIG_LIMITS.navLabelMaxLength}
                      disabled={!effectiveShow}
                      className="h-8 w-40 text-sm"
                    />
                  </div>
                </div>
              );
            })()}
          </CardHeader>
          <CardContent>
            {!section.enabled && (
              <p className="mb-3 text-sm font-medium text-amber-600">
                This section is disabled and won&apos;t appear on the published page.
              </p>
            )}
            <div className={cn(!section.enabled && "opacity-50 pointer-events-none")}>
            {section.type === "details" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  At-a-glance summary — the key dates, times, and venues your guests need to know first.
                </p>

                {/* V2 multi-event editor */}
                {templateId === "wedding_v2" && (() => {
                  const events = section.data.events || [];
                  const addEvent = () => {
                    updateSection(index, {
                      data: { ...section.data, events: [...events, { date: "", location: "" }] },
                    });
                  };
                  const updateEvent = (ei: number, updates: Record<string, unknown>) => {
                    const newEvents = [...events];
                    newEvents[ei] = { ...newEvents[ei], ...updates };
                    updateSection(index, { data: { ...section.data, events: newEvents } });
                  };
                  const removeEvent = (ei: number) => {
                    updateSection(index, {
                      data: { ...section.data, events: events.filter((_: unknown, i: number) => i !== ei) },
                    });
                  };

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Events</Label>
                        {events.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Multi-event mode — replaces the single date/location cards
                          </span>
                        )}
                      </div>
                      {events.map((event: { name?: string; date: string; location: string; description?: string }, ei: number) => (
                        <div key={ei} className="rounded-lg border bg-card p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                              Event {ei + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEvent(ei)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              ×
                            </Button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                              value={event.name || ""}
                              onChange={(e) => updateEvent(ei, { name: e.target.value || undefined })}
                              placeholder="Event name, e.g., Church Wedding"
                              maxLength={100}
                            />
                            <Input
                              value={event.date}
                              onChange={(e) => updateEvent(ei, { date: e.target.value })}
                              placeholder="Date & time, e.g., Saturday, Dec 14 at 2 PM"
                              maxLength={100}
                            />
                          </div>
                          <Input
                            value={event.location}
                            onChange={(e) => updateEvent(ei, { location: e.target.value })}
                            placeholder="Venue, e.g., St. Mary's Cathedral"
                            maxLength={200}
                          />
                          <Textarea
                            value={event.description || ""}
                            onChange={(e) => updateEvent(ei, { description: e.target.value || undefined })}
                            placeholder="Brief venue description (optional)"
                            rows={1}
                            maxLength={300}
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addEvent}
                        disabled={events.length >= 8}
                        className="w-full"
                      >
                        + Add Event{events.length >= 8 && " (max 8)"}
                      </Button>
                    </div>
                  );
                })()}

                {/* Legacy flat fields — shown when no events or non-V2 */}
                {(templateId !== "wedding_v2" || !(section.data.events && section.data.events.length > 0)) && (
                  <>
                    {templateId === "wedding_v2" && (
                      <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
                    )}
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
                    <div className="space-y-2">
                      <Label>Venue Description (optional)</Label>
                      <Textarea
                        value={section.data.venueDescription || ""}
                        onChange={(e) =>
                          updateSection(index, {
                            data: { ...section.data, venueDescription: e.target.value || undefined },
                          })
                        }
                        placeholder="e.g., A stunning waterfront venue with panoramic views..."
                        rows={2}
                        maxLength={300}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
            {section.type === "schedule" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Detailed itinerary — the full timeline of activities{templateId === "wedding_v2" ? ", grouped by day or event" : ""}.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Section Heading</Label>
                    <Input
                      value={section.data.heading || ""}
                      onChange={(e) => updateSection(index, {
                        data: { ...section.data, heading: e.target.value || undefined },
                      })}
                      placeholder={templateId === "wedding_v2" ? "Wedding Weekend" : "Day of Events"}
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Input
                      value={section.data.description || ""}
                      onChange={(e) => updateSection(index, {
                        data: { ...section.data, description: e.target.value || undefined },
                      })}
                      placeholder="A brief overview of the day's events"
                      maxLength={300}
                    />
                  </div>
                </div>
                <ScheduleEditor
                  items={section.data.items}
                  groups={section.data.groups}
                  onChange={(items) => updateSection(index, {
                    data: { ...section.data, items },
                  })}
                  onChangeGroups={(groups) => updateSection(index, {
                    data: { ...section.data, groups },
                  })}
                  templateId={templateId}
                />
              </div>
            )}
            {section.type === "faq" && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Section Heading</Label>
                    <Input
                      value={section.data.heading || ""}
                      onChange={(e) => updateSection(index, {
                        data: { ...section.data, heading: e.target.value || undefined },
                      })}
                      placeholder="Common Questions"
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Input
                      value={section.data.description || ""}
                      onChange={(e) => updateSection(index, {
                        data: { ...section.data, description: e.target.value || undefined },
                      })}
                      placeholder="Answers to frequently asked questions"
                      maxLength={300}
                    />
                  </div>
                </div>
                <FAQEditor
                  items={section.data.items}
                  onChange={(items) => updateSection(index, {
                    data: { ...section.data, items },
                  })}
                />
              </div>
            )}
            {section.type === "gallery" && (
              <GalleryEditor
                data={section.data}
                assets={pageData?.assets || []}
                onChange={(data) => updateSectionData(index, data)}
                templateId={templateId}
              />
            )}
            {section.type === "rsvp" && (
              <RSVPEditor
                data={section.data}
                onChange={(data) => updateSectionData(index, data)}
              />
            )}
            {section.type === "speakers" && (
              <SpeakersEditor
                data={section.data}
                assets={pageData?.assets || []}
                onChange={(data) => updateSectionData(index, data)}
              />
            )}
            {section.type === "sponsors" && (
              <SponsorsEditor
                data={section.data}
                assets={pageData?.assets || []}
                onChange={(data) => updateSectionData(index, data)}
              />
            )}
            {section.type === "map" && (
              <MapEditor
                data={section.data}
                onChange={(data) => updateSectionData(index, data)}
                eventId={params.id}
                getIdToken={getIdToken}
              />
            )}
            {/* Wedding-specific section editors */}
            {section.type === "story" && (
              <StoryEditor
                data={section.data}
                assets={pageData?.assets || []}
                onChange={(data) => updateSectionData(index, data)}
                templateId={templateId}
              />
            )}
            {section.type === "travelStay" && (
              <TravelStayEditor
                data={section.data}
                onChange={(data) => updateSectionData(index, data)}
                templateId={templateId}
              />
            )}
            {section.type === "weddingParty" && (
              <WeddingPartyEditor
                data={section.data}
                assets={pageData?.assets || []}
                onChange={(data) => updateSectionData(index, data)}
              />
            )}
            {section.type === "attire" && (
              <AttireEditor
                data={section.data}
                onChange={(data) => updateSectionData(index, data)}
              />
            )}
            {section.type === "thingsToDo" && (
              <ThingsToDoEditor
                data={section.data}
                onChange={(data) => updateSectionData(index, data)}
              />
            )}
            {section.type === "registry" && (
              <RegistryEditor
                data={section.data}
                assets={pageData?.assets || []}
                onChange={(data) => updateSectionData(index, data)}
              />
            )}
            {section.type === "wishes" && (
              <WishesEditor
                data={section.data}
                onChange={(data) => updateSectionData(index, data)}
              />
            )}
            {section.type === "livestream" && (
              <LivestreamEditor
                data={section.data}
                onChange={(data) => updateSectionData(index, data)}
                timezone={pageData?.event?.timezone || "UTC"}
              />
            )}
            </div>
          </CardContent>
        </Card>
        );
      })}

      {/* Add Section */}
      <Card id="pe-add-section" className="scroll-mt-20">
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
            {/* Wedding-specific sections — driven by TEMPLATE_SUPPORTED_SECTIONS */}
            {supported.has("story") && !config.sections.some((s) => s.type === "story") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("story")}
              >
                + Our Story
              </Button>
            )}
            {supported.has("travelStay") && !config.sections.some((s) => s.type === "travelStay") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("travelStay")}
              >
                + Travel & Stay
              </Button>
            )}
            {supported.has("weddingParty") && !config.sections.some((s) => s.type === "weddingParty") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("weddingParty")}
              >
                + Wedding Party
              </Button>
            )}
            {supported.has("attire") && !config.sections.some((s) => s.type === "attire") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("attire")}
              >
                + Dress Code
              </Button>
            )}
            {supported.has("thingsToDo") && !config.sections.some((s) => s.type === "thingsToDo") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("thingsToDo")}
              >
                + Things To Do
              </Button>
            )}
            {supported.has("registry") && !config.sections.some((s) => s.type === "registry") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("registry")}
              >
                + Gift Registry
              </Button>
            )}
            {supported.has("wishes") && !config.sections.some((s) => s.type === "wishes") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("wishes")}
              >
                + Wedding Wishes
              </Button>
            )}
            {supported.has("livestream") && !config.sections.some((s) => s.type === "livestream") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection("livestream")}
              >
                + Live Stream
              </Button>
            )}
            {config.sections.length >= 12 && (
              <p className="text-sm text-muted-foreground">
                All section types have been added.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom actions (visible at end of page) */}
      <div className="flex justify-between pt-4 pb-20">
        <Button variant="outline" onClick={requestLeave}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Floating Action Bar - Sticky at bottom when there are changes.
          Hidden while the section-nav drawer is open so it doesn't sit on top
          of the drawer backdrop (both are z-50). */}
      {hasChanges && !isNavOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Unsaved changes</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePreview}>
                <svg
                  className="mr-1.5 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Preview
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || isPreviewingVersion}
                size="sm"
              >
                {saving ? (
                  <>
                    <svg
                      className="mr-1.5 h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-1.5 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showPreviewDialog}
        onConfirm={handleSaveAndPreview}
        onCancel={() => setShowPreviewDialog(false)}
        title="Unsaved Changes"
        description="You have unsaved changes that won't appear in the preview. Would you like to save first?"
        confirmLabel="Save & Preview"
        cancelLabel="Cancel"
      />

      <ConfirmDialog {...discardDialogProps} />
      </div>

      {/* Floating "jump to section" trigger — fixed top-right under the auth
          header (h-14) so it follows the viewport. Hidden while the editor
          header is in view (Save / Preview reachable inline there) or the
          drawer is open. */}
      <button
        type="button"
        onClick={() => setIsNavOpen(true)}
        aria-label="Open section navigation"
        aria-expanded={isNavOpen}
        aria-controls="page-editor-nav"
        aria-hidden={!editorHeaderSeen || editorHeaderInView || isNavOpen}
        tabIndex={
          !editorHeaderSeen || editorHeaderInView || isNavOpen ? -1 : 0
        }
        title="Jump to section"
        className={cn(
          "fixed right-4 top-[4.5rem] z-30 flex h-10 w-10 items-center justify-center",
          "rounded-full border border-border bg-background/95 text-foreground shadow-md backdrop-blur",
          "supports-[backdrop-filter]:bg-background/80",
          "transition hover:bg-muted hover:shadow-lg",
          (!editorHeaderSeen || editorHeaderInView || isNavOpen) &&
            "pointer-events-none opacity-0"
        )}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <PageEditorNav
        open={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        groups={navGroups}
        activeId={activeNavId}
      />
    </div>
  );
}
