"use client";

import { MobileNavMenu, type MobileNavItem } from "./MobileNavMenu";
import styles from "./FloatingMobileNavMenu.module.css";

type FloatingMobileNavMenuProps = {
  items: MobileNavItem[];
  /** Brand label shown in the drawer header. */
  brand?: React.ReactNode;
  /** Accent color for the trigger button. Defaults to the surrounding
   *  text color, which works for most light backgrounds. */
  accentColor?: string;
  ariaLabel?: string;
};

/**
 * Floating hamburger trigger pinned to the top-right of the viewport
 * at mobile widths. Used by templates that lack a top bar nav and rely
 * on a side-rail at desktop (e.g. V1 family).
 */
export function FloatingMobileNavMenu({
  items,
  brand,
  accentColor,
  ariaLabel,
}: FloatingMobileNavMenuProps) {
  if (items.length === 0) return null;

  return (
    <MobileNavMenu
      className={styles.trigger}
      items={items}
      brand={brand}
      ariaLabel={ariaLabel}
      buttonStyle={{
        width: 40,
        height: 40,
        borderRadius: 999,
        border: "1px solid rgba(0, 0, 0, 0.12)",
        background: "rgba(255, 255, 255, 0.82)",
        color: accentColor ?? "currentColor",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.08)",
      }}
    />
  );
}
