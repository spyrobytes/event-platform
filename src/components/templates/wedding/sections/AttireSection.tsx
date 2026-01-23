import { SectionWrapper, SectionTitle } from "../../shared";

type AttireSectionProps = {
  data: {
    heading?: string;
    dressCode: string;
    notes?: string;
    colors?: string[];
  };
  primaryColor: string;
};

/**
 * Attire Section - Dress code guidance
 *
 * Used by: Rustic, Fall, Winter, Destination variants
 * Provides guidance on what guests should wear.
 */
export function AttireSection({ data, primaryColor }: AttireSectionProps) {
  const { heading = "Dress Code", dressCode, notes, colors } = data;

  // Map common dress codes to icons and descriptions
  const getDressCodeInfo = (code: string) => {
    const normalizedCode = code.toLowerCase();

    if (normalizedCode.includes("black tie")) {
      return {
        icon: "formal",
        hint: "Tuxedos and floor-length gowns",
      };
    }
    if (normalizedCode.includes("cocktail")) {
      return {
        icon: "cocktail",
        hint: "Suits and cocktail dresses",
      };
    }
    if (normalizedCode.includes("casual") || normalizedCode.includes("relaxed")) {
      return {
        icon: "casual",
        hint: "Dress comfortably but stylishly",
      };
    }
    if (normalizedCode.includes("beach") || normalizedCode.includes("resort")) {
      return {
        icon: "beach",
        hint: "Light fabrics, comfortable footwear",
      };
    }
    if (normalizedCode.includes("garden") || normalizedCode.includes("outdoor")) {
      return {
        icon: "outdoor",
        hint: "Consider weather and terrain",
      };
    }

    return {
      icon: "default",
      hint: null,
    };
  };

  const codeInfo = getDressCodeInfo(dressCode);

  return (
    <SectionWrapper ariaLabel="Dress code">
      <div className="mx-auto max-w-2xl">
        <SectionTitle>
          <span style={{ color: primaryColor }}>{heading}</span>
        </SectionTitle>

        <div
          className="rounded-2xl border p-8 text-center shadow-sm"
          style={{ borderColor: `${primaryColor}30` }}
        >
          {/* Icon */}
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <svg
              className="h-10 w-10"
              style={{ color: primaryColor }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              {codeInfo.icon === "formal" ? (
                // Bow tie icon for formal
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                />
              ) : codeInfo.icon === "beach" ? (
                // Sun icon for beach
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              ) : (
                // Default clothing hanger icon
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              )}
            </svg>
          </div>

          {/* Dress code title */}
          <h3
            className="mb-2 text-2xl font-semibold"
            style={{ color: primaryColor }}
          >
            {dressCode}
          </h3>

          {/* Auto-generated hint */}
          {codeInfo.hint && (
            <p className="mb-4 text-muted-foreground">{codeInfo.hint}</p>
          )}

          {/* Custom notes */}
          {notes && (
            <div className="mt-6 rounded-lg bg-muted/50 p-4 text-left">
              <p className="text-sm text-muted-foreground">{notes}</p>
            </div>
          )}

          {/* Suggested colors */}
          {colors && colors.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Suggested Colors
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {colors.map((color, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-full border px-3 py-1"
                  >
                    <div
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm capitalize">
                      {color.startsWith("#")
                        ? `Color ${index + 1}`
                        : color}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </SectionWrapper>
  );
}
