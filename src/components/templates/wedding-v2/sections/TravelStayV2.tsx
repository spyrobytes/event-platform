"use client";

import { useState } from "react";
import type { TravelStaySection, HotelItem } from "@/schemas/event-page";

type TravelStayV2Props = {
  data: TravelStaySection["data"];
};

/**
 * Travel & Stay V2 — POC-parity rewrite
 *
 * Top row: "Getting In" + "Dress Code" detail cards.
 * Hotel cards with tags, copy-able codes, action buttons.
 */
export function TravelStayV2({ data }: TravelStayV2Props) {
  const {
    heading = "Travel & Stay",
    hotels,
    notes,
    airports = [],
    tips = [],
  } = data;

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="Travel and accommodations"
      id="travel"
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
            Travel & Stay
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
          {notes && (
            <p style={{ maxWidth: "56ch", color: "var(--text-2, #786f65)", lineHeight: 1.75, marginTop: 8, marginLeft: "auto", marginRight: "auto" }}>
              {notes}
            </p>
          )}
        </div>

        {/* Top row: Getting In + optional info */}
        {airports.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "var(--gap, 20px)",
            marginBottom: "var(--gap, 20px)",
          }}>
            <InfoCard
              eyebrow="Getting In"
              title={airports.length > 0 ? `${airports[0].code} Airport` : "Getting There"}
              infoRows={airports.map((a) => ({
                key: a.code,
                value: `${a.name}${a.distance ? ` · ${a.distance}` : ""}`,
              }))}
            />
            {tips.length > 0 && (
              <InfoCard
                eyebrow="Good to Know"
                title="Travel Tips"
                tags={tips}
              />
            )}
          </div>
        )}

        {/* Hotels sub-header */}
        {hotels.length > 0 && (
          <>
            <div style={{ marginTop: airports.length > 0 ? 48 : 0, marginBottom: 24 }}>
              <p style={{
                fontFamily: "var(--sans)",
                fontSize: "var(--sm, 0.85rem)",
                fontWeight: 500,
                letterSpacing: ".18em",
                textTransform: "uppercase" as const,
                color: "var(--accent, #7a8c72)",
                marginBottom: 12,
              }}>
                Where to Stay
              </p>
              <h2 style={{
                fontFamily: "var(--serif)",
                fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
                fontWeight: 400,
                lineHeight: 1.15,
                color: "var(--night, #1e1b17)",
              }}>
                Partner hotels with group rates
              </h2>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "var(--gap, 20px)",
            }}>
              {hotels.map((hotel, i) => (
                <HotelCard key={i} hotel={hotel} />
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {hotels.length === 0 && airports.length === 0 && (
          <div style={{
            border: "2px dashed var(--border, #e8e1d6)",
            borderRadius: "var(--r-lg, 24px)",
            padding: 48,
            textAlign: "center",
            color: "var(--text-3, #a69e93)",
          }}>
            Accommodation details coming soon
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 700px) {
          #travel [style*="grid-template-columns: repeat(2"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

/** Info card for "Getting In" / "Dress Code" */
function InfoCard({
  eyebrow,
  title,
  infoRows,
  tags,
}: {
  eyebrow: string;
  title: string;
  infoRows?: { key: string; value: string }[];
  tags?: string[];
}) {
  return (
    <div style={{
      background: "var(--surface, #ffffff)",
      border: "1px solid var(--border, #e8e1d6)",
      borderRadius: "var(--r-lg, 24px)",
      padding: "clamp(24px, 3vw, 32px)",
      boxShadow: "var(--shadow)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Accent stripe */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: "linear-gradient(90deg, var(--sage-l, #a8b8a0), var(--accent, #7a8c72))",
        opacity: 0.7,
      }} />

      <div style={{
        fontSize: ".75rem",
        fontWeight: 600,
        letterSpacing: ".1em",
        textTransform: "uppercase" as const,
        color: "var(--accent, #7a8c72)",
        marginBottom: 6,
      }}>
        {eyebrow}
      </div>

      <h3 style={{
        fontFamily: "var(--serif)",
        fontSize: "1.3rem",
        fontWeight: 400,
        lineHeight: 1.15,
        color: "var(--night, #1e1b17)",
        marginBottom: 12,
      }}>
        {title}
      </h3>

      {infoRows && infoRows.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {infoRows.map((row, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 12,
              padding: "10px 14px",
              borderRadius: "var(--r, 16px)",
              background: "var(--cream, #f0ebe3)",
              border: "1px solid var(--linen, #e8e1d6)",
            }}>
              <span style={{ fontSize: "var(--sm, 0.85rem)", color: "var(--text-3, #a69e93)" }}>
                {row.key}
              </span>
              <span style={{ fontSize: "var(--sm, 0.85rem)", fontWeight: 600, color: "var(--charcoal, #3d3830)", textAlign: "right" }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {tags && tags.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          {tags.map((tag, i) => (
            <span key={i} style={{
              fontSize: ".78rem",
              fontWeight: 500,
              letterSpacing: ".02em",
              color: "var(--sage-d, #5c6b55)",
              padding: "5px 12px",
              borderRadius: 999,
              background: "rgba(122, 140, 114, 0.08)",
              border: "1px solid rgba(122, 140, 114, 0.14)",
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Hotel card with copyable block code */
function HotelCard({ hotel }: { hotel: HotelItem }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail
    }
  };

  return (
    <div style={{
      background: "var(--surface, #ffffff)",
      border: "1px solid var(--border, #e8e1d6)",
      borderRadius: "var(--r-lg, 24px)",
      overflow: "hidden",
      boxShadow: "var(--shadow)",
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
      <div style={{ padding: "clamp(20px, 2.5vw, 28px)" }}>
        <h3 style={{
          fontFamily: "var(--serif)",
          fontSize: "1.15rem",
          fontWeight: 500,
          color: "var(--night, #1e1b17)",
          marginBottom: 6,
        }}>
          {hotel.name}
        </h3>

        {(hotel.description || hotel.address) && (
          <p style={{
            fontSize: "var(--sm, 0.85rem)",
            color: "var(--text-2, #786f65)",
            lineHeight: 1.6,
            marginBottom: 14,
          }}>
            {hotel.description || hotel.address}
          </p>
        )}

        {/* Tags */}
        {hotel.tags && hotel.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {hotel.tags.map((tag, i) => (
              <span key={i} style={{
                fontSize: ".74rem",
                fontWeight: 500,
                color: "var(--sage-d, #5c6b55)",
                padding: "5px 12px",
                borderRadius: 999,
                background: "rgba(122, 140, 114, 0.08)",
                border: "1px solid rgba(122, 140, 114, 0.14)",
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Block code with copy */}
        {hotel.blockCode && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderRadius: "var(--r, 16px)",
            background: "var(--cream, #f0ebe3)",
            border: "1px solid var(--linen, #e8e1d6)",
          }}>
            <span style={{
              fontSize: ".78rem",
              color: "var(--stone, #a69e93)",
              letterSpacing: ".04em",
              textTransform: "uppercase" as const,
              fontWeight: 600,
            }}>
              Code
            </span>
            <span style={{
              fontFamily: "'DM Sans', monospace",
              fontWeight: 700,
              fontSize: ".88rem",
              color: "var(--charcoal, #3d3830)",
              letterSpacing: ".06em",
            }}>
              {hotel.blockCode}
            </span>
            <button
              onClick={() => handleCopy(hotel.blockCode!)}
              style={{
                marginLeft: "auto",
                fontSize: ".78rem",
                fontWeight: 600,
                color: "var(--sage-d, #5c6b55)",
                cursor: "pointer",
                padding: "4px 10px",
                borderRadius: 999,
                background: "none",
                border: "none",
                transition: "background var(--transition, 0.3s ease)",
                fontFamily: "inherit",
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        {hotel.deadline && (
          <p style={{
            marginTop: 12,
            fontSize: ".82rem",
            color: "var(--stone, #a69e93)",
            fontStyle: "italic",
          }}>
            {hotel.deadline}
          </p>
        )}
      </div>

      {/* Actions footer */}
      {hotel.bookingUrl && (
        <div style={{
          padding: "14px clamp(20px, 2.5vw, 28px)",
          borderTop: "1px solid var(--border, #e8e1d6)",
          display: "flex",
          gap: 8,
        }}>
          <a
            href={hotel.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--sans)",
              fontSize: "var(--sm, 0.85rem)",
              fontWeight: 600,
              padding: "12px 26px",
              borderRadius: 999,
              background: "transparent",
              color: "var(--charcoal, #3d3830)",
              border: "1px solid var(--sand, #d4cabb)",
              textDecoration: "none",
              transition: "all var(--transition, 0.3s ease)",
            }}
          >
            Book Now
          </a>
        </div>
      )}
    </div>
  );
}
