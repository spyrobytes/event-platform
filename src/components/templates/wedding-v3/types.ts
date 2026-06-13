/**
 * Wedding V3 Template System — Type Definitions
 *
 * Three-layer architecture:
 * 1. TemplateDefinition — declares which renderers, nav, chrome, motion, theme to use (pure data)
 * 2. createWeddingTemplate() — factory that accepts a definition and returns a React component
 * 3. Renderer Registry — pluggable section renderers dispatched by the factory
 */

import type { ComponentType } from "react";
import type { MediaAsset } from "@prisma/client";
import type { MobileNavExpression } from "@/components/templates/shared/MobileNavMenu";
import type {
  HeroConfig,
  DetailsSection,
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
  RegistrySection,
  WishesSection,
  SocialLink,
  WeddingPartyDisplayStyle,
} from "@/schemas/event-page";
import type { V2FontPair, V2PaletteOverrides, V2GlassTokens } from "../wedding-v2/tokens";
import type { SectionTheme } from "./theme-packs/section-themes";
import type {
  CouplePhotoFrameId,
  CouplePhotoFrameOption,
} from "../shared/CouplePhotoFrame/frame-options";

// ---------------------------------------------------------------------------
// Template IDs
// ---------------------------------------------------------------------------

export type V3TemplateId =
  | "editorial"
  | "fine_art"
  | "grand_luxe"
  | "garden_house"
  | "intimate_note"
  | "celebration";

// ---------------------------------------------------------------------------
// Theme Pack
// ---------------------------------------------------------------------------

export type SpacingScale = "compact" | "balanced" | "generous";
export type RadiusScale = "sharp" | "soft" | "organic";
export type ShadowIntensity = "none" | "subtle" | "medium" | "dramatic";
export type ButtonStyle = "solid" | "outline" | "ghost" | "soft";
export type DecorativeMotif = "floral" | "editorial-lines" | "arch" | "mosaic" | "none";

export type ThemePack = {
  id: string;
  label: string;
  /** Raw + semantic color overrides (reuses V2 palette system) */
  palette: V2PaletteOverrides;
  /** Glass/frosted UI tokens */
  glass: V2GlassTokens;
  /** Font pair identifier */
  fontPair: V2FontPair;
  /** Controls section-y spacing scale */
  spacingScale: SpacingScale;
  /** Max content width (e.g. "1140px", "800px" for Intimate Note) */
  maxWidth: string;
  /** Border radius personality */
  radiusScale: RadiusScale;
  /** Shadow intensity */
  shadowIntensity: ShadowIntensity;
  /** Button rendering style */
  buttonStyle: ButtonStyle;
  /** Decorative motif type */
  motif: DecorativeMotif;
  /** Optional cursive/handwriting font family for section headers */
  cursiveFont?: string;
  /** Google Fonts URL segment for the cursive font (appended to main URL) */
  cursiveFontUrl?: string;
};

export type CuratedSwatch = {
  hex: string;
  label: string;
};

// ---------------------------------------------------------------------------
// Motion Preset
// ---------------------------------------------------------------------------

export type RevealType =
  | "fade-up"
  | "dissolve"
  | "mask-reveal"
  | "organic-drift"
  | "soft-fade"
  | "bounce";

export type MotionPreset = {
  /** The reveal animation type */
  revealType: RevealType;
  /** Animation duration in ms */
  duration: number;
  /** CSS easing function */
  easing: string;
  /** Delay between consecutive section reveals in ms */
  staggerDelay: number;
  /** Whether parallax scrolling is enabled */
  parallax: boolean;
};

// ---------------------------------------------------------------------------
// Renderer IDs — each section type has named renderer variants
// ---------------------------------------------------------------------------

export type HeroRendererId =
  | "cinematic"         // existing V2
  | "asymmetric"        // Editorial
  | "centered-invitation" // Fine Art Romance
  | "fullscreen-dramatic" // Grand Luxe
  | "arch-framed"       // Garden House
  | "typographic"       // Intimate Note
  | "collage-mosaic";   // Celebration House

export type NavRendererId =
  | "cinematic-topbar"    // existing V2
  | "transparent-sticky"  // Editorial
  | "centered-decorator"  // Fine Art Romance
  | "floating-pill"       // Grand Luxe
  | "pill-dot"            // Garden House
  | "light-minimal"       // Intimate Note
  | "utility-forward";    // Celebration House

