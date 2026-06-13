"use client";

/**
 * Centered Decorator Nav — The Fine Art Romance
 *
 * Always-dark nav bar with monogram logo in concentric circles
 * on the left, centered section links with decorative dot
 * separators. Dark background matches footer.
 */

import type { NavRendererProps } from "../../types";
import { NavMoreDropdown } from "@/components/templates/shared/NavMoreDropdown";
import { MobileNavMenu } from "@/components/templates/shared/MobileNavMenu";

export function CenteredDecoratorNav({
  monogram,
  coupleNames,
  sections,
  overflow = [],
  homeHref = "#top",
  mobileNavExpression,
}: NavRendererProps) {
  const navSections = sections;
  const linkBaseStyle: React.CSSProperties = {
    fontFamily: "var(--sans)",
    fontSize: "0.7rem",
    fontWeight: 500,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: "rgba(255, 255, 255, 0.6)",
    textDecoration: "none",
    whiteSpace: "nowrap",
    transition: "color 0.3s ease",
  };

  // Derive a monogram fallback from couple names initials
  const displayMonogram = monogram
    || (coupleNames ? coupleNames.charAt(0) : "W");

  return (
    <nav
      style={{
        position: "fixed",
        top: "var(--banner-offset, 0px)",
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "0 clamp(20px, 4vw, 40px)",
        background: "var(--text, #3d3830)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      }}
      aria-label="Main navigation"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "var(--max, 1140px)",
          margin: "0 auto",
          height: 60,
        }}
      >
        {/* Left: Monogram in concentric circles */}
        <a
          href={homeHref}
          className="fine-art-monogram"
          style={{
            position: "absolute",
            left: "clamp(20px, 4vw, 40px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "1.5px solid rgba(255, 255, 255, 0.35)",
            boxShadow: "0 0 0 4px rgba(255, 255, 255, 0.08)",
            textDecoration: "none",
            fontFamily: "var(--serif)",
            fontSize: "0.82rem",
            fontWeight: 400,
            fontStyle: "italic",
            letterSpacing: "0.06em",
            color: "rgba(255, 255, 255, 0.85)",
            transition: "border-color 0.3s ease, box-shadow 0.3s ease",
          }}
          aria-label="Back to top"
        >
          {displayMonogram}
        </a>

        {/* Centered links with dot separators (desktop) */}
        <div
          className="fine-art-desktop-links"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
          }}
        >
          {navSections.map((s, i) => (
            <span key={s.id} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && (
                <span
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.25)",
                    margin: "0 clamp(10px, 1.5vw, 18px)",
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
              )}
              <a
                href={s.href ?? `#${s.id}`}
                className={s.isCta ? "fine-art-nav-cta" : "fine-art-nav-link"}
                style={
                  s.isCta
                    ? {
                        ...linkBaseStyle,
                        color: "var(--night, #1e1b17)",
                        background: "var(--accent, #c5a55a)",
                        padding: "6px 14px",
                        borderRadius: 999,
                        fontWeight: 600,
                      }
                    : linkBaseStyle
                }
              >
                {s.label}
              </a>
            </span>
          ))}
          {overflow.length > 0 && (
            <span style={{ display: "flex", alignItems: "center" }}>
              {navSections.length > 0 && (
                <span
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.25)",
                    margin: "0 clamp(10px, 1.5vw, 18px)",
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
              )}
              <NavMoreDropdown
                items={overflow.map(({ id, label, href }) => ({ id, label, href: href ?? `#${id}` }))}
                buttonStyle={linkBaseStyle}
                itemStyle={{
                  fontFamily: "var(--sans)",
                  fontSize: "0.7rem",
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase" as const,
                  padding: "0.5rem 0.9rem",
                }}
              />
            </span>
          )}
        </div>

        {/* Mobile menu (centered link group is CSS-hidden at ≤768px). */}
        <MobileNavMenu
          className="fine-art-mobile-menu"
          // Invitation sheet, curated by the definition (FINE_ART declares
          // mobileNavExpression — the template is invitation-inspired; its
          // menu IS an invitation card).
          expression={mobileNavExpression}
          brand={displayMonogram}
          items={[...navSections, ...overflow].map((s) => ({
            id: s.id,
            label: s.label,
            href: s.href ?? `#${s.id}`,
            isCta: s.isCta ?? false,
          }))}
          buttonStyle={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "1.5px solid rgba(255, 255, 255, 0.35)",
            color: "rgba(255, 255, 255, 0.85)",
            background: "transparent",
          }}
        />
      </div>

      {/* Hover + mobile styles */}
      <style>{`
        .fine-art-nav-link:hover { color: rgba(255, 255, 255, 0.95) !important; }
        .fine-art-nav-cta:hover { filter: brightness(1.1) !important; }
        .fine-art-monogram:hover {
          border-color: rgba(255, 255, 255, 0.6) !important;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.15) !important;
        }
        .fine-art-mobile-menu { display: none !important; }
        @media (max-width: 768px) {
          .fine-art-desktop-links { display: none !important; }
          .fine-art-mobile-menu {
            display: inline-flex !important;
            position: absolute !important;
            right: clamp(20px, 4vw, 40px);
          }
        }
      `}</style>
    </nav>
  );
}
