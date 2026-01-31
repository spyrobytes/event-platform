/**
 * Invitation Theme Tokens
 *
 * Defines color palettes and typography for elegant wedding invitations.
 * These CSS variables are applied inline to prevent theme flicker.
 */

// =============================================================================
// THEME DEFINITIONS
// =============================================================================

// Subtle noise pattern as inline SVG (no external files needed)
const PAPER_TEXTURE_LIGHT = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`;
const PAPER_TEXTURE_DARK = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`;

export const themes = {
  ivory: {
    "--inv-paper-bg": "#FFFFF8",
    "--inv-paper-texture": PAPER_TEXTURE_LIGHT,
    "--inv-text-primary": "#2C2C2C",
    "--inv-text-secondary": "#6B6B6B",
    "--inv-accent": "#D4AF37",
    "--inv-envelope-color": "#F5F5DC",
    "--inv-card-bg": "#FFFEF9",
    "--inv-border": "#E8E4D9",
  },
  blush: {
    "--inv-paper-bg": "#FFF5F5",
    "--inv-paper-texture": PAPER_TEXTURE_LIGHT,
    "--inv-text-primary": "#4A4A4A",
    "--inv-text-secondary": "#8A8A8A",
    "--inv-accent": "#D4A5A5",
    "--inv-envelope-color": "#FFE4E4",
    "--inv-card-bg": "#FFFAFA",
    "--inv-border": "#F0D8D8",
  },
  sage: {
    "--inv-paper-bg": "#F5F8F5",
    "--inv-paper-texture": PAPER_TEXTURE_LIGHT,
    "--inv-text-primary": "#3A4A3A",
    "--inv-text-secondary": "#6A7A6A",
    "--inv-accent": "#8B9B8B",
    "--inv-envelope-color": "#E8EDE8",
    "--inv-card-bg": "#FAFCFA",
    "--inv-border": "#D0DDD0",
  },
  midnight: {
    "--inv-paper-bg": "#1A1A2E",
    "--inv-paper-texture": PAPER_TEXTURE_DARK,
    "--inv-text-primary": "#EEEEF0",
    "--inv-text-secondary": "#B8B8C0",
    "--inv-accent": "#FFD700",
    "--inv-envelope-color": "#252540",
    "--inv-card-bg": "#2A2A40",
    "--inv-border": "#3A3A50",
  },
  champagne: {
    "--inv-paper-bg": "#F7F3E9",
    "--inv-paper-texture": PAPER_TEXTURE_LIGHT,
    "--inv-text-primary": "#4A3F35",
    "--inv-text-secondary": "#7A6F65",
    "--inv-accent": "#C9A961",
    "--inv-envelope-color": "#E8DFC8",
    "--inv-card-bg": "#FAF6ED",
    "--inv-border": "#D8CFC0",
  },
} as const;

export type ThemeId = keyof typeof themes;
export type ThemeTokens = (typeof themes)[ThemeId];

// =============================================================================
// GOLDEN CARD REVEAL THEME TOKENS
// =============================================================================

/**
 * Theme tokens specific to the GoldenCardReveal template.
 * Maps existing theme IDs to the template's visual style.
 */