export type GalleryRendererId =
  | "masonry"             // existing V2
  | "magazine-grid"       // Editorial
  | "framed-fine-art"     // Fine Art Romance
  | "cinematic-slider"    // Grand Luxe
  | "soft-masonry"        // Garden House
  | "compact-strip"       // Intimate Note
  | "scrapbook-collage";  // Celebration House

export type ScheduleRendererId =
  | "cinematic"             // existing V2
  | "vertical-itinerary"    // Editorial
  | "invitation-card"       // Fine Art Romance
  | "stacked-luxe"          // Grand Luxe
  | "curved-stacked"        // Garden House
  | "concise-essentials"    // Intimate Note
  | "multi-event-tabbed";   // Celebration House

export type StoryRendererId =
  | "timeline"              // existing V2
  | "editorial-blocks"      // Editorial
  | "chapter-cards"         // Fine Art Romance
  | "quote-led"             // Grand Luxe
  | "photo-prose"           // Garden House
  | "letter-narrative"      // Intimate Note
  | "milestone-mosaic";     // Celebration House

export type RSVPRendererId =
  | "cinematic"             // existing V2
  | "side-by-side"          // Editorial
  | "centered-formal"       // Fine Art Romance
  | "high-contrast"         // Grand Luxe
  | "natural-paper"         // Garden House
  | "streamlined"           // Intimate Note
  | "stepper";              // Celebration House

export type FooterRendererId =
  | "cinematic"             // existing V2
  | "minimal-rule"          // Editorial + Intimate Note
  | "centered-ornate"       // Fine Art Romance
  | "dramatic-dark"         // Grand Luxe
  | "organic-wave"          // Garden House
  | "festive-layered";      // Celebration House

export type DividerRendererId =
  | "mountain"              // existing V2
  | "thin-rule"             // Editorial
  | "floral-frame"          // Fine Art Romance
  | "metallic-line"         // Grand Luxe
  | "organic-curve"         // Garden House
  | "none"                  // (no divider)
  | "cursive-flourish"      // Intimate Note
  | "rhythmic-pattern";     // Celebration House

export type WeddingPartyRendererId =
  | "cinematic"             // existing V2 adapter (default)
  | "scrapbook-flip"        // Celebration House — scrapbook photos with card flip
  | "gilded-frames"         // Grand Luxe — matted gold-framed gallery, --lux-* themed
  | "couture-polaroid";     // Grand Luxe — matte mounted polaroids, gold corners, --lux-* themed

/**
 * A curated, organizer-selectable wedding-party display style. A template that
 * declares `weddingPartyStyleOptions` lets the organizer pick among these (the
 * first is the default); the persisted choice lives on
 * `section.data.displayStyle`. This is a deliberately CURATED list (not a free
 * renderer picker) — see the V3 design philosophy.
 */
export type WeddingPartyStyleOption = {
  /** Persisted value on `section.data.displayStyle`. */
  value: WeddingPartyDisplayStyle;
  /** Label shown in the editor toggle. */
  label: string;
  /** Renderer used when this style is selected. */
  renderer: WeddingPartyRendererId;
};

// ---------------------------------------------------------------------------
// Section Renderer Props — shared contract for all renderer variants
// ---------------------------------------------------------------------------

/** Base props that every section renderer receives */
export type SectionRendererProps<TData> = {
  data: TData;
  assets: MediaAsset[];
  eventId?: string;
  /** Event slug; needed by the registry adapter to build the "View full
   * registry" CTA href in preview mode. Other adapters ignore it. */
  eventSlug?: string;
  /** Passed through from the public page for sections that support guest
   * mutations (currently: registry claims). Optional because not every
   * renderer needs them. */
  registryClaims?: Record<string, {
    itemId: string;
    claimedByOthers: number;
    myClaimId: string | null;
    myClaimQuantity: number;
  }>;
  canClaim?: boolean;
  /** Registry rendering mode — ignored by non-registry adapters. */
  registryMode?: "preview" | "full";
  /** Approved wedding wishes. Only meaningful for the wishes renderer;
   *  other adapters ignore. */
  approvedWishes?: Array<{
    id: string;
    message: string;
    authorName: string;
  }>;
  /** Wishes rendering mode — ignored by non-wishes adapters. */
  wishesMode?: "preview" | "full";
  /** Guest invite token (`tk` query param). Used by the wishes renderer
   *  to build the "View all" CTA href; ignored by other adapters. */
  inviteToken?: string;
};

