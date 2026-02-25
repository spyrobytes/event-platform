import styles from "./FooterSkyline.module.css";

type FooterSkylineProps = {
  color?: string;
};

/**
 * Mountain skyline SVG above the footer.
 * Subtle parallax scroll effect via CSS Module.
 */
export function FooterSkyline({ color }: FooterSkylineProps) {
  const fillColor = color || "var(--wedding-primary, #B76E79)";

  return (
    <div className={styles.container} aria-hidden="true">
      <svg
        className={styles.skyline}
        viewBox="0 0 1440 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* Far mountains */}
        <path
          d="M0 120L80 100C160 80 320 40 480 30C640 20 800 40 960 50C1120 60 1280 60 1360 60L1440 60V120H0Z"
          fill={fillColor}
          fillOpacity="0.1"
        />
        {/* Mid mountains */}
        <path
          d="M0 120L100 90C200 60 400 30 600 24C800 18 1000 36 1200 48C1300 54 1400 57 1440 58V120H0Z"
          fill={fillColor}
          fillOpacity="0.15"
        />
        {/* Near mountains */}
        <path
          d="M0 120L120 80C240 40 480 20 720 16C960 12 1200 24 1320 30L1440 36V120H0Z"
          fill={fillColor}
          fillOpacity="0.08"
        />
      </svg>
    </div>
  );
}
