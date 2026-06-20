"use client";

/**
 * Festive Layered Footer — The Celebration House
 *
 * Warm tinted background with layered content. More expressive
 * than other footers — includes a celebratory closing message.
 */

import type { FooterRendererProps } from "../../types";
import { BrandCredit } from "@/components/brand";
import { SocialIconRow } from "../../../shared";

export function FestiveLayeredFooter({
  monogram,
  coupleNames,
  dateText,
  sections,
  socialLinks,
}: FooterRendererProps) {
  return (
    <footer
      style={{
        position: "relative",
        background: "var(--cream, #f0ebe3)",
        padding: "clamp(140px, 16vw, 220px) 0 clamp(24px, 3vw, 40px)",
        textAlign: "center",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "clamp(120px, 14vw, 200px)",
          backgroundImage: "url(/templates/celebration/footer-triangles.svg)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "top center",
          backgroundSize: "100% 100%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        {/* Celebratory closing */}
        <p
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(1.4rem, 2.5vw, 2rem)",
            fontWeight: 500,
            fontStyle: "italic",
            color: "var(--accent, #7a8c72)",
            marginBottom: "clamp(16px, 2vw, 24px)",
          }}
        >
          Let&apos;s celebrate!
        </p>

        <p
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(1rem, 1.3vw, 1.15rem)",
            fontWeight: 500,
            color: "var(--text, #3d3830)",
            marginBottom: 4,
          }}
        >
          {coupleNames || "Our Wedding"}
        </p>

        {dateText && (
          <p style={{ fontFamily: "var(--sans)", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "var(--text-3, #a69e93)", marginBottom: "clamp(24px, 3vw, 36px)" }}>
            {dateText}
          </p>
        )}

        {sections.length > 0 && (
          <nav style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8, marginBottom: "clamp(24px, 3vw, 36px)" }} aria-label="Footer navigation">
            {sections.map((s) => (
              <a
                key={s.id}
                href={s.href ?? `#${s.id}`}
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: "0.68rem",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  color: "var(--text-2, #786f65)",
                  textDecoration: "none",
                  padding: "4px 12px",
                  borderRadius: "var(--r, 16px)",
                  background: "var(--surface, #ffffff)",
                }}
              >
                {s.label}
              </a>
            ))}
          </nav>
        )}

        <SocialIconRow
          links={socialLinks}
          size={20}
          gap={14}
          color="var(--text-2, #786f65)"
          hoverColor="var(--accent, #7a8c72)"
          style={{ marginBottom: "clamp(20px, 2.5vw, 28px)" }}
        />

        <BrandCredit style={{ fontFamily: "var(--sans)", fontSize: "0.65rem", color: "var(--text-3, #a69e93)" }} />
      </div>
    </footer>
  );
}