/** Hero has a special contract */
export type HeroRendererProps = {
  config: HeroConfig;
  heroAsset?: MediaAsset | null;
  couplePhotoAsset?: MediaAsset | null;
  /** Frame shape for the couple photo, resolved by the factory from the
   * definition's `couplePhotoFrameOptions` + `hero.couplePhotoFrame` (always
   * via `resolveCouplePhotoFrame` — never read the raw config value).
   * Undefined when the template declares no options; heroes then fall back
   * to their built-in shape. */
  couplePhotoFrame?: CouplePhotoFrameId;
  scheduleCards?: { day: string; info: string }[];
  hasDetailsSection?: boolean;
  eventRsvpDeadline?: string;
  /** IANA timezone (e.g. "America/Edmonton"). Required so date formatting
   *  matches the event's locale, not the viewer's. Caller defaults to
   *  "UTC" upstream — the leaf renderer never needs to. */
  eventTimezone: string;
};

/** RSVP needs eventSlug for the code-gated portal CTA */
export type RSVPRendererProps = {
  data: RSVPSection["data"];
  eventSlug: string;
};

/** Nav needs navigation data */
export type NavRendererProps = {
  monogram?: string;
  coupleNames?: string;
  dateText: string;
  sections: { id: string; label: string; href?: string; isCta?: boolean }[];
  /** Items that did not fit the curated visible-cap. Renderers should
   *  surface these behind a "More ▾" affordance (desktop) and inline
   *  them into any mobile drawer so every nav target stays reachable. */
  overflow?: { id: string; label: string; href?: string; isCta?: boolean }[];
  accentColor?: string;
  /** Whether the hero section has a background image (affects nav contrast) */
  hasHeroImage?: boolean;
  /** On sub-pages, links the logo back to the landing page instead of #top. */
  homeHref?: string;
  /** Visual expression of the shared mobile menu, declared by the template's
   *  definition (mobileNavExpression). Renderers forward it verbatim to
   *  MobileNavMenu; omitted = the shared drawer default. */
  mobileNavExpression?: MobileNavExpression;
};

/** Footer props */
export type FooterRendererProps = {
  monogram?: string;
  coupleNames?: string;
  dateText: string;
  sections: { id: string; label: string; href?: string }[];
  /** Optional social links — only passed when the definition opts in via supportsSocialLinks */
  socialLinks?: SocialLink[];
};

/** Divider props */
export type DividerRendererProps = {
  flip?: boolean;
  dividerIndex: number;
};

// ---------------------------------------------------------------------------
// Renderer Component Types
// ---------------------------------------------------------------------------

export type HeroRenderer = ComponentType<HeroRendererProps>;
export type NavRenderer = ComponentType<NavRendererProps>;
export type FooterRenderer = ComponentType<FooterRendererProps>;
export type DividerRenderer = ComponentType<DividerRendererProps>;
export type RSVPRenderer = ComponentType<RSVPRendererProps>;

// Section renderers keyed by section type
export type GalleryRenderer = ComponentType<SectionRendererProps<GallerySection["data"]>>;
export type ScheduleRenderer = ComponentType<SectionRendererProps<ScheduleSection["data"]>>;
export type StoryRenderer = ComponentType<SectionRendererProps<StorySection["data"]>>;
export type DetailsRenderer = ComponentType<SectionRendererProps<DetailsSection["data"]>>;
export type FAQRenderer = ComponentType<SectionRendererProps<FAQSection["data"]>>;
export type TravelStayRenderer = ComponentType<SectionRendererProps<TravelStaySection["data"]>>;
export type RegistryRenderer = ComponentType<SectionRendererProps<RegistrySection["data"]>>;
export type WishesRenderer = ComponentType<SectionRendererProps<WishesSection["data"]>>;
export type WeddingPartyRenderer = ComponentType<SectionRendererProps<WeddingPartySection["data"]>>;
export type AttireRenderer = ComponentType<SectionRendererProps<AttireSection["data"]>>;
export type ThingsToDoRenderer = ComponentType<SectionRendererProps<ThingsToDoSection["data"]>>;
export type SpeakersRenderer = ComponentType<SectionRendererProps<SpeakersSection["data"]>>;
export type SponsorsRenderer = ComponentType<SectionRendererProps<SponsorsSection["data"]>>;
export type MapRenderer = ComponentType<SectionRendererProps<MapSection["data"]>>;

// ---------------------------------------------------------------------------
// Chrome Kit
// ---------------------------------------------------------------------------

