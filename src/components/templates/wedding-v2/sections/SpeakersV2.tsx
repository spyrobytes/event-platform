"use client";

import type { MediaAsset } from "@prisma/client";
import type { SpeakersSection, SpeakerItem, SpeakerLink } from "@/schemas/event-page";

type SpeakersV2Props = {
  data: SpeakersSection["data"];
  assets: MediaAsset[];
};

/* ------------------------------------------------------------------ */
/*  SVG social-link icons                                              */
/* ------------------------------------------------------------------ */

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

const LINK_ICON: Record<SpeakerLink["type"], () => React.JSX.Element> = {
  website: GlobeIcon,
  twitter: TwitterIcon,
  linkedin: LinkedInIcon,
  instagram: InstagramIcon,
};

/* ------------------------------------------------------------------ */
/*  Initials helper                                                    */
/* ------------------------------------------------------------------ */

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SpeakersV2({ data, assets }: SpeakersV2Props) {
  const { heading = "Speakers", description, items } = data;
  const kickerText = "Speakers";
  const showKicker = kickerText.toLowerCase() !== heading.toLowerCase();

  const getAssetUrl = (assetId?: string): string | null => {
    if (!assetId) return null;
    const asset = assets.find((a) => a.id === assetId);
    return asset?.publicUrl || null;
  };

  const renderCard = (speaker: SpeakerItem, index: number) => {
    const imageUrl = getAssetUrl(speaker.imageAssetId);
    const hasLinks = speaker.links && speaker.links.length > 0;

    return (
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
        {/* Photo */}
        <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={speaker.name}
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
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "var(--cream, #f0ebe3)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--cursive, var(--serif))",
                  fontSize: "2rem",
                  fontWeight: 400,
                  color: "var(--stone, #a69e93)",
                  userSelect: "none",
                }}
              >
                {getInitials(speaker.name)}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          <h3
            style={{
              fontFamily: "var(--cursive, var(--serif))",
              fontSize: "1.15rem",
              fontWeight: 500,
              color: "var(--night, #1e1b17)",
              marginBottom: 4,
            }}
          >
            {speaker.name}
          </h3>

          {speaker.role && (
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
              {speaker.role}
            </div>
          )}

          {speaker.bio && (
            <p
              style={{
                fontSize: "var(--sm, 0.85rem)",
                color: "var(--text-2, #786f65)",
                lineHeight: 1.65,
              }}
            >
              {speaker.bio}
            </p>
          )}

          {/* Social links */}
          {hasLinks && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px solid var(--border, #e8e1d6)",
              }}
            >
              {speaker.links!.map((link, li) => {
                const Icon = LINK_ICON[link.type];
                return (
                  <a
                    key={li}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${speaker.name} on ${link.type}`}
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 32,
                      height: 32,
                      borderRadius: "var(--r, 16px)",
                      color: "var(--stone, #a69e93)",
                      background: "var(--cream, #f0ebe3)",
                      transition: "color .25s, background .25s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--surface, #ffffff)";
                      e.currentTarget.style.background = "var(--accent, #7a8c72)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--stone, #a69e93)";
                      e.currentTarget.style.background = "var(--cream, #f0ebe3)";
                    }}
                  >
                    <Icon />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="Speakers"
      id="speakers"
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(32px, 5vw, 56px)" }}>
          {showKicker && (
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
              {kickerText}
            </p>
          )}
          <h2
            style={{
              fontFamily: "var(--cursive, var(--serif))",
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

        {/* Speaker grid */}
        {items.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "var(--gap, 20px)",
            }}
          >
            {items.map(renderCard)}
          </div>
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
            Speaker information coming soon
          </div>
        )}
      </div>

      {/* Responsive grid override */}
      <style>{`
        @media (max-width: 800px) {
          #speakers [style*="grid-template-columns: repeat(3"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 500px) {
          #speakers [style*="grid-template-columns: repeat"] {
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
