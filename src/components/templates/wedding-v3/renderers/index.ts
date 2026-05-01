/**
 * Renderer Registry
 *
 * Maps renderer IDs to React components for each section type.
 * The factory function uses this registry to dispatch rendering
 * based on the TemplateDefinition's renderer selections.
 *
 * Each section type has its own registry. New renderer variants
 * are added by importing the component and registering it here.
 */

import type {
  HeroRendererId,
  NavRendererId,
  GalleryRendererId,
  ScheduleRendererId,
  StoryRendererId,
  RSVPRendererId,
  FooterRendererId,
  DividerRendererId,
  WeddingPartyRendererId,
  HeroRenderer,
  NavRenderer,
  FooterRenderer,
  DividerRenderer,
  RSVPRenderer,
  GalleryRenderer,
  ScheduleRenderer,
  StoryRenderer,
  DetailsRenderer,
  FAQRenderer,
  TravelStayRenderer,
  RegistryRenderer,
  WishesRenderer as WishesRendererType,
  WeddingPartyRenderer,
  AttireRenderer,
  ThingsToDoRenderer,
  SpeakersRenderer,
  SponsorsRenderer,
  MapRenderer,
} from "../types";

// ---------------------------------------------------------------------------
// Phase 1 renderers — Editorial + Intimate Note
// ---------------------------------------------------------------------------
import { AsymmetricHero } from "./hero/AsymmetricHero";
import { TypographicHero } from "./hero/TypographicHero";
import { TransparentStickyNav } from "./nav/TransparentStickyNav";
import { LightMinimalNav } from "./nav/LightMinimalNav";
import { MagazineGrid } from "./gallery/MagazineGrid";
import { CompactStrip } from "./gallery/CompactStrip";
import { VerticalItinerary } from "./schedule/VerticalItinerary";
import { ConciseEssentials } from "./schedule/ConciseEssentials";
import { EditorialBlocks } from "./story/EditorialBlocks";
import { LetterNarrative } from "./story/LetterNarrative";
import { SideBySideRSVP } from "./rsvp/SideBySideRSVP";
import { StreamlinedRSVP } from "./rsvp/StreamlinedRSVP";
import { MinimalRuleFooter } from "./footer/MinimalRuleFooter";
import { ThinRuleDivider } from "./divider/ThinRuleDivider";
import { CursiveFlourishDivider } from "./divider/CursiveFlorishDivider";

// ---------------------------------------------------------------------------
// Phase 2 renderers — Fine Art Romance + Garden House
// ---------------------------------------------------------------------------
import { CenteredInvitationHero } from "./hero/CenteredInvitationHero";
import { ArchFramedHero } from "./hero/ArchFramedHero";
import { CenteredDecoratorNav } from "./nav/CenteredDecoratorNav";
import { PillDotNav } from "./nav/PillDotNav";
import { FramedFineArt } from "./gallery/FramedFineArt";
import { SoftMasonry } from "./gallery/SoftMasonry";
import { InvitationCardSchedule } from "./schedule/InvitationCardSchedule";
import { CurvedStacked } from "./schedule/CurvedStacked";
import { ChapterCards } from "./story/ChapterCards";
import { PhotoProse } from "./story/PhotoProse";
import { CenteredFormalRSVP } from "./rsvp/CenteredFormalRSVP";
import { NaturalPaperRSVP } from "./rsvp/NaturalPaperRSVP";
import { CenteredOrnateFooter } from "./footer/CenteredOrnateFooter";
import { OrganicWaveFooter } from "./footer/OrganicWaveFooter";
import { FloralFrameDivider } from "./divider/FloralFrameDivider";
import { OrganicCurveDivider } from "./divider/OrganicCurveDivider";