export type ChromeKit = {
  /** Show scroll progress bar */
  scrollProgress: boolean;
  /** Show botanical/decorative overlays */
  botanicals: boolean;
  /** Show footer skyline/decoration */
  footerDecoration: boolean;
};

// ---------------------------------------------------------------------------
// Template Definition — the core config object for each unique template
// ---------------------------------------------------------------------------

export type TemplateDefinition = {
  /** Unique template identifier */
  id: V3TemplateId;
  /** Display name shown in picker */
  displayName: string;
  /** Short description */
  description: string;
  /** Best-fit use cases */
  bestFor: string[];

  // --- Renderer selections ---
  heroRenderer: HeroRendererId;
  navRenderer: NavRendererId;
  /**
   * Visual expression of the shared mobile menu (drawer | veil | sheet).
   * Curated per template — the definition is the source of truth and the
   * nav renderer just forwards it (the same "definition declares, renderer
   * obeys" contract as the section renderers). Omitted = drawer default.
   */
  mobileNavExpression?: MobileNavExpression;
  galleryRenderer: GalleryRendererId;
  scheduleRenderer: ScheduleRendererId;
  storyRenderer: StoryRendererId;
  rsvpRenderer: RSVPRendererId;
  footerRenderer: FooterRendererId;
  dividerRenderer: DividerRendererId;
  /** Optional — defaults to "cinematic" (V2 adapter) when omitted */
  weddingPartyRenderer?: WeddingPartyRendererId;
  /**
   * Optional curated wedding-party display styles. When present, the wedding
   * party section offers an organizer toggle (first option is the default, and
   * `section.data.displayStyle` selects among them); when omitted, the fixed
   * `weddingPartyRenderer` is used. See WeddingPartyStyleOption.
   */
  weddingPartyStyleOptions?: WeddingPartyStyleOption[];
  /**
   * Optional curated couple-photo frame shapes. When present, the hero's
   * couple photo offers an organizer toggle (first option is the default, and
   * `hero.couplePhotoFrame` selects among them); when omitted, the hero
   * renderer's built-in shape is used. See CouplePhotoFrameOption.
   */
  couplePhotoFrameOptions?: CouplePhotoFrameOption[];

  // --- Motion ---
  motionPreset: MotionPreset;

  // --- Chrome ---
  chromeKit: ChromeKit;

  // --- Theme ---
  /** Curated theme packs (user picks one; first is default) */
  themePacks: ThemePack[];
  /** Quick accent color swatches */
  accentSwatches: CuratedSwatch[];
  /**
   * Optional curated *section themes* — recolor a subset of feature surfaces
   * (nav, hero info cards, countdown strip, RSVP, schedule, footer) as a group,
   * independently of the base palette. The organizer's choice is persisted on
   * `config.theme.sectionThemeId`; when unset, the template's default look is
   * used (no `--lux-*` injected). See `theme-packs/section-themes.ts`.
   */
  sectionThemes?: SectionTheme[];
  /**
   * Label + swatch for the "no section theme" (template default) option shown
   * in the picker — the unthemed/default look. Falls back to a generic label
   * and a neutral swatch when omitted.
   */
  defaultSectionTheme?: { label: string; swatch: string };

  // --- Section defaults ---
  defaultSectionOrder: string[];

  /** Scroll progress gradient CSS (optional override) */
  scrollProgressGradient?: string;

  /** Optional tip shown to organizers about hero image selection */
  heroImageTip?: string;

  /** Optional tip shown to organizers about couple-photo selection — surfaces
   *  template-specific cropping or framing constraints (e.g. Grand Luxe's
   *  heart silhouette clip). */
  couplePhotoTip?: string;

  /**
   * Whether this template renders optional social links in its footer.
   * When true, the factory passes `config.socialLinks` through to the
   * footer renderer. When false/undefined, the prop is never populated.
   */
  supportsSocialLinks?: boolean;

  /**
   * Whether this template renders the optional Prelude (welcome note) between
   * the hero and the first section. When true, the factory renders the
   * `PreludeBlock` if `config.prelude` is enabled.
   */
  supportsPrelude?: boolean;

  /**
   * Whether this template's hero offers the background-treatment toggle
   * (`hero.backgroundTreatment`: ambience | portrait). Portrait mode is for a
   * couple photo used AS the background: the hero renderer must honor it with
   * a lighter grade, no Ken Burns drift, and a top-anchored crop (heads never clip).
   * Only set this on templates whose hero renderer implements that treatment.
   */
  supportsHeroBackgroundTreatment?: boolean;
};
