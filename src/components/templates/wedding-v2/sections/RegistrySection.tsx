"use client";

import type { MediaAsset } from "@prisma/client";
import type { RegistrySection as RegistrySectionData } from "@/schemas/event-page";

type RegistrySectionProps = {
  data: RegistrySectionData["data"];
  assets: MediaAsset[];
};

/**
 * Registry Section — POC-parity rewrite
 *
 * Cards with icon area, title, description, CTA button.
 * Primary card uses gold gradient button. Notes with border-top separator.
 */
export function RegistrySection({ data, assets }: RegistrySectionProps) {
  const { heading = "Gift Registry", description, items } = data;

  const getAssetUrl = (assetId?: string): string | null => {
    if (!assetId) return null;
    const asset = assets.find((a) => a.id === assetId);
    return asset?.publicUrl || null;
  };

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="Gift registry"
      id="registry"
    >
      <div style={{ width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))", margin: "0 auto" }}>
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(32px, 5vw, 56px)" }}>
          <p style={{
            fontFamily: "var(--sans)",
            fontSize: "var(--sm, 0.85rem)",
            fontWeight: 500,
            letterSpacing: ".18em",
            textTransform: "uppercase" as const,
            color: "var(--accent, #7a8c72)",
            marginBottom: 12,
          }}>
            Gift Registry
          </p>
          <h2 style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
            fontWeight: 400,
            lineHeight: 1.15,
            color: "var(--night, #1e1b17)",
          }}>
            {heading}
          </h2>
          {description && (
            <p style={{ maxWidth: "56ch", color: "var(--text-2, #786f65)", lineHeight: 1.75, marginTop: 8, marginLeft: "auto", marginRight: "auto" }}>
              {description}
            </p>
          )}
        </div>

        {/* Registry grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "var(--gap, 20px)",
        }}>
          {items.map((item, index) => {
            const logoUrl = getAssetUrl(item.logoAssetId);
            const hasLink = item.url && item.url.length > 0;
            const isPrimary = index === 0;

            return (
              <div
                key={index}
                style={{
                  background: "var(--surface, #ffffff)",
                  border: "1px solid var(--border, #e8e1d6)",
                  borderRadius: "var(--r-lg, 24px)",
                  padding: "clamp(24px, 3vw, 32px)",
                  boxShadow: "var(--shadow)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 20,
                  transition: "transform .4s var(--ease-out-expo, ease), box-shadow .4s var(--ease-out-expo, ease)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "var(--shadow)";
                }}
              >
                <div>
                  {/* Icon */}
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: "rgba(122, 140, 114, 0.08)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--accent, #7a8c72)",
                    marginBottom: 4,
                  }}>
                    {logoUrl ? (
                      <img src={logoUrl} alt={item.name} style={{ width: 24, height: 24, objectFit: "contain" }} />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={24} height={24}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    )}
                  </div>

                  <h3 style={{
                    fontFamily: "var(--serif)",
                    fontSize: "1.2rem",
                    fontWeight: 400,
                    lineHeight: 1.15,
                    color: "var(--night, #1e1b17)",
                    marginBottom: 6,
                  }}>
                    {item.name}
                  </h3>

                  {item.description && (
                    <p style={{ color: "var(--text-2, #786f65)", fontSize: "var(--sm, 0.85rem)", lineHeight: 1.6 }}>
                      {item.description}
                    </p>
                  )}
                </div>

                <div>
                  {hasLink && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        fontFamily: "var(--sans)",
                        fontSize: "var(--sm, 0.85rem)",
                        fontWeight: 600,
                        letterSpacing: ".02em",
                        padding: "12px 26px",
                        borderRadius: 999,
                        textDecoration: "none",
                        whiteSpace: "nowrap" as const,
                        transition: "all var(--transition, 0.3s ease)",
                        ...(isPrimary
                          ? {
                              background: "linear-gradient(135deg, var(--gold, #c5a55a), var(--gold-d, #9e7e3a))",
                              color: "#fff",
                              border: "1px solid var(--gold, #c5a55a)",
                            }
                          : {
                              background: "transparent",
                              color: "var(--charcoal, #3d3830)",
                              border: "1px solid var(--sand, #d4cabb)",
                            }),
                      }}
                    >
                      {isPrimary ? "Contribute" : "View Registry"}
                    </a>
                  )}

                  {item.note && (
                    <p style={{
                      fontSize: ".82rem",
                      color: "var(--stone, #a69e93)",
                      fontStyle: "italic",
                      paddingTop: 12,
                      borderTop: "1px solid var(--border, #e8e1d6)",
                      marginTop: hasLink ? 12 : 0,
                    }}>
                      {item.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {items.length === 0 && (
          <div style={{
            border: "2px dashed var(--border, #e8e1d6)",
            borderRadius: "var(--r-lg, 24px)",
            padding: 48,
            textAlign: "center",
            color: "var(--text-3, #a69e93)",
          }}>
            Registry information coming soon
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 700px) {
          #registry [style*="grid-template-columns: repeat(2"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
