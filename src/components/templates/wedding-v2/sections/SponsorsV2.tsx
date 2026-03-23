"use client";

import type { MediaAsset } from "@prisma/client";
import type { SponsorsSection, SponsorItem, SponsorTier } from "@/schemas/event-page";

type SponsorsV2Props = {
  data: SponsorsSection["data"];
  assets: MediaAsset[];
};

/* ------------------------------------------------------------------ */
/*  Tier ordering                                                      */
/* ------------------------------------------------------------------ */

const TIER_ORDER: SponsorTier[] = ["platinum", "gold", "silver", "bronze", "partner"];

const TIER_LABELS: Record<SponsorTier, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  partner: "Partner",
};

/* ------------------------------------------------------------------ */
/*  Placeholder logo icon                                              */
/* ------------------------------------------------------------------ */

function PlaceholderLogo() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--stone, #a69e93)"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SponsorsV2({ data, assets }: SponsorsV2Props) {
  const { heading = "Our Sponsors", description, showTiers, items } = data;

  const getAssetUrl = (assetId?: string): string | null => {
    if (!assetId) return null;
    const asset = assets.find((a) => a.id === assetId);
    return asset?.publicUrl || null;
  };

  /* ---- Tier divider ---- */

  const renderTierDivider = (label: string) => (
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

  /* ---- Card renderer ---- */

  const renderCard = (sponsor: SponsorItem, index: number) => {
    const logoUrl = getAssetUrl(sponsor.logoAssetId);

    const cardContent = (
      <article
        key={index}
        style={{
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--border, #e8e1d6)",
          borderRadius: "var(--r-lg, 24px)",
          overflow: "hidden",
          boxShadow: "var(--shadow)",
          transition:
            "transform .4s var(--ease-out-expo, ease), box-shadow .4s var(--ease-out-expo, ease)",
          cursor: sponsor.websiteUrl ? "pointer" : "default",
          textDecoration: "none",
          color: "inherit",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "var(--shadow-lg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "var(--shadow)";
        }}
      >
        {/* Logo area */}
        <div
          style={{
            height: 80,
            display: "grid",
            placeItems: "center",
            background: "var(--cream, #f0ebe3)",
            padding: 16,
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${sponsor.name} logo`}
              loading="lazy"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <PlaceholderLogo />
          )}
        </div>

        {/* Body */}
        <div style={{ padding: 16, textAlign: "center" }}>
          <h3
            style={{
              fontFamily: "var(--serif)",
              fontSize: "1rem",
              fontWeight: 500,
              color: "var(--night, #1e1b17)",
              marginBottom: sponsor.description ? 6 : 0,
            }}
          >
            {sponsor.name}
          </h3>
          {sponsor.description && (
            <p
              style={{
                fontSize: "var(--sm, 0.85rem)",
                color: "var(--text-2, #786f65)",
                lineHeight: 1.55,
              }}
            >
              {sponsor.description}
            </p>
          )}
        </div>
      </article>
    );

    if (sponsor.websiteUrl) {
      return (
        <a
          key={index}
          href={sponsor.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", color: "inherit", display: "contents" }}
        >
          {cardContent}
        </a>
      );
    }

    return cardContent;
  };

  /* ---- Grid style ---- */

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "var(--gap, 20px)",
  } as const;

  /* ---- Group items by tier ---- */

  const groupedByTier = () => {
    const groups: { tier: SponsorTier; sponsors: SponsorItem[] }[] = [];
    for (const tier of TIER_ORDER) {
      const sponsors = items.filter((s) => s.tier === tier);
      if (sponsors.length > 0) {
        groups.push({ tier, sponsors });
      }
    }
    // Include items without a tier
    const untiered = items.filter((s) => !s.tier);
    if (untiered.length > 0) {
      groups.push({ tier: "partner" as SponsorTier, sponsors: untiered });
    }
    return groups;
  };

  const hasTieredItems = showTiers && items.some((s) => s.tier);

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="Our sponsors"
      id="sponsors"
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(32px, 5vw, 56px)" }}>
          <p
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
            Partners
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
            <p
              style={{
                maxWidth: "56ch",
                color: "var(--text-2, #786f65)",
                lineHeight: 1.75,
                marginTop: 8,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Content */}
        {items.length > 0 ? (
          hasTieredItems ? (
            /* Tiered layout */
            groupedByTier().map(({ tier, sponsors }, gi) => (
              <div key={tier} style={{ marginBottom: gi < groupedByTier().length - 1 ? 48 : 0 }}>
                {renderTierDivider(TIER_LABELS[tier])}
                <div style={gridStyle}>
                  {sponsors.map(renderCard)}
                </div>
              </div>
            ))
          ) : (
            /* Flat layout */
            <div style={gridStyle}>
              {items.map(renderCard)}
            </div>
          )
        ) : (
          <div
            style={{
              border: "2px dashed var(--border, #e8e1d6)",
              borderRadius: "var(--r-lg, 24px)",
              padding: 48,
              textAlign: "center",
              color: "var(--text-3, #a69e93)",
            }}
          >
            Sponsor information coming soon
          </div>
        )}
      </div>

      {/* Responsive grid override */}
      <style>{`
        @media (max-width: 900px) {
          #sponsors [style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          #sponsors [style*="grid-template-columns: repeat"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 400px) {
          #sponsors [style*="grid-template-columns: repeat"] {
            grid-template-columns: 1fr !important;
            max-width: 320px;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }
      `}</style>
    </section>
  );
}