export const goldenCardThemes = {
  ivory: {
    "--gcr-card-bg": "linear-gradient(145deg, #faf8f5 0%, #f5f0e8 50%, #ebe5d9 100%)",
    "--gcr-card-border": "#d4af37",
    "--gcr-card-shadow": "rgba(212, 175, 55, 0.3)",
    "--gcr-seal-bg": "linear-gradient(145deg, #c9a227 0%, #d4af37 30%, #f4d03f 50%, #d4af37 70%, #a08520 100%)",
    "--gcr-seal-border": "#8b7355",
    "--gcr-seal-text": "#3d2914",
    "--gcr-damask-color": "rgba(212, 175, 55, 0.12)",
    "--gcr-damask-accent": "rgba(212, 175, 55, 0.25)",
    "--gcr-text-primary": "#2c1810",
    "--gcr-text-secondary": "#5c4a3d",
    "--gcr-text-accent": "#8b6914",
    "--gcr-confetti-1": "#d4af37",
    "--gcr-confetti-2": "#f4d03f",
    "--gcr-confetti-3": "#fff8e7",
    "--gcr-confetti-4": "#c9a227",
    "--gcr-confetti-5": "#8b6914",
    "--gcr-shimmer-color": "rgba(255, 248, 231, 0.6)",
  },
  blush: {
    "--gcr-card-bg": "linear-gradient(145deg, #fdf8f8 0%, #faf0f0 50%, #f5e8e8 100%)",
    "--gcr-card-border": "#d4a5a5",
    "--gcr-card-shadow": "rgba(212, 165, 165, 0.3)",
    "--gcr-seal-bg": "linear-gradient(145deg, #c97b7b 0%, #d4a5a5 30%, #e8bfbf 50%, #d4a5a5 70%, #b06060 100%)",
    "--gcr-seal-border": "#8b6b6b",
    "--gcr-seal-text": "#3d1414",
    "--gcr-damask-color": "rgba(212, 165, 165, 0.12)",
    "--gcr-damask-accent": "rgba(212, 165, 165, 0.25)",
    "--gcr-text-primary": "#2c1818",
    "--gcr-text-secondary": "#5c4343",
    "--gcr-text-accent": "#8b5a5a",
    "--gcr-confetti-1": "#d4a5a5",
    "--gcr-confetti-2": "#e8bfbf",
    "--gcr-confetti-3": "#fff0f0",
    "--gcr-confetti-4": "#c97b7b",
    "--gcr-confetti-5": "#b06060",
    "--gcr-shimmer-color": "rgba(255, 240, 240, 0.6)",
  },
  sage: {
    "--gcr-card-bg": "linear-gradient(145deg, #f5f8f5 0%, #eef3ee 50%, #e4ebe4 100%)",
    "--gcr-card-border": "#8b9b8b",
    "--gcr-card-shadow": "rgba(139, 155, 139, 0.3)",
    "--gcr-seal-bg": "linear-gradient(145deg, #6b7b6b 0%, #8b9b8b 30%, #a8b8a8 50%, #8b9b8b 70%, #5a6a5a 100%)",
    "--gcr-seal-border": "#5a6a5a",
    "--gcr-seal-text": "#2a3a2a",
    "--gcr-damask-color": "rgba(139, 155, 139, 0.12)",
    "--gcr-damask-accent": "rgba(139, 155, 139, 0.25)",
    "--gcr-text-primary": "#2c3a2c",
    "--gcr-text-secondary": "#4a5a4a",
    "--gcr-text-accent": "#5a7a5a",
    "--gcr-confetti-1": "#8b9b8b",
    "--gcr-confetti-2": "#a8b8a8",
    "--gcr-confetti-3": "#e8f0e8",
    "--gcr-confetti-4": "#6b7b6b",
    "--gcr-confetti-5": "#5a6a5a",
    "--gcr-shimmer-color": "rgba(232, 240, 232, 0.6)",
  },
  midnight: {
    "--gcr-card-bg": "linear-gradient(145deg, #f8f9fc 0%, #eef1f7 50%, #e4e8f0 100%)",
    "--gcr-card-border": "#8a9bb8",
    "--gcr-card-shadow": "rgba(138, 155, 184, 0.3)",
    "--gcr-seal-bg": "linear-gradient(145deg, #5a6d8a 0%, #8a9bb8 30%, #b8c4d8 50%, #8a9bb8 70%, #3d4d66 100%)",
    "--gcr-seal-border": "#3d4d66",
    "--gcr-seal-text": "#1a1a2e",
    "--gcr-damask-color": "rgba(138, 155, 184, 0.12)",
    "--gcr-damask-accent": "rgba(138, 155, 184, 0.25)",
    "--gcr-text-primary": "#1a1a2e",
    "--gcr-text-secondary": "#4a5568",
    "--gcr-text-accent": "#5a6d8a",
    "--gcr-confetti-1": "#8a9bb8",
    "--gcr-confetti-2": "#b8c4d8",
    "--gcr-confetti-3": "#e8ecf4",
    "--gcr-confetti-4": "#c0c0c0",
    "--gcr-confetti-5": "#5a6d8a",
    "--gcr-shimmer-color": "rgba(232, 236, 244, 0.6)",
  },
  champagne: {
    "--gcr-card-bg": "linear-gradient(145deg, #faf6ed 0%, #f5f0e3 50%, #ebe5d5 100%)",
    "--gcr-card-border": "#c9a961",
    "--gcr-card-shadow": "rgba(201, 169, 97, 0.3)",
    "--gcr-seal-bg": "linear-gradient(145deg, #b89940 0%, #c9a961 30%, #e0c080 50%, #c9a961 70%, #9a8030 100%)",
    "--gcr-seal-border": "#8a7a50",
    "--gcr-seal-text": "#3d3520",
    "--gcr-damask-color": "rgba(201, 169, 97, 0.12)",
    "--gcr-damask-accent": "rgba(201, 169, 97, 0.25)",
    "--gcr-text-primary": "#3d3520",
    "--gcr-text-secondary": "#6a5a40",
    "--gcr-text-accent": "#8a7a30",
    "--gcr-confetti-1": "#c9a961",
    "--gcr-confetti-2": "#e0c080",
    "--gcr-confetti-3": "#fff8e0",
    "--gcr-confetti-4": "#b89940",
    "--gcr-confetti-5": "#9a8030",
    "--gcr-shimmer-color": "rgba(255, 248, 224, 0.6)",
  },
} as const;

