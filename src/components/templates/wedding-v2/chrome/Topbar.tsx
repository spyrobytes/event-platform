"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./Topbar.module.css";

type TopbarProps = {
  monogram?: string;
  coupleNames?: string;
  accentColor: string;
};

/**
 * Fixed-position bar with monogram, couple names.
 * Hides on scroll down, shows on scroll up (standard UX pattern).
 */
export function Topbar({ monogram, coupleNames, accentColor }: TopbarProps) {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      // Show when scrolling up or at top, hide when scrolling down past 100px
      if (currentY < 100) {
        setVisible(true);
      } else if (currentY < lastScrollY.current) {
        setVisible(true);
      } else if (currentY > lastScrollY.current + 5) {
        setVisible(false);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`${styles.topbar} ${visible ? styles.visible : styles.hidden}`}
      style={{ borderBottomColor: `${accentColor}20` }}
      aria-label="Event navigation"
    >
      <div className={styles.inner}>
        {monogram && (
          <span
            className={styles.monogram}
            style={{ color: accentColor }}
          >
            {monogram}
          </span>
        )}
        {coupleNames && (
          <span className={styles.names}>{coupleNames}</span>
        )}
      </div>
    </nav>
  );
}