// ---------------------------------------------------------------------------
// Phase 3 renderers — Grand Luxe + Celebration House
// ---------------------------------------------------------------------------
import { FullscreenDramaticHero } from "./hero/FullscreenDramaticHero";
import { CollageMosaicHero } from "./hero/CollageMosaicHero";
import { FloatingPillNav } from "./nav/FloatingPillNav";
import { UtilityForwardNav } from "./nav/UtilityForwardNav";
import { CinematicSlider } from "./gallery/CinematicSlider";
import { ScrapbookCollage } from "./gallery/ScrapbookCollage";
import { StackedLuxe } from "./schedule/StackedLuxe";
import { MultiEventTabbed } from "./schedule/MultiEventTabbed";
import { QuoteLed } from "./story/QuoteLed";
import { MilestoneMosaic } from "./story/MilestoneMosaic";
import { HighContrastRSVP } from "./rsvp/HighContrastRSVP";
import { StepperRSVP } from "./rsvp/StepperRSVP";
import { DramaticDarkFooter } from "./footer/DramaticDarkFooter";
import { FestiveLayeredFooter } from "./footer/FestiveLayeredFooter";
import { MetallicLineDivider } from "./divider/MetallicLineDivider";
import { RhythmicPatternDivider } from "./divider/RhythmicPatternDivider";
import { ScrapbookWeddingParty } from "./wedding-party/ScrapbookWeddingParty";

// ---------------------------------------------------------------------------
// Wedding Wishes — single renderer (currently no per-template variants)
// ---------------------------------------------------------------------------
import { WishesRenderer as WishesRendererComponent } from "./wishes";
export { PaperFilters } from "./wishes";

// ---------------------------------------------------------------------------
// V2 "cinematic" adapters — wrap existing V2 sections to match V3 contracts
// ---------------------------------------------------------------------------
import {
  CinematicHeroAdapter,
  CinematicNavAdapter,
  CinematicFooterAdapter,
  CinematicDividerAdapter,
  CinematicGalleryAdapter,
  CinematicScheduleAdapter,
  CinematicStoryAdapter,
  CinematicDetailsAdapter,
  CinematicFAQAdapter,
  CinematicTravelStayAdapter,
  CinematicRegistryAdapter,
  CinematicWeddingPartyAdapter,
  CinematicAttireAdapter,
  CinematicThingsToDoAdapter,
  CinematicSpeakersAdapter,
  CinematicSponsorsAdapter,
  CinematicMapAdapter,
  CinematicRSVPAdapter,
} from "./cinematic-adapters";

// ---------------------------------------------------------------------------
// Registries
// ---------------------------------------------------------------------------

export const heroRenderers: Record<HeroRendererId, HeroRenderer> = {
  cinematic: CinematicHeroAdapter,
  asymmetric: AsymmetricHero,
  "centered-invitation": CenteredInvitationHero,
  "fullscreen-dramatic": FullscreenDramaticHero,
  "arch-framed": ArchFramedHero,
  typographic: TypographicHero,
  "collage-mosaic": CollageMosaicHero,
};

export const navRenderers: Record<NavRendererId, NavRenderer> = {
  "cinematic-topbar": CinematicNavAdapter,
  "transparent-sticky": TransparentStickyNav,
  "centered-decorator": CenteredDecoratorNav,
  "floating-pill": FloatingPillNav,
  "pill-dot": PillDotNav,
  "light-minimal": LightMinimalNav,
  "utility-forward": UtilityForwardNav,
};

export const galleryRenderers: Record<GalleryRendererId, GalleryRenderer> = {
  masonry: CinematicGalleryAdapter,
  "magazine-grid": MagazineGrid,
  "framed-fine-art": FramedFineArt,
  "cinematic-slider": CinematicSlider,
  "soft-masonry": SoftMasonry,
  "compact-strip": CompactStrip,
  "scrapbook-collage": ScrapbookCollage,
};

export const scheduleRenderers: Record<ScheduleRendererId, ScheduleRenderer> = {
  cinematic: CinematicScheduleAdapter,
  "vertical-itinerary": VerticalItinerary,
  "invitation-card": InvitationCardSchedule,
  "stacked-luxe": StackedLuxe,
  "curved-stacked": CurvedStacked,
  "concise-essentials": ConciseEssentials,
  "multi-event-tabbed": MultiEventTabbed,
};

