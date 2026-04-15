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
  const kickerText = "Gift Registry";
  const showKicker = kickerText.toLowerCase() !== heading.toLowerCase();

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
          {showKicker && (
            <p className="v2-kicker" style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--sm, 0.85rem)",
              fontWeight: 500,
              letterSpacing: ".18em",
              textTransform: "uppercase" as const,
              color: "var(--accent, #7a8c72)",
              marginBottom: 12,
            }}>
              {kickerText}
            </p>
          )}
          <h2 style={{
            fontFamily: "var(--cursive, var(--serif))",
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

        {/* Registry grid — auto-fills 1–4 columns based on viewport (minmax 260px).
            Cards stay compact; 24 items fit across 6 rows on a wide display. */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "var(--gap, 20px)",
        }}>
          {items.map((item, index) => {
            const itemType = item.type ?? "link";
            const isFund = itemType === "fund";
            const logoUrl = getAssetUrl(item.logoAssetId);
            const imageUrl = getAssetUrl(item.imageAssetId);
            const hasLink = !!item.url && item.url.length > 0;
            const isFeatured = !!item.featured;
            const isClaimed = !!item.purchased;
            const ctaLabel = isFund ? "Contribute" : "View Registry";

            return (
              <div
                key={index}
                style={{
                  position: "relative",
                  background: "var(--surface, #ffffff)",
                  border: "1px solid var(--border, #e8e1d6)",
                  borderRadius: "var(--r-lg, 24px)",
                  padding: "clamp(20px, 2vw, 24px)",
                  boxShadow: "var(--shadow)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  opacity: isClaimed ? 0.7 : 1,
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
                {isClaimed && (
                  <span
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      background: "var(--accent, #7a8c72)",
                      color: "#fff",
                      fontFamily: "var(--sans)",
                      fontSize: ".7rem",
                      fontWeight: 600,
                      letterSpacing: ".12em",
                      textTransform: "uppercase" as const,
                      padding: "4px 10px",
                      borderRadius: 999,
                    }}
                  >
                    Claimed
                  </span>
                )}

                {imageUrl ? (
                    <div
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "var(--cream, #faf6ef)",
                        marginBottom: 14,
                        position: "relative",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt={item.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      {logoUrl && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 4,
                            left: 4,
                            width: 24,
                            height: 24,
                            borderRadius: 7,
                            background: "#fff",
                            display: "grid",
                            placeItems: "center",
                            boxShadow: "0 1px 4px rgba(0,0,0,.2)",
                          }}
                        >
                          <img
                            src={logoUrl}
                            alt=""
                            style={{ width: 16, height: 16, objectFit: "contain" }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: "rgba(122, 140, 114, 0.08)",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--accent, #7a8c72)",
                        marginBottom: 4,
                      }}
                    >
                      {logoUrl ? (
                        <img src={logoUrl} alt={item.name} style={{ width: 24, height: 24, objectFit: "contain" }} />
                      ) : isFund ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={24} height={24}>
                          <path d="M12 1v22" />
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={24} height={24}>
                          <circle cx="12" cy="12" r="10" />
                          <path d="M2 12h20" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                      )}
                    </div>
                  )}

                  <h3 style={{
                    fontFamily: "var(--cursive, var(--serif))",
                    fontSize: "1.2rem",
                    fontWeight: 400,
                    lineHeight: 1.15,
                    color: "var(--night, #1e1b17)",
                    marginBottom: item.amountLabel ? 2 : 6,
                  }}>
                    {item.name}
                  </h3>

                  {item.amountLabel && (
                    <p style={{
                      fontFamily: "var(--sans)",
                      fontSize: ".95rem",
                      fontWeight: 600,
                      color: "var(--accent, #7a8c72)",
                      marginBottom: 6,
                    }}>
                      {item.amountLabel}
                    </p>
                  )}

                {item.description && (
                  <p style={{ color: "var(--text-2, #786f65)", fontSize: "var(--sm, 0.85rem)", lineHeight: 1.6 }}>
                    {item.description}
                  </p>
                )}

                {item.note && (
                  <p style={{
                    fontSize: ".82rem",
                    color: "var(--stone, #a69e93)",
                    fontStyle: "italic",
                  }}>
                    {item.note}
                  </p>
                )}

                {hasLink && !isClaimed && (
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
                      marginTop: "auto",
                      alignSelf: "flex-start",
                      ...(isFeatured
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
                    {ctaLabel}
                  </a>
                )}
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

    </section>
  );
}
