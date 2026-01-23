import { SectionWrapper, SectionTitle } from "../../shared";

type StorySectionProps = {
  data: {
    heading?: string;
    content: string;
    layout?: "full" | "split";
  };
  primaryColor: string;
};

/**
 * Story Section - Couple's journey / how they met
 *
 * Used by: Modern Minimal, Intimate, Fusion variants
 * Displays the couple's story in an engaging format.
 */
export function StorySection({ data, primaryColor }: StorySectionProps) {
  const { heading = "Our Story", content, layout = "full" } = data;

  return (
    <SectionWrapper ariaLabel="Our story">
      <div className="mx-auto max-w-3xl">
        <SectionTitle>
          <span style={{ color: primaryColor }}>{heading}</span>
        </SectionTitle>

        {layout === "full" ? (
          <div className="prose prose-lg mx-auto text-center">
            <p className="text-lg leading-relaxed text-muted-foreground whitespace-pre-line">
              {content}
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            <div
              className="flex items-center justify-center rounded-2xl p-8"
              style={{ backgroundColor: `${primaryColor}10` }}
            >
              <svg
                className="h-24 w-24 opacity-30"
                style={{ color: primaryColor }}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div className="flex items-center">
              <p className="text-lg leading-relaxed text-muted-foreground whitespace-pre-line">
                {content}
              </p>
            </div>
          </div>
        )}

        {/* Decorative divider */}
        <div className="mt-12 flex items-center justify-center">
          <div
            className="h-px w-16"
            style={{ backgroundColor: `${primaryColor}40` }}
          />
          <svg
            className="mx-4 h-4 w-4"
            style={{ color: primaryColor }}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <div
            className="h-px w-16"
            style={{ backgroundColor: `${primaryColor}40` }}
          />
        </div>
      </div>
    </SectionWrapper>
  );
}