export type GoldenCardThemeTokens = (typeof goldenCardThemes)[ThemeId];

/**
 * Get golden card theme tokens for a theme ID.
 */
export function getGoldenCardThemeTokens(themeId: ThemeId): GoldenCardThemeTokens {
  return goldenCardThemes[themeId] ?? goldenCardThemes.ivory;
}

/**
 * Generates inline CSS string for golden card theme tokens.
 */
export function getGoldenCardThemeStyleString(themeId: ThemeId): string {
  const tokens = goldenCardThemes[themeId] ?? goldenCardThemes.ivory;
  return Object.entries(tokens)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}

// =============================================================================
// FLIP FLAP REVEAL THEME TOKENS
// =============================================================================

/**
 * Theme tokens specific to the FlipFlapReveal template.
 * Book-style flip card with photo cover and wax seal.
 * Maps existing theme IDs to the template's visual style.
 */
export const flipFlapThemes = {
  ivory: {
    "--ffr-bg-page": "#f5f0e8",
    "--ffr-bg-page-pattern": "rgba(139, 119, 101, 0.03)",
    "--ffr-card-bg": "linear-gradient(145deg, #fdfbf7 0%, #f8f4ed 50%, #f3efe6 100%)",
    "--ffr-card-border": "#d4c8b8",
    "--ffr-card-shadow": "rgba(139, 119, 101, 0.15)",
    "--ffr-card-shadow-deep": "rgba(80, 60, 40, 0.25)",
    "--ffr-flap-bg": "linear-gradient(165deg, #f9f6f0 0%, #f0ebe2 40%, #e8e2d8 100%)",
    "--ffr-flap-border": "#c9bba8",
    "--ffr-flap-shadow": "rgba(139, 119, 101, 0.3)",
    "--ffr-flap-back-bg": "linear-gradient(145deg, #f0ebe2 0%, #e8e2d8 100%)",
    "--ffr-photo-border": "#c9bba8",
    "--ffr-photo-frame-bg": "linear-gradient(145deg, #fdfbf7, #f3efe6)",
    "--ffr-photo-vignette": "rgba(60, 45, 30, 0.4)",
    "--ffr-seal-bg": "linear-gradient(145deg, #c4a574 0%, #a68856 50%, #8b7045 100%)",
    "--ffr-seal-border": "#7d6340",
    "--ffr-seal-text": "#f5f0e8",
    "--ffr-seal-glow": "rgba(196, 165, 116, 0.5)",
    "--ffr-text-primary": "#3d3229",
    "--ffr-text-secondary": "#6b5d4d",
    "--ffr-text-muted": "#8b7d6b",
    "--ffr-text-accent": "#a68856",
    "--ffr-text-on-photo": "rgba(255, 255, 255, 0.95)",
    "--ffr-text-on-photo-shadow": "rgba(0, 0, 0, 0.6)",
    "--ffr-flourish-color": "#c9bba8",
    "--ffr-flourish-accent": "#a68856",
    "--ffr-btn-bg": "linear-gradient(145deg, #a68856 0%, #8b7045 100%)",
    "--ffr-btn-text": "#fff",
    "--ffr-btn-hover": "linear-gradient(145deg, #b8975f 0%, #9a7d4f 100%)",
    "--ffr-confetti-1": "#c4a574",
    "--ffr-confetti-2": "#a68856",
    "--ffr-confetti-3": "#d4c8b8",
    "--ffr-confetti-4": "#e8dfd2",
    "--ffr-confetti-5": "#8b7045",
  },
  blush: {
    "--ffr-bg-page": "#faf5f5",
    "--ffr-bg-page-pattern": "rgba(180, 130, 130, 0.04)",
    "--ffr-card-bg": "linear-gradient(145deg, #fffafa 0%, #fdf5f5 50%, #f9eeee 100%)",
    "--ffr-card-border": "#e8d0d0",
    "--ffr-card-shadow": "rgba(180, 130, 130, 0.15)",
    "--ffr-card-shadow-deep": "rgba(120, 80, 80, 0.2)",
    "--ffr-flap-bg": "linear-gradient(165deg, #fdf8f8 0%, #f5ebeb 40%, #ede2e2 100%)",
    "--ffr-flap-border": "#dcc4c4",
    "--ffr-flap-shadow": "rgba(180, 130, 130, 0.25)",
    "--ffr-flap-back-bg": "linear-gradient(145deg, #f5ebeb 0%, #ede2e2 100%)",
    "--ffr-photo-border": "#dcc4c4",
    "--ffr-photo-frame-bg": "linear-gradient(145deg, #fffafa, #f9eeee)",
    "--ffr-photo-vignette": "rgba(80, 50, 50, 0.35)",
    "--ffr-seal-bg": "linear-gradient(145deg, #d4a5a5 0%, #c48888 50%, #b06b6b 100%)",
    "--ffr-seal-border": "#9a5858",
    "--ffr-seal-text": "#fff",
    "--ffr-seal-glow": "rgba(196, 136, 136, 0.5)",
    "--ffr-text-primary": "#4a3636",
    "--ffr-text-secondary": "#7a5e5e",
    "--ffr-text-muted": "#a08888",
    "--ffr-text-accent": "#b87070",
    "--ffr-text-on-photo": "rgba(255, 255, 255, 0.95)",
    "--ffr-text-on-photo-shadow": "rgba(0, 0, 0, 0.6)",
    "--ffr-flourish-color": "#dcc4c4",
    "--ffr-flourish-accent": "#c48888",
    "--ffr-btn-bg": "linear-gradient(145deg, #c48888 0%, #b06b6b 100%)",
    "--ffr-btn-text": "#fff",
    "--ffr-btn-hover": "linear-gradient(145deg, #d49999 0%, #c07878 100%)",
    "--ffr-confetti-1": "#d4a5a5",
    "--ffr-confetti-2": "#c48888",
    "--ffr-confetti-3": "#e8d0d0",
    "--ffr-confetti-4": "#f5ebeb",
    "--ffr-confetti-5": "#b06b6b",
  },
  sage: {
    "--ffr-bg-page": "#f0f4f0",
    "--ffr-bg-page-pattern": "rgba(100, 130, 100, 0.04)",
    "--ffr-card-bg": "linear-gradient(145deg, #f8faf8 0%, #f2f6f2 50%, #eaf0ea 100%)",
    "--ffr-card-border": "#c8d8c8",
    "--ffr-card-shadow": "rgba(100, 130, 100, 0.15)",
    "--ffr-card-shadow-deep": "rgba(60, 80, 60, 0.2)",
    "--ffr-flap-bg": "linear-gradient(165deg, #f5f9f5 0%, #e8f0e8 40%, #dde8dd 100%)",
    "--ffr-flap-border": "#b8ccb8",
    "--ffr-flap-shadow": "rgba(100, 130, 100, 0.25)",
    "--ffr-flap-back-bg": "linear-gradient(145deg, #e8f0e8 0%, #dde8dd 100%)",
    "--ffr-photo-border": "#b8ccb8",
    "--ffr-photo-frame-bg": "linear-gradient(145deg, #f8faf8, #eaf0ea)",
    "--ffr-photo-vignette": "rgba(40, 60, 40, 0.35)",
    "--ffr-seal-bg": "linear-gradient(145deg, #8faa8f 0%, #749874 50%, #5a805a 100%)",
    "--ffr-seal-border": "#4a6a4a",
    "--ffr-seal-text": "#fff",
    "--ffr-seal-glow": "rgba(116, 152, 116, 0.5)",
    "--ffr-text-primary": "#2e3e2e",
    "--ffr-text-secondary": "#4a5f4a",
    "--ffr-text-muted": "#6a846a",
    "--ffr-text-accent": "#5a805a",
    "--ffr-text-on-photo": "rgba(255, 255, 255, 0.95)",
    "--ffr-text-on-photo-shadow": "rgba(0, 0, 0, 0.6)",
    "--ffr-flourish-color": "#b8ccb8",
    "--ffr-flourish-accent": "#749874",
    "--ffr-btn-bg": "linear-gradient(145deg, #749874 0%, #5a805a 100%)",
    "--ffr-btn-text": "#fff",
    "--ffr-btn-hover": "linear-gradient(145deg, #84a884 0%, #6a906a 100%)",
    "--ffr-confetti-1": "#8faa8f",
    "--ffr-confetti-2": "#749874",
    "--ffr-confetti-3": "#c8d8c8",
    "--ffr-confetti-4": "#dde8dd",
    "--ffr-confetti-5": "#5a805a",
  },
  midnight: {
    "--ffr-bg-page": "#1a1f2e",
    "--ffr-bg-page-pattern": "rgba(180, 190, 210, 0.03)",
    "--ffr-card-bg": "linear-gradient(145deg, #252b3d 0%, #1e2433 50%, #181d2a 100%)",
    "--ffr-card-border": "#3d4560",
    "--ffr-card-shadow": "rgba(0, 0, 0, 0.3)",
    "--ffr-card-shadow-deep": "rgba(0, 0, 0, 0.5)",
    "--ffr-flap-bg": "linear-gradient(165deg, #2a3145 0%, #232840 40%, #1c2035 100%)",
    "--ffr-flap-border": "#4a5575",
    "--ffr-flap-shadow": "rgba(0, 0, 0, 0.4)",
    "--ffr-flap-back-bg": "linear-gradient(145deg, #232840 0%, #1c2035 100%)",
    "--ffr-photo-border": "#4a5575",
    "--ffr-photo-frame-bg": "linear-gradient(145deg, #2a3145, #1c2035)",
    "--ffr-photo-vignette": "rgba(10, 15, 30, 0.5)",
    "--ffr-seal-bg": "linear-gradient(145deg, #d4b896 0%, #c4a57a 50%, #a8895f 100%)",
    "--ffr-seal-border": "#8a7048",
    "--ffr-seal-text": "#1a1f2e",
    "--ffr-seal-glow": "rgba(212, 184, 150, 0.4)",
    "--ffr-text-primary": "#e8eaf0",
    "--ffr-text-secondary": "#b8bcc8",
    "--ffr-text-muted": "#8890a0",
    "--ffr-text-accent": "#d4b896",
    "--ffr-text-on-photo": "rgba(255, 255, 255, 0.95)",
    "--ffr-text-on-photo-shadow": "rgba(0, 0, 0, 0.7)",
    "--ffr-flourish-color": "#4a5575",
    "--ffr-flourish-accent": "#c4a57a",
    "--ffr-btn-bg": "linear-gradient(145deg, #c4a57a 0%, #a8895f 100%)",
    "--ffr-btn-text": "#1a1f2e",
    "--ffr-btn-hover": "linear-gradient(145deg, #d4b88a 0%, #b8996a 100%)",
    "--ffr-confetti-1": "#d4b896",
    "--ffr-confetti-2": "#c4a57a",
    "--ffr-confetti-3": "#8890a0",
    "--ffr-confetti-4": "#5a6280",
    "--ffr-confetti-5": "#a8895f",
  },
  champagne: {
    "--ffr-bg-page": "#f7f3e9",
    "--ffr-bg-page-pattern": "rgba(160, 130, 80, 0.04)",
    "--ffr-card-bg": "linear-gradient(145deg, #faf6ed 0%, #f5f0e3 50%, #ebe5d5 100%)",
    "--ffr-card-border": "#d8cfc0",
    "--ffr-card-shadow": "rgba(160, 130, 80, 0.15)",
    "--ffr-card-shadow-deep": "rgba(100, 80, 40, 0.25)",
    "--ffr-flap-bg": "linear-gradient(165deg, #f7f3e9 0%, #ede6d8 40%, #e5ddc8 100%)",
    "--ffr-flap-border": "#c9bfa8",
    "--ffr-flap-shadow": "rgba(160, 130, 80, 0.3)",
    "--ffr-flap-back-bg": "linear-gradient(145deg, #ede6d8 0%, #e5ddc8 100%)",
    "--ffr-photo-border": "#c9bfa8",
    "--ffr-photo-frame-bg": "linear-gradient(145deg, #faf6ed, #ebe5d5)",
    "--ffr-photo-vignette": "rgba(60, 50, 30, 0.4)",
    "--ffr-seal-bg": "linear-gradient(145deg, #c9a961 0%, #b89940 50%, #9a8030 100%)",
    "--ffr-seal-border": "#8a7a30",
    "--ffr-seal-text": "#faf6ed",
    "--ffr-seal-glow": "rgba(201, 169, 97, 0.5)",
    "--ffr-text-primary": "#3d3520",
    "--ffr-text-secondary": "#6a5a40",
    "--ffr-text-muted": "#8a7a60",
    "--ffr-text-accent": "#9a8030",
    "--ffr-text-on-photo": "rgba(255, 255, 255, 0.95)",
    "--ffr-text-on-photo-shadow": "rgba(0, 0, 0, 0.6)",
    "--ffr-flourish-color": "#c9bfa8",
    "--ffr-flourish-accent": "#b89940",
    "--ffr-btn-bg": "linear-gradient(145deg, #b89940 0%, #9a8030 100%)",
    "--ffr-btn-text": "#fff",
    "--ffr-btn-hover": "linear-gradient(145deg, #c9a950 0%, #aa9040 100%)",
    "--ffr-confetti-1": "#c9a961",
    "--ffr-confetti-2": "#e0c080",
    "--ffr-confetti-3": "#d8cfc0",
    "--ffr-confetti-4": "#fff8e0",
    "--ffr-confetti-5": "#9a8030",
  },
} as const;

