import type { AttireSection } from "@/schemas/event-page";

type AttireV2Props = {
  data: AttireSection["data"];
};

/** Inline SVG icon for formal attire (bow tie / tuxedo silhouette) */
function FormalIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block", margin: "0 auto 16px" }}
    >
      {/* Bow tie */}
      <path
        d="M14 20l10 4 10-4-10 4-10-4z"
        fill="var(--accent, #7a8c72)"
        opacity="0.3"
      />
      <path
        d="M24 24l-8-5v10l8-5zm0 0l8-5v10l-8-5z"
        fill="var(--accent, #7a8c72)"
      />
      {/* Collar / lapels */}
      <path
        d="M18 26l-4 16h8l2-12-6-4zm12 0l4 16h-8l-2-12 6-4z"
        fill="var(--night, #1e1b17)"
        opacity="0.15"
      />
      {/* Center line */}
      <line
        x1="24"
        y1="28"
        x2="24"
        y2="42"
        stroke="var(--accent, #7a8c72)"
        strokeWidth="1"
        opacity="0.4"
      />
      {/* Button dots */}
      <circle cx="24" cy="32" r="1" fill="var(--accent, #7a8c72)" opacity="0.5" />
      <circle cx="24" cy="37" r="1" fill="var(--accent, #7a8c72)" opacity="0.5" />
    </svg>
  );
}

/** Inline SVG icon for casual / semi-formal attire */
function CasualIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block", margin: "0 auto 16px" }}
    >
      {/* Hanger */}
      <path
        d="M24 10v4"
        stroke="var(--accent, #7a8c72)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="8" r="2" stroke="var(--accent, #7a8c72)" strokeWidth="1.5" fill="none" />
      {/* Dress / garment silhouette */}
      <path
        d="M10 18h28l-4 24H14l-4-24z"
        fill="var(--night, #1e1b17)"
        opacity="0.1"
        stroke="var(--accent, #7a8c72)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Collar */}
      <path
        d="M20 18l4 6 4-6"
        stroke="var(--accent, #7a8c72)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function detectFormal(dressCode: string): boolean {
  const lower = dressCode.toLowerCase();
  return (
    lower.includes("formal") ||
    lower.includes("black tie") ||
    lower.includes("tuxedo") ||
    lower.includes("gala") ||
    lower.includes("white tie")
  );
}

function shouldShowFormalIcon(iconStyle: string | undefined, dressCode: string): boolean {
  if (iconStyle === "formal") return true;
  if (iconStyle === "casual") return false;
  return detectFormal(dressCode);
}

export function AttireV2({ data }: AttireV2Props) {
  const heading = data.heading || "Dress Code";
  const kickerText = "Dress Code";
  const showKicker = kickerText.toLowerCase() !== heading.toLowerCase();
  const hasDressCode = !!data.dressCode;
  const hasColors = data.colors && data.colors.length > 0;

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="Dress code"
      id="attire"
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
        </div>

        {/* Card */}
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, #e8e1d6)",
            borderRadius: "var(--r-lg, 24px)",
            boxShadow: "var(--shadow)",
            position: "relative",
            overflow: "hidden",
            textAlign: "center",
          }}
        >
          {/* Accent top stripe */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background:
                "linear-gradient(90deg, var(--sage-l, #a8b8a0), var(--accent, #7a8c72))",
              opacity: 0.7,
            }}
          />

          <div style={{ padding: "clamp(32px, 5vw, 48px) clamp(24px, 4vw, 40px)" }}>
            {/* Icon */}
            {hasDressCode && (
              shouldShowFormalIcon(data.iconStyle, data.dressCode) ? <FormalIcon /> : <CasualIcon />
            )}

            {/* Dress code text */}
            {hasDressCode ? (
              <p
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "var(--h3, clamp(1.3rem, 2.4vw, 1.8rem))",
                  fontWeight: 400,
                  lineHeight: 1.3,
                  color: "var(--night, #1e1b17)",
                  marginBottom: data.notes || hasColors ? 16 : 0,
                }}
              >
                {data.dressCode}
              </p>
            ) : (
              <p
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "var(--body, 1rem)",
                  color: "var(--stone, #a69e93)",
                  fontStyle: "italic",
                }}
              >
                Dress code details coming soon
              </p>
            )}

            {/* Notes */}
            {data.notes && (
              <p
                style={{
                  fontSize: "var(--body, 1rem)",
                  color: "var(--text-2, #786f65)",
                  lineHeight: 1.75,
                  maxWidth: "48ch",
                  margin: "0 auto",
                  marginBottom: hasColors ? 24 : 0,
                }}
              >
                {data.notes}
              </p>
            )}

            {/* Color swatches */}
            {hasColors && (
              <div style={{ marginTop: data.notes ? 0 : 8 }}>
                <p
                  style={{
                    fontFamily: "var(--sans)",
                    fontSize: "var(--sm, 0.85rem)",
                    fontWeight: 500,
                    letterSpacing: ".12em",
                    textTransform: "uppercase" as const,
                    color: "var(--accent, #7a8c72)",
                    marginBottom: 14,
                  }}
                >
                  Suggested Colors
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 16,
                  }}
                >
                  {data.colors!.map((color, i) => {
                    const isHex = isHexColor(color);
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: isHex ? color : "var(--cream, #f0ebe3)",
                            border: "1px solid var(--border, #e8e1d6)",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                          }}
                          role="img"
                          aria-label={`Color swatch: ${color}`}
                        />
                        {!isHex && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--charcoal, #3d3830)",
                              lineHeight: 1.2,
                            }}
                          >
                            {color}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Check if a string looks like a hex color code */
function isHexColor(s: string): boolean {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(s.trim());
}
