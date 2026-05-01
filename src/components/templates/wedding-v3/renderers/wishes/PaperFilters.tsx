/**
 * SVG <defs> for the ripped-paper + tape effects on Wedding Wishes cards.
 *
 * Mounted once at the template root so the filters are reachable by url(#id)
 * from every wish card without re-defining them per-instance. Three paper
 * variants and three tape variants ensure no two adjacent cards tear
 * identically — per-card filter selection happens via :nth-child rules in
 * WishesRenderer.module.css.
 */
export function PaperFilters() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <defs>
        <filter id="ww-paper-tear-a" x="-6%" y="-6%" width="112%" height="115%">
          <feTurbulence type="fractalNoise" baseFrequency="0.025 0.07" numOctaves={3} seed={4} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={5} />
        </filter>
        <filter id="ww-paper-tear-b" x="-6%" y="-6%" width="112%" height="115%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022 0.06" numOctaves={3} seed={11} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={5.6} />
        </filter>
        <filter id="ww-paper-tear-c" x="-6%" y="-6%" width="112%" height="115%">
          <feTurbulence type="fractalNoise" baseFrequency="0.028 0.05" numOctaves={3} seed={19} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={4.6} />
        </filter>
        <filter id="ww-tape-edge-a" x="-10%" y="-30%" width="120%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65 0.18" numOctaves={2} seed={7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={3} />
        </filter>
        <filter id="ww-tape-edge-b" x="-10%" y="-30%" width="120%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7 0.2" numOctaves={2} seed={13} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={2.6} />
        </filter>
        <filter id="ww-tape-edge-c" x="-10%" y="-30%" width="120%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.55 0.16" numOctaves={2} seed={23} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={3.4} />
        </filter>
      </defs>
    </svg>
  );
}
