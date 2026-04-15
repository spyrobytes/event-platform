import type { V2VariantConfig } from "./types";

export const gardenRomance: V2VariantConfig = {
  id: "garden_romance",
  displayName: "Garden Romance",
  description: "Lush sage and gold with organic botanical flourishes",
  category: "classic",
  bestFor: ["garden wedding", "outdoor ceremony", "spring", "summer"],
  fontPair: "serif_sans",
  palette: {
    // Uses all defaults — this is the baseline V2 design
  },
  glass: {
    frostedBg: "rgba(248, 245, 240, 0.55)",
    frostedBgScrolled: "rgba(248, 245, 240, 0.92)",
    mobileNavBg: "rgba(248, 245, 240, 0.97)",
    heroOverlayColor: "#f8f5f0",
    accentTint: "rgba(122, 140, 114, 0.08)",
    accentHoverBg: "rgba(122, 140, 114, 0.06)",
  },
  chromeDefaults: {
    topbar: true,
    scrollProgress: true,
    mountainDividers: true,
    footerSkyline: true,
    botanicals: true,
    botanicalVariant: "sage",
  },
  accentSwatches: [
    { hex: "#7a8c72", label: "Sage" },
    { hex: "#5c6b55", label: "Forest Sage" },
    { hex: "#8fa484", label: "Fern" },
    { hex: "#6b7f62", label: "Moss" },
    { hex: "#91a088", label: "Eucalyptus" },
  ],
};
