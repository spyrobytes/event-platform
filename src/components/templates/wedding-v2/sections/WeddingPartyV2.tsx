"use client";

import type { MediaAsset } from "@prisma/client";
import type { PartySide } from "@/schemas/event-page";

type PartyMember = {
  name: string;
  role: string;
  bio?: string;
  imageAssetId?: string;
  side?: PartySide;
};

type WeddingPartyV2Props = {
  data: {
    heading?: string;
    description?: string;
    members: PartyMember[];
  };
  assets: MediaAsset[];
};

/**
 * Wedding Party V2 — POC-parity rewrite
 *
 * Card-based layout (not circular avatars):
 * - Side dividers with italic serif labels
 * - Person cards with photo section, name, role badge, bio
 * - Hover effects: translateY + shadow
 * - 3-column grid, responsive to 2 → 1
 */
export function WeddingPartyV2({ data, assets }: WeddingPartyV2Props) {
  const { heading = "Wedding Party", description, members } = data;

  const getAssetUrl = (assetId?: string): string | null => {
    if (!assetId) return null;
    const asset = assets.find((a) => a.id === assetId);
    return asset?.publicUrl || null;
  };

  const bridesSide = members.filter((m) => m.side === "bride");
  const groomsSide = members.filter((m) => m.side === "groom");
  const others = members.filter((m) => !m.side || m.side === "other");
  const hasSides = bridesSide.length > 0 || groomsSide.length > 0;

  const renderSideDivider = (label: string) => (
    <div
      style={{
        marginBottom: 32,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div style={{ flex: 1, height: 1, background: "var(--linen, #e8e1d6)" }} />
      <span
        style={{
          fontFamily: "var(--serif)",
          fontSize: "1.1rem",
          fontStyle: "italic",
          color: "var(--stone, #a69e93)",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--linen, #e8e1d6)" }} />
    </div>
  );

  const renderCard = (member: PartyMember, index: number) => {
    const imageUrl = getAssetUrl(member.imageAssetId);

    return (
      <article
        key={index}
        style={{
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--border, #e8e1d6)",
          borderRadius: "var(--r-lg, 24px)",
          overflow: "hidden",
          boxShadow: "var(--shadow)",
          transition: "transform .4s var(--ease-out-expo, ease), box-shadow .4s var(--ease-out-expo, ease)",
          cursor: "default",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "var(--shadow-lg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "var(--shadow)";
        }}
      >
        {/* Photo — arch-shaped mask */}
        <div
          style={{
            position: "relative",
            height: 280,
            overflow: "hidden",
            padding: "16px 16px 0",
            background: "var(--cream, #f0ebe3)",
          }}
        >
          {imageUrl ? (
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "999px 999px 8px 8px",
                overflow: "hidden",
              }}
            >
              <img
                src={imageUrl}
                alt={member.name}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center 20%",
                  transition: "transform .7s var(--ease-out-expo, ease)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "999px 999px 8px 8px",
                overflow: "hidden",
                background: "var(--linen, #e8e1d6)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <svg
                width="48" height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--stone, #a69e93)"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          <h3
            style={{
              fontFamily: "var(--serif)",
              fontSize: "1.15rem",
              fontWeight: 500,
              color: "var(--night, #1e1b17)",
              marginBottom: 4,
            }}
          >
            {member.name}
          </h3>
          <div
            style={{
              fontSize: ".78rem",
              fontWeight: 600,
              letterSpacing: ".08em",
              textTransform: "uppercase" as const,
              color: "var(--accent, #7a8c72)",
              marginBottom: 10,
            }}
          >
            {member.role}
          </div>
          {member.bio && (
            <p
              style={{
                fontSize: "var(--sm, 0.85rem)",
                color: "var(--text-2, #786f65)",
                lineHeight: 1.65,
              }}
            >
              {member.bio}
            </p>
          )}
        </div>
      </article>
    );
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "var(--gap, 20px)",
  } as const;

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="Wedding party"
      id="party"
    >
      <div style={{ width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))", margin: "0 auto" }}>
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(32px, 5vw, 56px)" }}>
          <p
            className="v2-kicker"
            style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--sm, 0.85rem)",
              fontWeight: 500,
              letterSpacing: ".18em",
              textTransform: "uppercase" as const,
              color: "var(--accent, #7a8c72)",
              marginBottom: 12,
            }}
          >
            Wedding Party
          </p>
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
              fontWeight: 400,
              lineHeight: 1.15,
              color: "var(--night, #1e1b17)",
            }}
          >
            {heading}
          </h2>
          {description && (
            <p style={{ maxWidth: "56ch", color: "var(--text-2, #786f65)", lineHeight: 1.75, marginTop: 8, marginLeft: "auto", marginRight: "auto" }}>
              {description}
            </p>
          )}
        </div>

        {/* Bride's side */}
        {bridesSide.length > 0 && (
          <>
            {renderSideDivider("Bride's side")}
            <div style={{ ...gridStyle, marginBottom: 48 }}>
              {bridesSide.map(renderCard)}
            </div>
          </>
        )}

        {/* Groom's side */}
        {groomsSide.length > 0 && (
          <>
            {renderSideDivider("Groom's side")}
            <div style={gridStyle}>
              {groomsSide.map(renderCard)}
            </div>
          </>
        )}

        {/* Ungrouped */}
        {!hasSides && others.length > 0 && (
          <div style={gridStyle}>
            {others.map(renderCard)}
          </div>
        )}

        {hasSides && others.length > 0 && (
          <div style={{ marginTop: 48 }}>
            {renderSideDivider("Special Roles")}
            <div style={gridStyle}>
              {others.map(renderCard)}
            </div>
          </div>
        )}

        {members.length === 0 && (
          <div
            style={{
              border: "2px dashed var(--border, #e8e1d6)",
              borderRadius: "var(--r-lg, 24px)",
              padding: 48,
              textAlign: "center",
              color: "var(--text-3, #a69e93)",
            }}
          >
            Wedding party details coming soon
          </div>
        )}
      </div>

      {/* Responsive grid override */}
      <style>{`
        @media (max-width: 800px) {
          #party [style*="grid-template-columns: repeat(3"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 500px) {
          #party [style*="grid-template-columns: repeat"] {
            grid-template-columns: 1fr !important;
            max-width: 380px;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }
      `}</style>
    </section>
  );
}