export type FlipFlapThemeTokens = (typeof flipFlapThemes)[ThemeId];

/**
 * Get flip flap theme tokens for a theme ID.
 */
export function getFlipFlapThemeTokens(themeId: ThemeId): FlipFlapThemeTokens {
  return flipFlapThemes[themeId] ?? flipFlapThemes.ivory;
}

/**
 * Generates inline CSS string for flip flap theme tokens.
 */
export function getFlipFlapThemeStyleString(themeId: ThemeId): string {
  const tokens = flipFlapThemes[themeId] ?? flipFlapThemes.ivory;
  return Object.entries(tokens)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}

// =============================================================================
// TYPOGRAPHY PAIRS
// =============================================================================

/**
 * Font family definitions for invitation typography.
 * Each pair includes heading, script, and body fonts.
 */
export const typographyPairs = {
  classic: {
    heading: "'Playfair Display', 'Times New Roman', serif",
    script: "'Dancing Script', cursive, serif",
    body: "'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  modern: {
    heading: "'Montserrat', -apple-system, sans-serif",
    script: "'Allura', cursive, serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  traditional: {
    heading: "'Cormorant Garamond', 'Times New Roman', serif",
    script: "'Great Vibes', cursive, serif",
    body: "'Crimson Text', 'Times New Roman', serif",
  },
} as const;