export const storyRenderers: Record<StoryRendererId, StoryRenderer> = {
  timeline: CinematicStoryAdapter,
  "editorial-blocks": EditorialBlocks,
  "chapter-cards": ChapterCards,
  "quote-led": QuoteLed,
  "photo-prose": PhotoProse,
  "letter-narrative": LetterNarrative,
  "milestone-mosaic": MilestoneMosaic,
};

export const rsvpRenderers: Record<RSVPRendererId, RSVPRenderer> = {
  cinematic: CinematicRSVPAdapter,
  "side-by-side": SideBySideRSVP,
  "centered-formal": CenteredFormalRSVP,
  "high-contrast": HighContrastRSVP,
  "natural-paper": NaturalPaperRSVP,
  streamlined: StreamlinedRSVP,
  stepper: StepperRSVP,
};

export const footerRenderers: Record<FooterRendererId, FooterRenderer> = {
  cinematic: CinematicFooterAdapter,
  "minimal-rule": MinimalRuleFooter,
  "centered-ornate": CenteredOrnateFooter,
  "dramatic-dark": DramaticDarkFooter,
  "organic-wave": OrganicWaveFooter,
  "festive-layered": FestiveLayeredFooter,
};

export const dividerRenderers: Record<DividerRendererId, DividerRenderer> = {
  mountain: CinematicDividerAdapter,
  "thin-rule": ThinRuleDivider,
  "floral-frame": FloralFrameDivider,
  "metallic-line": MetallicLineDivider,
  "organic-curve": OrganicCurveDivider,
  none: () => null,
  "cursive-flourish": CursiveFlourishDivider,
  "rhythmic-pattern": RhythmicPatternDivider,
};

// Non-variant sections — these use the same renderer across all templates
// (can be overridden per-template in the future if needed)
export const detailsRenderer: DetailsRenderer = CinematicDetailsAdapter;
export const faqRenderer: FAQRenderer = CinematicFAQAdapter;
export const travelStayRenderer: TravelStayRenderer = CinematicTravelStayAdapter;
export const registryRenderer: RegistryRenderer = CinematicRegistryAdapter;
export const wishesRenderer: WishesRendererType = WishesRendererComponent;
export const attireRenderer: AttireRenderer = CinematicAttireAdapter;
export const thingsToDoRenderer: ThingsToDoRenderer = CinematicThingsToDoAdapter;
export const speakersRenderer: SpeakersRenderer = CinematicSpeakersAdapter;
export const sponsorsRenderer: SponsorsRenderer = CinematicSponsorsAdapter;
export const mapRenderer: MapRenderer = CinematicMapAdapter;

export const weddingPartyRenderers: Record<WeddingPartyRendererId, WeddingPartyRenderer> = {
  cinematic: CinematicWeddingPartyAdapter,
  "scrapbook-flip": ScrapbookWeddingParty,
};

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getHeroRenderer(id: HeroRendererId): HeroRenderer {
  return heroRenderers[id] || heroRenderers.cinematic;
}

export function getNavRenderer(id: NavRendererId): NavRenderer {
  return navRenderers[id] || navRenderers["cinematic-topbar"];
}

export function getGalleryRenderer(id: GalleryRendererId): GalleryRenderer {
  return galleryRenderers[id] || galleryRenderers.masonry;
}

export function getScheduleRenderer(id: ScheduleRendererId): ScheduleRenderer {
  return scheduleRenderers[id] || scheduleRenderers.cinematic;
}

export function getStoryRenderer(id: StoryRendererId): StoryRenderer {
  return storyRenderers[id] || storyRenderers.timeline;
}

export function getRSVPRenderer(id: RSVPRendererId): RSVPRenderer {
  return rsvpRenderers[id] || rsvpRenderers.cinematic;
}

export function getFooterRenderer(id: FooterRendererId): FooterRenderer {
  return footerRenderers[id] || footerRenderers.cinematic;
}

export function getDividerRenderer(id: DividerRendererId): DividerRenderer {
  return dividerRenderers[id] || dividerRenderers.mountain;
}

export function getWeddingPartyRenderer(id: WeddingPartyRendererId | undefined): WeddingPartyRenderer {
  return (id && weddingPartyRenderers[id]) || weddingPartyRenderers.cinematic;
}
