type NavSection = {
  id: string;
  label: string;
};

type WeddingV2FooterProps = {
  monogram?: string;
  coupleNames?: string;
  dateText?: string;
  sections?: NavSection[];
};

/**
 * Wedding V2 Footer — POC-parity
 *
 * Full footer with monogram circle, names, date, nav links, credits.
 * Cream background. Replaces one-liner "Powered by EventFXr".
 */
export function WeddingV2Footer({
  monogram,
  coupleNames,
  dateText,
  sections = [],
}: WeddingV2FooterProps) {
  return (
    <footer
      style={{
        padding: "0 0 48px",
        background: "var(--cream, #f0ebe3)",
        borderTop: "none",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
          textAlign: "center",
          paddingTop: 32,
        }}
      >
        {/* Monogram circle */}
        {monogram && (
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "var(--forest, #3f4f3a)",
              display: "grid",
              placeItems: "center",
              position: "relative",
              overflow: "hidden",
              margin: "0 auto 16px",
            }}
            aria-hidden="true"
          >
            <span
              style={{
                fontFamily: "var(--serif)",
                fontSize: "0.9rem",
                fontWeight: 500,
                letterSpacing: "0.12em",
                color: "rgba(255, 255, 255, 0.92)",
              }}
            >
              {monogram}
            </span>
          </div>
        )}

        {/* Names */}
        {coupleNames && (
          <div
            style={{
              fontFamily: "var(--serif)",
              fontSize: "1.3rem",
              fontWeight: 500,
              color: "var(--night, #1e1b17)",
              marginBottom: 4,
            }}
          >
            {coupleNames}
          </div>
        )}

        {/* Date */}
        {dateText && (
          <div
            style={{
              fontSize: "var(--sm, 0.85rem)",
              color: "var(--text-3, #a69e93)",
              marginBottom: 20,
            }}
          >
            {dateText}
          </div>
        )}

        {/* Footer nav links */}
        {sections.length > 0 && (
          <nav
            style={{
              display: "flex",
              gap: 24,
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: 24,
            }}
            aria-label="Footer navigation"
          >
            {sections.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                style={{
                  fontSize: "var(--sm, 0.85rem)",
                  fontWeight: 500,
                  color: "var(--text-2, #786f65)",
                  textDecoration: "none",
                  transition: "color var(--transition, 0.3s ease)",
                }}
              >
                {label}
              </a>
            ))}
          </nav>
        )}

        {/* Bottom bar */}
        <div
          style={{
            paddingTop: 20,
            borderTop: "1px solid var(--linen, #e8e1d6)",
            fontSize: ".82rem",
            color: "var(--stone, #a69e93)",
          }}
        >
          Made with{" "}
          <a
            href="https://eventsfixer.com"
            style={{ color: "var(--accent, #7a8c72)", textDecoration: "none" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            EventFXr
          </a>
        </div>
      </div>
    </footer>
  );
}