export type TypographyPair = keyof typeof typographyPairs;
export type TypographyTokens = (typeof typographyPairs)[TypographyPair];

// =============================================================================
// THEME UTILITIES
// =============================================================================

/**
 * Generates inline CSS string for theme tokens.
 * Used to apply theme without flicker on SSR.
 */
export function getThemeStyleString(themeId: ThemeId): string {
  const tokens = themes[themeId];
  if (!tokens) {
    console.warn(`Unknown theme ID: ${themeId}, falling back to ivory`);
    return getThemeStyleString("ivory");
  }

  return Object.entries(tokens)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}

/**
 * Generates typography CSS variables for a typography pair.
 */
export function getTypographyStyleString(pair: TypographyPair): string {
  const fonts = typographyPairs[pair];
  if (!fonts) {
    console.warn(`Unknown typography pair: ${pair}, falling back to classic`);
    return getTypographyStyleString("classic");
  }

  return [
    `--inv-font-heading: ${fonts.heading}`,
    `--inv-font-script: ${fonts.script}`,
    `--inv-font-body: ${fonts.body}`,
  ].join("; ");
}

/**
 * Generates complete style string for theme + typography.
 */
export function getInvitationStyleString(
  themeId: ThemeId,
  typography: TypographyPair
): string {
  return `${getThemeStyleString(themeId)}; ${getTypographyStyleString(typography)}`;
}

