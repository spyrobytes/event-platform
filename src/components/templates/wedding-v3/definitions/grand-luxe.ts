/**
 * The Grand Luxe — Template Definition
 *
 * Dramatic, premium, high-contrast. Built for couples who want
 * a statement page with bold visual presence. If the others
 * whisper elegance, this one makes an entrance.
 */

import type { TemplateDefinition } from "../types";

export const GRAND_LUXE: TemplateDefinition = {
  id: "grand_luxe",
  displayName: "The Grand Luxe",
  description: "Dramatic, bold, premium. High-contrast glamour for black-tie and formal weddings.",
  bestFor: [
    "Black-tie weddings",
    "Ballroom weddings",
    "Evening receptions",
    "Luxury destination events",
  ],

  heroRenderer: "fullscreen-dramatic",
  navRenderer: "floating-pill",
  galleryRenderer: "scrapbook-collage",
  scheduleRenderer: "stacked-luxe",
  storyRenderer: "quote-led",
  rsvpRenderer: "high-contrast",
  footerRenderer: "dramatic-dark",
  dividerRenderer: "metallic-line",

  // Organizer-selectable wedding-party display style (first is the default).
  // "Scrapbook" reuses Celebration's token-driven scrapbook-flip renderer, which
  // adapts to Grand Luxe's gold/ivory palette (refined, not festive).
  weddingPartyStyleOptions: [
    { value: "cinematic", label: "Cinematic", renderer: "cinematic" },
    { value: "scrapbook", label: "Scrapbook", renderer: "scrapbook-flip" },
  ],

  supportsSocialLinks: true,

  motionPreset: {
    revealType: "mask-reveal",
    duration: 700,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    staggerDelay: 100,
    parallax: true,
  },

  chromeKit: {
    scrollProgress: false,
    botanicals: false,
    footerDecoration: false,
  },

  themePacks: [
    // Midnight Gold — black, champagne gold, pearl
    {
      id: "midnight-gold",
      label: "Midnight Gold",
      palette: {
        ivory: "#f8f5f0",
        cream: "#edeae4",
        linen: "#dddad4",
        sand: "#c0bcb4",
        stone: "#8a8680",
        earth: "#5e5a54",
        charcoal: "#2a2824",
        night: "#121110",
        sage: "#c5a55a",
        sageLight: "#ddc07a",
        sageDark: "#9e7e3a",
        accent: "#c5a55a",
        accent2: "#ddc07a",
        bg: "#f8f5f0",
        surface: "#ffffff",
        text: "#2a2824",
        text2: "#5e5a54",
        text3: "#8a8680",
        border: "#dddad4",
      },
      glass: {
        frostedBg: "rgba(248, 245, 240, 0.55)",
        frostedBgScrolled: "rgba(248, 245, 240, 0.95)",
        mobileNavBg: "rgba(248, 245, 240, 0.97)",
        heroOverlayColor: "#121110",
        accentTint: "rgba(197, 165, 90, 0.08)",
        accentHoverBg: "rgba(197, 165, 90, 0.05)",
      },
      fontPair: "playfair_dmsans",
      spacingScale: "balanced",
      maxWidth: "1140px",
      radiusScale: "sharp",
      shadowIntensity: "medium",
      buttonStyle: "solid",
      motif: "none",
    },
    // Emerald Velvet — emerald, ivory, charcoal
    {
      id: "emerald-velvet",
      label: "Emerald Velvet",
      palette: {
        ivory: "#f6f8f4",
        cream: "#eaede6",
        linen: "#dce0d6",
        sand: "#bcc2b4",
        stone: "#868c80",
        earth: "#5a6054",
        charcoal: "#282c24",
        night: "#101210",
        sage: "#3a6848",
        sageLight: "#5a8a68",
        sageDark: "#244832",
        accent: "#3a6848",
        accent2: "#c5a55a",
        bg: "#f6f8f4",
        surface: "#ffffff",
        text: "#282c24",
        text2: "#5a6054",
        text3: "#868c80",
        border: "#dce0d6",
      },
      glass: {
        frostedBg: "rgba(246, 248, 244, 0.55)",
        frostedBgScrolled: "rgba(246, 248, 244, 0.95)",
        mobileNavBg: "rgba(246, 248, 244, 0.97)",
        heroOverlayColor: "#101210",
        accentTint: "rgba(58, 104, 72, 0.08)",
        accentHoverBg: "rgba(58, 104, 72, 0.05)",
      },
      fontPair: "playfair_dmsans",
      spacingScale: "balanced",
      maxWidth: "1140px",
      radiusScale: "sharp",
      shadowIntensity: "medium",
      buttonStyle: "solid",
      motif: "none",
    },
    // Plum Noir — deep plum, graphite, soft gold
    {
      id: "plum-noir",
      label: "Plum Noir",
      palette: {
        ivory: "#f8f4f6",
        cream: "#ede8ea",
        linen: "#e0d8dc",
        sand: "#c4bac0",
        stone: "#8e848a",
        earth: "#625860",
        charcoal: "#2e282c",
        night: "#141214",
        sage: "#6a4a60",
        sageLight: "#8a6a80",
        sageDark: "#4a2a40",
        accent: "#6a4a60",
        accent2: "#c5a55a",
        bg: "#f8f4f6",
        surface: "#ffffff",
        text: "#2e282c",
        text2: "#625860",
        text3: "#8e848a",
        border: "#e0d8dc",
      },
      glass: {
        frostedBg: "rgba(248, 244, 246, 0.55)",
        frostedBgScrolled: "rgba(248, 244, 246, 0.95)",
        mobileNavBg: "rgba(248, 244, 246, 0.97)",
        heroOverlayColor: "#141214",
        accentTint: "rgba(106, 74, 96, 0.08)",
        accentHoverBg: "rgba(106, 74, 96, 0.05)",
      },
      fontPair: "playfair_dmsans",
      spacingScale: "balanced",
      maxWidth: "1140px",
      radiusScale: "sharp",
      shadowIntensity: "medium",
      buttonStyle: "solid",
      motif: "none",
    },
  ],

  accentSwatches: [
    { hex: "#c5a55a", label: "Champagne Gold" },
    { hex: "#3a6848", label: "Emerald" },
    { hex: "#6a4a60", label: "Plum" },
    { hex: "#2a2824", label: "Noir" },
    { hex: "#8a7040", label: "Antique Bronze" },
  ],

  // Section themes — recolor the feature surfaces (nav, hero info cards,
  // countdown strip, RSVP, schedule, footer) as a group. Each entry needs only
  // a (dark) panel color; the accent stays champagne gold (primaryColor-driven).
  // The unthemed default is the "Light" look (mixed light/dark surfaces) — see
  // `defaultSectionTheme` below; selecting nothing keeps it.
  sectionThemes: [
    {
      // Soft slate dark — a cohesive, less-blackish dark band across all the
      // feature surfaces (vs the Light default, where only some are dark).
      // id "midnight-slate" (not "midnight-gold") to avoid colliding with the
      // themePacks[0] id of the same name; the user-facing label is unchanged.
      id: "midnight-slate",
      label: "Midnight Gold",
      panel: "#253139",
    },
    {
      id: "amethyst",
      label: "Amethyst",
      panel: "#34005B",
    },
    {
      // Blackened emerald — a black-tie green that keeps the gold accent.
      // Dark panel, so it rides the standard light-on-dark path.
      id: "emerald-noir",
      label: "Emerald Noir",
      panel: "#0E2E26",
    },
    {
      // The one LIGHT panel: a cerulean field with deep-ink type (gold can't
      // survive at ~1.2:1 on this panel, so the accent is pinned to a near-ink
      // navy). Triggers the generator's dark-on-light path; the hero stays
      // cinematic via the --lux-hero-* tokens.
      id: "cerulean",
      label: "Cerulean",
      panel: "#55a1bf",
      accent: "#0a1f2b",
    },
  ],

  // The default (no section theme) option in the picker.
  defaultSectionTheme: { label: "Light", swatch: "#f8f5f0" },

  defaultSectionOrder: [
    "details",
    "schedule",
    "gallery",
    "weddingParty",
    "registry",
    "faq",
    "rsvp",
  ],

  heroImageTip:
    "This template works best with a light or bright hero image — the dark cinematic overlay creates rich contrast. Very dark images may reduce text visibility.",

  couplePhotoTip:
    "Upload a head-and-shoulders portrait — Grand Luxe clips the photo to a heart silhouette, so wide framing or full-body shots may crop awkwardly.",

  supportsPrelude: true,
};
