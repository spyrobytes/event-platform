"use client";

import type { ThingsToDoSection, ActivityCategory } from "@/schemas/event-page";

type ThingsToDoV2Props = {
  data: ThingsToDoSection["data"];
};

function CategoryIcon({ category }: { category?: ActivityCategory }) {
  const size = 24;
  const shared = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (category) {
    case "food":
      return (
        <svg {...shared}>
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
        </svg>
      );
    case "attraction":
      return (
        <svg {...shared}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" fill="none" />
        </svg>
      );
    case "activity":
      return (
        <svg {...shared}>
          <circle cx="12" cy="5" r="2.5" />
          <path d="M10 22V18L7.5 14.5 9.5 10H14.5L16.5 14.5 14 18V22" />
        </svg>
      );
    case "shopping":
      return (
        <svg {...shared}>
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      );
    case "nature":
      return (
        <svg {...shared}>
          <path d="M12 22V8" />
          <path d="M5 12c0-4 3.5-8 7-8s7 4 7 8c0 3-2.5 5-7 5s-7-2-7-5z" />
          <path d="M8 21c0-2 1.8-3 4-3s4 1 4 3" />
        </svg>
      );
    default:
      // map-pin / compass
      return (
        <svg {...shared}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
  }
}

/**
 * Things To Do V2 — Local activities section for the cinematic wedding template.
 *
 * 2-column grid of activity cards with category icons, addresses, and website links.
 */
export function ThingsToDoV2({ data }: ThingsToDoV2Props) {
  const {
    heading = "Things To Do",
    description,
    items = [],
  } = data;

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="Things to do"
      id="things"
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
            Explore
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

        {/* Activity cards grid */}
        {items.length > 0 ? (
          <div
            className="things-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "var(--gap, 20px)",
            }}
          >
            {items.map((item, i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface, #ffffff)",
                  border: "1px solid var(--border, #e8e1d6)",
                  borderRadius: "var(--r-lg, 24px)",
                  padding: "clamp(24px, 3vw, 32px)",
                  boxShadow: "var(--shadow)",
                  transition: "transform .4s var(--ease-out-expo, ease), box-shadow .4s var(--ease-out-expo, ease)",
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
                {/* Category icon */}
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(122, 140, 114, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent, #7a8c72)",
                  marginBottom: 16,
                }}>
                  <CategoryIcon category={item.category} />
                </div>

                {/* Activity name */}
                <h3 style={{
                  fontFamily: "var(--serif)",
                  fontSize: "var(--h3, clamp(1.1rem, 1.8vw, 1.35rem))",
                  fontWeight: 400,
                  lineHeight: 1.25,
                  color: "var(--night, #1e1b17)",
                  marginBottom: 8,
                }}>
                  {item.name}
                </h3>

                {/* Description */}
                {item.description && (
                  <p style={{
                    fontSize: "var(--body, 1rem)",
                    color: "var(--text-2, #786f65)",
                    lineHeight: 1.65,
                    marginBottom: 12,
                  }}>
                    {item.description}
                  </p>
                )}

                {/* Address */}
                {item.address && (
                  <p style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    fontSize: "var(--sm, 0.85rem)",
                    color: "var(--stone, #a69e93)",
                    lineHeight: 1.5,
                    marginBottom: 12,
                  }}>
                    <svg
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0, marginTop: 3 }}
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {item.address}
                  </p>
                )}

                {/* Website link */}
                {item.website && item.website !== "" && (
                  <a
                    href={item.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "var(--sans)",
                      fontSize: "var(--sm, 0.85rem)",
                      fontWeight: 600,
                      padding: "10px 22px",
                      borderRadius: 999,
                      background: "transparent",
                      color: "var(--accent, #7a8c72)",
                      border: "1px solid var(--accent, #7a8c72)",
                      textDecoration: "none",
                      transition: "all var(--transition, 0.3s ease)",
                      marginTop: 4,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--accent, #7a8c72)";
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--accent, #7a8c72)";
                    }}
                  >
                    Visit Website
                    <span aria-hidden="true">&rarr;</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div style={{
            border: "2px dashed var(--border, #e8e1d6)",
            borderRadius: "var(--r-lg, 24px)",
            padding: 48,
            textAlign: "center",
            color: "var(--text-3, #a69e93)",
          }}>
            Local activities coming soon
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 700px) {
          .things-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