/**
 * Returns theme tokens as an object (for use in JavaScript).
 */
export function getThemeTokens(themeId: ThemeId): ThemeTokens {
  return themes[themeId] ?? themes.ivory;
}

/**
 * Returns typography tokens as an object.
 */
export function getTypographyTokens(pair: TypographyPair): TypographyTokens {
  return typographyPairs[pair] ?? typographyPairs.classic;
}

/**
 * Returns invitation style as a React-compatible style object.
 * Use this for inline styles in React components.
 */
export function getInvitationStyleObject(
  themeId: ThemeId,
  typography: TypographyPair
): React.CSSProperties {
  const themeTokens = themes[themeId] ?? themes.ivory;
  const fonts = typographyPairs[typography] ?? typographyPairs.classic;

  return {
    "--inv-paper-bg": themeTokens["--inv-paper-bg"],
    "--inv-paper-texture": themeTokens["--inv-paper-texture"],
    "--inv-text-primary": themeTokens["--inv-text-primary"],
    "--inv-text-secondary": themeTokens["--inv-text-secondary"],
    "--inv-accent": themeTokens["--inv-accent"],
    "--inv-envelope-color": themeTokens["--inv-envelope-color"],
    "--inv-card-bg": themeTokens["--inv-card-bg"],
    "--inv-border": themeTokens["--inv-border"],
    "--inv-font-heading": fonts.heading,
    "--inv-font-script": fonts.script,
    "--inv-font-body": fonts.body,
  } as React.CSSProperties;
}

