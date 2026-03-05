import { MountainDivider } from "./MountainDivider";

type FooterSkylineProps = {
  color?: string;
};

/**
 * Footer Skyline — POC-parity
 *
 * Filled mountain SVG transitioning from ivory to cream background.
 * Uses MountainDivider with "footer" variant.
 */
export function FooterSkyline(_props: FooterSkylineProps) {
  return <MountainDivider variant="footer" />;
}