// =============================================================================
// THEME METADATA (for UI display)
// =============================================================================

export const themeMetadata: Record<
  ThemeId,
  { name: string; description: string }
> = {
  ivory: {
    name: "Ivory",
    description: "Classic elegance with warm cream tones",
  },
  blush: {
    name: "Blush",
    description: "Soft romantic pink palette",
  },
  sage: {
    name: "Sage",
    description: "Natural, earthy green tones",
  },
  midnight: {
    name: "Midnight",
    description: "Dramatic dark theme with gold accents",
  },
  champagne: {
    name: "Champagne",
    description: "Warm golden sophistication",
  },
};

export const typographyMetadata: Record<
  TypographyPair,
  { name: string; description: string }
> = {
  classic: {
    name: "Classic",
    description: "Playfair Display + Dancing Script",
  },
  modern: {
    name: "Modern",
    description: "Montserrat + Allura",
  },
  traditional: {
    name: "Traditional",
    description: "Cormorant Garamond + Great Vibes",
  },
};

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Type guard for valid theme IDs
 */
export function isValidThemeId(id: string): id is ThemeId {
  return id in themes;
}

/**
 * Type guard for valid typography pairs
 */
export function isValidTypographyPair(pair: string): pair is TypographyPair {
  return pair in typographyPairs;
}
